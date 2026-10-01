import type { SystemMessage } from "@earendil-works/pi-ai";

export interface Change {
  section: "Pi identity" | "Pi documentation" | "Pi environment rule";
  before: string;
  after: string;
}

const identity = "You are an expert coding assistant operating inside pi, a coding agent harness.";
const replacement = "You are an expert coding assistant.";
const environmentRule = /^- You can inspect PI_\* environment variables for current model and session details\.?\r?\n?/gm;
const docsPrefix = /^\s*(?:<docs>\s*)?Pi documentation \(read only/;

function trimPreamble(text: string, changes: Change[]): string {
  if (!text.startsWith(identity)) return text;
  changes.push({ section: "Pi identity", before: identity, after: replacement });
  return replacement + text.slice(identity.length);
}

function trimRules(text: string, changes: Change[]): string {
  return text.replace(environmentRule, (before) => {
    changes.push({ section: "Pi environment rule", before, after: "" });
    return "";
  });
}

/** Only transform recognized top-level Pi sections; nested project text stays opaque. */
export function trimText(text: string, changes: Change[] = []): string {
  let result = trimPreamble(text, changes);
  result = result.replace(/^<([a-z][a-z0-9_-]*)>\r?\n[\s\S]*?^<\/\1>/gm, (block, name: string) => {
    if (name === "docs" && docsPrefix.test(block)) {
      changes.push({ section: "Pi documentation", before: block, after: "" });
      return "";
    }
    return name === "rules" ? trimRules(block, changes) : block;
  });
  // Legacy unwrapped docs are only removed when they occupy the trailing block.
  if (!/^<[a-z][a-z0-9_-]*>\r?$/m.test(result)) {
    result = trimRules(result, changes);
    result = result.replace(/^Pi documentation \(read only[^\n]*\n[\s\S]*$/m, (before) => {
      changes.push({ section: "Pi documentation", before, after: "" });
      return "";
    });
  }
  return result;
}

/** Clone system messages so Pi's stored transcript and tool declarations stay intact. */
export function trimSystemMessage(message: SystemMessage, changes: Change[] = []): SystemMessage {
  const content = typeof message.content === "string"
    ? trimText(message.content, changes)
    : message.content.map((block) => ({ ...block, text: trimText(block.text, changes) }));
  const sections = message.sections ? { ...message.sections } : undefined;
  if (sections) {
    for (const [name, text] of Object.entries(sections)) {
      if (text === null) continue;
      if (name === "docs" && docsPrefix.test(text)) {
        changes.push({ section: "Pi documentation", before: text, after: "" });
        // Null also suppresses this section when the message is a mid-session update.
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

export function formatStatus(before: string, after: string, changes: Change[], scope: string): string {
  const original = [...before].length;
  const remaining = [...after].length;
  const removed = original - remaining;
  const percent = original ? (removed / original * 100).toFixed(1) : "0.0";
  const estimate = (text: string) => Math.ceil(text.length / 4).toLocaleString("en-US");
  return [
    "pi-trim active — Less Pi in Pi.", scope,
    `Characters: ${original.toLocaleString("en-US")} → ${remaining.toLocaleString("en-US")} (${percent}% removed)`,
    `Estimated tokens: ~${estimate(before)} → ~${estimate(after)} (chars / 4; not provider billing)`,
    `Changed sections: ${[...new Set(changes.map((change) => change.section))].join(", ") || "none; no recognized Pi boilerplate"}`,
  ].join("\n");
}

export function formatDiff(changes: Change[]): string {
  return changes.length ? changes.map((change) => [
    `--- ${change.section}`, ...change.before.split("\n").map((line) => `- ${line}`),
    ...(change.after ? change.after.split("\n").map((line) => `+ ${line}`) : []),
  ].join("\n")).join("\n\n") : "No recognized Pi boilerplate removed.";
}
