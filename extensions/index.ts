import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { formatDiff, formatStatus, systemText, trimSystemMessage, trimText, type Change } from "../lib/trim.ts";

/** No filesystem access, network calls, telemetry, or model calls. */
export default function piTrim(pi: ExtensionAPI) {
  let snapshot: { before: string; after: string; changes: Change[]; scope: string } | undefined;

  pi.on("session_start", () => { snapshot = undefined; });

  pi.on("context_with_system", (event) => {
    const changes: Change[] = [];
    const before: string[] = [];
    const after: string[] = [];
    const messages = event.messages.map((message) => {
      if (message.role !== "system") return message;
      before.push(systemText(message));
      const trimmed = trimSystemMessage(message, changes);
      after.push(systemText(trimmed));
      return trimmed;
    });
    snapshot = {
      before: before.join("\n\n"), after: after.join("\n\n"), changes,
      scope: `Last request: text across ${before.length} system message(s); excludes tool schemas.`,
    };
    return changes.length ? { messages } : undefined;
  });

  pi.registerCommand("pi-trim", {
    description: "Inspect pi-trim: /pi-trim [status|diff]",
    handler: async (args, ctx) => {
      const action = args.trim() || "status";
      if (action !== "status" && action !== "diff") {
        ctx.ui.notify("Usage: /pi-trim [status|diff]", "warning");
        return;
      }
      if (!ctx.hasUI) return;
      let current = snapshot;
      if (!current) {
        const before = ctx.getSystemPrompt();
        const changes: Change[] = [];
        current = { before, after: trimText(before, changes), changes, scope: "Preview of current base prompt; send a message to inspect an actual request." };
      }
      const report = action === "diff" ? formatDiff(current.changes)
        : formatStatus(current.before, current.after, current.changes, current.scope);
      ctx.ui.notify(report, "info");
    },
  });
}
