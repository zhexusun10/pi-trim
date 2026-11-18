import type { SystemMessage } from "@earendil-works/pi-ai";

export type TrimMode = "default" | "aggressive";

export interface TrimOptions {
  mode?: TrimMode;
}

export interface Change {
  section: "Pi identity" | "Pi documentation" | "Pi environment rule" | "Pi tools list";
  before: string;
  after: string;
}

const identityReplacements = [
  {
    before: "You are an expert coding assistant operating inside pi, a coding agent harness.",
    after: "You are an expert coding assistant.",
  },
  {
    before: "You are a coding assistant running inside pi, a coding agent harness.",
    after: "You are a coding assistant.",
  },
];
const environmentRule = /^- You can inspect PI_\* environment variables for current model and session details\.?\r?\n?/gm;
const docsPrefix = /^\s*(?:<docs>\s*)?Pi documentation \(read only/;
const toolsFooter =
  "(?:Additional tools may be available\\.|In addition to the tools above, you may have access to other custom tools depending on the project\\.)";
const toolsListBody = "(?:\\(none\\)|(?:- [^\\r\\n]+(?:\\r?\\n- [^\\r\\n]+)*))";
const toolsSectionPattern = new RegExp(
  `^\\s*(?:<tools>\\r?\\n)?${toolsListBody}\\r?\\n\\r?\\n${toolsFooter}(?:\\r?\\n<\\/tools>)?\\s*$`,
);
const legacyToolsPattern = new RegExp(
  `^(Available tools:\\r?\\n${toolsListBody}\\r?\\n\\r?\\n${toolsFooter})((?:\\r?\\n){1,2})?`,
  "m",
);

function trimPreamble(text: string, changes: Change[]): string {
  const identity = identityReplacements.find(({ before }) => text.startsWith(before));
  if (!identity) return text;
  changes.push({ section: "Pi identity", ...identity });
  return identity.after + text.slice(identity.before.length);
}

function trimRules(text: string, changes: Change[]): string {
  return text.replace(environmentRule, (before) => {
    changes.push({ section: "Pi environment rule", before, after: "" });
    return "";
  });
}

/** Only transform recognized top-level Pi sections; nested project text stays opaque. */
export function trimText(text: string, changes: Change[] = [], options: TrimOptions = {}): string {
  const mode = options.mode ?? "default";
  let result = trimPreamble(text, changes);
  let removedTrailingBlock = false;
  result = result.replace(
    /^<([a-z][a-z0-9_-]*)>\r?\n[\s\S]*?^<\/\1>(\r?\n\r?\n|\r?\n)?/gm,
    (match, name: string, trailing = "", offset: number, whole: string) => {
      const block = trailing ? match.slice(0, -trailing.length) : match;
      if (name === "docs" && docsPrefix.test(block)) {
        changes.push({ section: "Pi documentation", before: block, after: "" });
        if (whole.slice(offset + match.length).trim() === "") removedTrailingBlock = true;
        return "";
      }
      if (mode === "aggressive" && name === "tools" && toolsSectionPattern.test(block)) {
        changes.push({ section: "Pi tools list", before: block, after: "" });
        if (whole.slice(offset + match.length).trim() === "") removedTrailingBlock = true;
        return "";
      }
      return name === "rules" ? trimRules(block, changes) + trailing : match;
    },
  );
  if (removedTrailingBlock) result = result.replace(/(?:\r?\n)+$/, "");
  // Legacy unwrapped sections are only removed when no top-level XML blocks remain.
  if (!/^<[a-z][a-z0-9_-]*>\r?$/m.test(result)) {
    if (mode === "aggressive") {
      result = result.replace(legacyToolsPattern, (_match, body: string) => {
        changes.push({ section: "Pi tools list", before: body, after: "" });
        return "";
      });
    }
    result = trimRules(result, changes);
    result = result.replace(/^Pi documentation \(read only[^\n]*\n[\s\S]*$/m, (before) => {
      changes.push({ section: "Pi documentation", before, after: "" });
      return "";
    });
  }
  return result;
}

/** Clone system messages so Pi's stored transcript and tool declarations stay intact. */
export function trimSystemMessage(message: SystemMessage, changes: Change[] = [], options: TrimOptions = {}): SystemMessage {
  const mode = options.mode ?? "default";
  const content = typeof message.content === "string"
    ? trimText(message.content, changes, options)
    : message.content.map((block) => ({ ...block, text: trimText(block.text, changes, options) }));
  const sections = message.sections ? { ...message.sections } : undefined;
  if (sections) {
    for (const [name, text] of Object.entries(sections)) {
      if (text === null) continue;
      if (name === "docs" && docsPrefix.test(text)) {
        changes.push({ section: "Pi documentation", before: text, after: "" });
        // Null also suppresses this section when the message is a mid-session update.
        sections[name] = null;
      } else if (mode === "aggressive" && name === "tools" && toolsSectionPattern.test(text)) {
        changes.push({ section: "Pi tools list", before: text, after: "" });
        sections[name] = null;
      } else if (name === "preamble") {
        sections[name] = trimPreamble(text, changes);
      } else if (name === "rules") {
        sections[name] = trimRules(text, changes);
      }
    }
  }
  return { ...message, content, ...(sections ? { sections } : {}) };
}

export function systemText(message: SystemMessage): string {
  const content = typeof message.content === "string"
    ? message.content : message.content.map((block) => block.text).join("\n");
  return [content, ...Object.values(message.sections ?? {}).filter((text) => text !== null)]
    .filter(Boolean).join("\n\n");
}

export function formatStatus(
  before: string,
  after: string,
  changes: Change[],
  scope: string,
  mode: TrimMode = "default",
): string {
  const original = [...before].length;
  const remaining = [...after].length;
  const removed = original - remaining;
  const percent = original ? (removed / original * 100).toFixed(1) : "0.0";
  const estimate = (text: string) => Math.ceil(text.length / 4).toLocaleString("en-US");
  const modeSummary = mode === "aggressive"
    ? "aggressive (also strips Pi <tools> list)"
    : "default (keeps Pi <tools> list)";
  return [
    "pi-trim active — Less Pi in Pi.",
    `Mode: ${modeSummary}`,
    scope,
    `Characters: ${original.toLocaleString("en-US")} → ${remaining.toLocaleString("en-US")} (${percent}% removed)`,
    `Estimated tokens: ~${estimate(before)} → ~${estimate(after)} (chars / 4; not provider billing)`,
    `Changed sections: ${[...new Set(changes.map((change) => change.section))].join(", ") || "none; no recognized Pi boilerplate"}`,
  ].join("\n");
}

export function formatDiff(changes: Change[]): string {
  return changes.length ? changes.map((change) => [
    `--- ${change.section}`, ...change.before.split(/\r?\n/).map((line) => `- ${line}`),
    ...(change.after ? change.after.split(/\r?\n/).map((line) => `+ ${line}`) : []),
  ].join("\n")).join("\n\n") : "No recognized Pi boilerplate removed.";
}
