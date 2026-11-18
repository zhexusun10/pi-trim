import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  formatDiff,
  formatStatus,
  systemText,
  trimSystemMessage,
  trimText,
  type Change,
  type TrimMode,
} from "../lib/trim.ts";

const MODE_ENTRY_TYPE = "pi-trim-mode";

function isTrimMode(value: unknown): value is TrimMode {
  return value === "default" || value === "aggressive";
}

function describeMode(mode: TrimMode): string {
  return mode === "aggressive"
    ? "also strips Pi <tools> list; tool schemas stay intact"
    : "strips Pi identity, docs, and PI_* env rule; keeps <tools>";
}

function readModeFromBranch(ctx?: { sessionManager?: { getBranch?: () => readonly unknown[] } }): TrimMode {
  const branch = ctx?.sessionManager?.getBranch?.();
  if (!Array.isArray(branch)) return "default";
  for (let i = branch.length - 1; i >= 0; i--) {
    const entry = branch[i] as { type?: unknown; customType?: unknown; data?: { mode?: unknown } };
    if (entry?.type === "custom" && entry.customType === MODE_ENTRY_TYPE && isTrimMode(entry.data?.mode)) {
      return entry.data.mode;
    }
  }
  return "default";
}

/** No filesystem access, network calls, telemetry, or model calls. */
export default function piTrim(pi: ExtensionAPI) {
  let mode: TrimMode = "default";
  let snapshot: { mode: TrimMode; before: string; after: string; changes: Change[]; scope: string } | undefined;

  const syncFromSession = (ctx?: { sessionManager?: { getBranch?: () => readonly unknown[] } }) => {
    snapshot = undefined;
    mode = readModeFromBranch(ctx);
  };

  pi.on("session_start", (_event, ctx) => { syncFromSession(ctx); });
  pi.on("session_tree", (_event, ctx) => { syncFromSession(ctx); });

  pi.on("context_with_system", (event) => {
    const changes: Change[] = [];
    const before: string[] = [];
    const after: string[] = [];
    let strippedToolsSection = false;
    const messages = event.messages.map((message) => {
      if (message.role !== "system") return message;
      before.push(systemText(message));
      const messageChanges: Change[] = [];
      const trimmed = trimSystemMessage(message, messageChanges, { mode });
      const strippedToolsHere = messageChanges.some((change) => change.section === "Pi tools list");
      if (trimmed.sections && "tools" in trimmed.sections && trimmed.sections.tools === null) {
        if (strippedToolsSection) delete trimmed.sections.tools;
        else strippedToolsSection = true;
      } else if (strippedToolsHere) {
        strippedToolsSection = true;
      }
      changes.push(...messageChanges);
      after.push(systemText(trimmed));
      return trimmed;
    });
    snapshot = {
      mode,
      before: before.join("\n\n"),
      after: after.join("\n\n"),
      changes,
      scope: `Last request: text across ${before.length} system message(s); excludes tool schemas.`,
    };
    return changes.length ? { messages } : undefined;
  });

  pi.registerCommand("pi-trim", {
    description: "Inspect and configure pi-trim: /pi-trim [status|diff|mode [default|aggressive]]",
    getArgumentCompletions: (prefix) => {
      const [action, target, ...rest] = prefix.trimStart().split(/\s+/);
      if (rest.length > 0) return null;
      if (target === undefined) {
        const items = [
          { value: "status", label: "status", description: "Show prompt trimming summary" },
          { value: "diff", label: "diff", description: "Show exact trimmed text" },
          { value: "mode", label: "mode", description: "Toggle or set trim mode (default | aggressive)" },
        ].filter((item) => item.value.startsWith(action.toLowerCase()));
        return items.length > 0 ? items : null;
      }
      if (action.toLowerCase() !== "mode") return null;
      const items = [
        { value: "mode default", label: "default", description: "Keep Pi <tools> list" },
        { value: "mode aggressive", label: "aggressive", description: "Also strip Pi <tools> list" },
      ].filter((item) => item.label.startsWith(target.toLowerCase()));
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const action = tokens[0]?.toLowerCase() ?? "status";
      if (action === "mode") {
        if (tokens.length > 2) {
          if (ctx.hasUI) ctx.ui.notify("Usage: /pi-trim mode [default|aggressive]", "warning");
          return;
        }
        const nextArg = tokens[1]?.toLowerCase();
        let nextMode: TrimMode;
        if (nextArg === undefined) {
          nextMode = mode === "default" ? "aggressive" : "default";
        } else if (isTrimMode(nextArg)) {
          nextMode = nextArg;
        } else {
          if (ctx.hasUI) ctx.ui.notify("Usage: /pi-trim mode [default|aggressive]", "warning");
          return;
        }
        if (nextMode === mode) {
          if (ctx.hasUI) ctx.ui.notify(`pi-trim mode is already ${mode} (${describeMode(mode)}).`, "info");
          return;
        }
        mode = nextMode;
        snapshot = undefined;
        pi.appendEntry?.(MODE_ENTRY_TYPE, { mode });
        if (ctx.hasUI) ctx.ui.notify(`pi-trim mode set to ${mode} (${describeMode(mode)}).`, "info");
        return;
      }
      if ((action !== "status" && action !== "diff") || tokens.length > 1) {
        if (ctx.hasUI) ctx.ui.notify("Usage: /pi-trim [status|diff|mode]", "warning");
        return;
      }
      if (!ctx.hasUI) return;
      let current = snapshot && snapshot.mode === mode ? snapshot : undefined;
      if (!current) {
        const before = ctx.getSystemPrompt();
        const changes: Change[] = [];
        current = {
          mode,
          before,
          after: trimText(before, changes, { mode }),
          changes,
          scope: "Preview of current base prompt; send a message to inspect an actual request.",
        };
      }
      const report = action === "diff"
        ? formatDiff(current.changes)
        : formatStatus(current.before, current.after, current.changes, current.scope, mode);
      ctx.ui.notify(report, "info");
    },
  });
}
