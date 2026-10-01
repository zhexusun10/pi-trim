import test from "node:test";
import assert from "node:assert/strict";
import type { SystemMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import piTrim from "../extensions/index.ts";
import { trimSystemMessage, trimText, formatStatus, formatDiff, type Change } from "../lib/trim.ts";

const identity = "You are an expert coding assistant operating inside pi, a coding agent harness.";
const docs = "<docs>\nPi documentation (read only when the user asks about pi itself):\n- Main documentation: /opt/pi/README.md\n</docs>";
const rule = "- You can inspect PI_* environment variables for current model and session details.";
const fixture = (): SystemMessage => ({
  role: "system", content: "", timestamp: 1,
  sections: { preamble: identity + " Keep coding.", docs,
    rules: `<rules>\n- Keep tests\n${rule}\n- Be concise\n</rules>`,
    project_context: `<project_context>\n${identity}\n${docs}\n${rule}\nUse pi in the math library.\n</project_context>`,
    skills: "<skills>\nRead pi-sdk docs when asked.\n</skills>",
    addendum: docs, tools: "<tools>\nread, bash, edit, write\n</tools>", cwd: "<cwd>\n/workspace\n</cwd>" },
  toolsAdded: [{ name: "read", description: "Read Pi docs", parameters: { type: "object", properties: {} } }],
});

test("removes only recognized boilerplate while preserving instructions and tool declarations", () => {
  const message = fixture();
  const saved = structuredClone(message);
  const changes: Change[] = [];
  const result = trimSystemMessage(message, changes);
  assert.equal(result.sections?.docs, null);
  assert.equal(result.sections?.preamble, "You are an expert coding assistant. Keep coding.");
  assert.equal(result.sections?.rules, "<rules>\n- Keep tests\n- Be concise\n</rules>");
  for (const key of ["project_context", "skills", "addendum", "tools", "cwd"]) assert.equal(result.sections?.[key], message.sections?.[key]);
  assert.strictEqual(result.toolsAdded, message.toolsAdded);
  assert.deepEqual(message, saved);
  assert.equal(changes.length, 3);
});

test("retains null section deletions and tool additions/removals in mid-session updates", () => {
  const update: SystemMessage = { role: "system", content: "", timestamp: 2, sections: { docs, skills: null }, toolsRemoved: [{ name: "bash" }] };
  const result = trimSystemMessage(update);
  assert.deepEqual(result.sections, { docs: null, skills: null });
  assert.strictEqual(result.toolsRemoved, update.toolsRemoved);
});

test("unknown docs, preambles, environment rules, and section names pass through", () => {
  const message: SystemMessage = { role: "system", content: "Do not remove pi, docs, or PI_*.", timestamp: 0,
    sections: { docs: "<docs>\nProduct documentation\n</docs>", preamble: "Custom " + identity, rules: "- Preserve PI_* values", custom: docs } };
  assert.deepEqual(trimSystemMessage(message), message);
});

test("opaque prompts preserve nested project and user addendum blocks", () => {
  const text = [identity, `<rules>\n${rule}\n- Keep this\n</rules>`, docs,
    `<project_context>\n${docs}\n${identity}\n${rule}\n</project_context>`,
    `<addendum>\n${docs}\n</addendum>`].join("\n\n");
  const result = trimText(text);
  assert.ok(result.startsWith("You are an expert coding assistant."));
  assert.ok(result.includes(`<project_context>\n${docs}\n${identity}\n${rule}\n</project_context>`));
  assert.ok(result.includes(`<addendum>\n${docs}\n</addendum>`));
  assert.ok(result.includes("<rules>\n- Keep this\n</rules>"));
});

test("plain legacy trailing docs are trimmed conservatively", () => {
  const text = `${identity}\n${rule}\nPi documentation (read only when asked):\n- Main docs: /pi`;
  assert.equal(trimText(text), "You are an expert coding assistant.\n");
  assert.equal(trimText("Custom instructions about <docs>inline</docs>"), "Custom instructions about <docs>inline</docs>");
});

test("text block content is cloned, and repeated transforms are idempotent", () => {
  const message = { ...fixture(), content: [{ type: "text" as const, text: identity }] };
  const result = trimSystemMessage(message);
  assert.notStrictEqual(result.content, message.content);
  assert.deepEqual(trimSystemMessage(result), result);
  assert.equal(message.content[0].text, identity);
});

test("extension handles all system updates and leaves user/tool messages untouched", async () => {
  const handlers = new Map<string, (event: any) => any>();
  const commands = new Map<string, any>();
  piTrim({ on: (name: string, handler: any) => handlers.set(name, handler), registerCommand: (name: string, command: any) => commands.set(name, command) } as unknown as ExtensionAPI);
  const user = { role: "user", content: docs, timestamp: 0 };
  const tool = { role: "toolResult", content: [{ type: "text", text: docs }] };
  const system = fixture();
  const event = { messages: [system, user, tool, { role: "system", content: "", sections: { docs }, timestamp: 3 }] };
  const result = handlers.get("context_with_system")!(event);
  assert.equal(result.messages[0].sections.docs, null);
  assert.strictEqual(result.messages[1], user);
  assert.strictEqual(result.messages[2], tool);
  assert.equal(result.messages[3].sections.docs, null);
  assert.equal(system.sections?.docs, docs);
  const notifications: string[] = [];
  const ctx = { hasUI: true, ui: { notify: (text: string) => notifications.push(text) }, getSystemPrompt: () => identity };
  await commands.get("pi-trim").handler("status", ctx);
  assert.match(notifications.pop()!, /Last request: text across 2 system message/);
  await commands.get("pi-trim").handler("diff", ctx);
  assert.match(notifications.pop()!, /Pi documentation/);
  handlers.get("session_start")!({});
  await commands.get("pi-trim").handler("status", ctx);
  assert.match(notifications.pop()!, /Preview/);
});

test("reports estimates explicitly and never divides by zero", () => {
  assert.match(formatStatus("", "", [], "Preview"), /0.0%/);
  assert.match(formatStatus("abcd", "ab", [], "Preview"), /not provider billing/);
  assert.equal(formatDiff([]), "No recognized Pi boilerplate removed.");
});
