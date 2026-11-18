import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SessionManager, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import piTrim from "../extensions/index.ts";
import { trimSystemMessage, type Change } from "../lib/trim.ts";

// Use the installed Pi's actual prompt builder, as in the benchmark harness.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"))), "..");
const { buildSystemPromptState } = await import(pathToFileURL(resolve(packageRoot, "dist/core/system-prompt.js")).href);

const knownIdentities = [
  {
    before: "You are an expert coding assistant operating inside pi, a coding agent harness.",
    after: "You are an expert coding assistant.",
  },
  {
    before: "You are a coding assistant running inside pi, a coding agent harness.",
    after: "You are a coding assistant.",
  },
];

test("trims the installed Pi's generated default prompt without changing project instructions", () => {
  const state = buildSystemPromptState({
    cwd: "/workspace",
    toolSnippets: { read: "Read a file" },
    appendSystemPrompt: "Custom instructions about pi.",
    contextFiles: [{ path: "/workspace/AGENTS.md", content: "Project instructions about pi." }],
  });
  assert.ok(state.sections);
  const { sections } = state;
  const identity = knownIdentities.find(({ before }) => sections.preamble.startsWith(before));
  assert.ok(identity, `Unrecognized Pi preamble: ${sections.preamble}`);
  const message = { role: "system" as const, ...state, timestamp: 0 };
  const original = structuredClone(message);
  const changes: Change[] = [];
  const result = trimSystemMessage(message, changes);

  assert.equal(result.sections?.preamble, identity.after + sections.preamble.slice(identity.before.length));
  assert.equal(result.sections?.docs, null);
  for (const name of ["tools", "cwd", "addendum", "project_context"]) {
    assert.ok(sections[name]);
    assert.equal(result.sections?.[name], sections[name]);
  }
  assert.ok(changes.some((change) => change.section === "Pi identity" && change.before === identity.before && change.after === identity.after));
  assert.ok(changes.some((change) => change.section === "Pi documentation"));
  assert.deepEqual(message, original);
});

test("trims the installed Pi's generated default prompt in aggressive mode while preserving rules and project instructions", () => {
  for (const selectedTools of [["read"], []]) {
    const state = buildSystemPromptState({
      cwd: "/workspace",
      selectedTools,
      toolSnippets: { read: "Read a file" },
      appendSystemPrompt: "Custom instructions about pi.",
      contextFiles: [{ path: "/workspace/AGENTS.md", content: "Project instructions about pi." }],
    });
    assert.ok(state.sections);
    const { sections } = state;
    const identity = knownIdentities.find(({ before }) => sections.preamble.startsWith(before));
    assert.ok(identity, `Unrecognized Pi preamble: ${sections.preamble}`);
    const message = { role: "system" as const, ...state, timestamp: 0 };
    const changes: Change[] = [];
    const result = trimSystemMessage(message, changes, { mode: "aggressive" });

    assert.equal(result.sections?.preamble, identity.after + sections.preamble.slice(identity.before.length));
    assert.equal(result.sections?.docs, null);
    assert.equal(result.sections?.tools, null);
    for (const name of ["rules", "cwd", "addendum", "project_context"]) {
      assert.ok(sections[name]);
      assert.equal(result.sections?.[name], sections[name]);
    }
    assert.ok(changes.some((change) => change.section === "Pi tools list"));
  }
});

test("restores /pi-trim mode across SessionManager tree branches, compaction, and reload", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-trim-sm-"));
  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  process.env.PI_CODING_AGENT_DIR = dir;
  try {
    const sm = SessionManager.inMemory();
    const mount = () => {
      const handlers = new Map<string, (event: any, ctx?: any) => any>();
      const commands = new Map<string, any>();
      piTrim({
        on: (name: string, handler: any) => handlers.set(name, handler),
        registerCommand: (name: string, command: any) => commands.set(name, command),
        appendEntry: (customType: string, data: unknown) => {
          sm.appendCustomEntry(customType, data);
        },
      } as unknown as ExtensionAPI);
      const ctx = {
        hasUI: false,
        ui: { notify: () => {} },
        getSystemPrompt: () => "",
        sessionManager: sm,
      };
      return { handlers, cmd: commands.get("pi-trim"), ctx };
    };

    let instance = mount();
    const rootUserId = sm.appendMessage({ role: "user", content: "hi", timestamp: 1 });
    await instance.cmd.handler("mode aggressive", instance.ctx);
    const aggressiveBranchId = sm.appendMessage({ role: "user", content: "turn 2", timestamp: 2 });
    await instance.cmd.handler("mode default", instance.ctx);
    sm.appendCompaction("summary", aggressiveBranchId, 100);

    const state = buildSystemPromptState({ cwd: "/workspace" });
    const sys = { role: "system" as const, ...state, timestamp: 0 };

    // Latest branch is back in default mode.
    assert.equal(instance.handlers.get("context_with_system")!({ messages: [sys] }, instance.ctx).messages[0].sections.tools, state.sections.tools);

    // Branch back to aggressive point -> session_tree restores aggressive mode.
    sm.branch(aggressiveBranchId);
    instance.handlers.get("session_tree")!({ type: "session_tree" }, instance.ctx);
    assert.equal(instance.handlers.get("context_with_system")!({ messages: [sys] }, instance.ctx).messages[0].sections.tools, null);

    // Simulated /reload on the aggressive branch -> session_start restores aggressive mode.
    instance = mount();
    instance.handlers.get("session_start")!({ type: "session_start", reason: "reload" }, instance.ctx);
    assert.equal(instance.handlers.get("context_with_system")!({ messages: [sys] }, instance.ctx).messages[0].sections.tools, null);

    // Branch back before mode entry -> falls back to saved default mode.
    sm.branch(rootUserId);
    instance.handlers.get("session_tree")!({ type: "session_tree" }, instance.ctx);
    assert.equal(instance.handlers.get("context_with_system")!({ messages: [sys] }, instance.ctx).messages[0].sections.tools, state.sections.tools);
  } finally {
    if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
    rmSync(dir, { recursive: true, force: true });
  }
});

const piToolsFooterPattern = /(?:Additional tools may be available\.|In addition to the tools above, you may have access to other custom tools depending on the project\.)/;

test("Pi sends the trimmed prompt to a local faux provider", () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-trim-compat-"));
  try {
    const result = spawnSync(process.execPath, [
      resolve(packageRoot, "dist/bundle/cli.js"),
      "--no-session", "--offline", "--no-approve", "--no-extensions", "--no-skills",
      "--no-prompt-templates", "--no-context-files",
      "-e", fileURLToPath(new URL("./fixtures/faux-provider.ts", import.meta.url)),
      "-e", fileURLToPath(new URL("../extensions/index.ts", import.meta.url)),
      "--provider", "pi-trim-test", "--model", "local",
      "--append-system-prompt", "Keep this custom instruction about pi.",
      "-p", "smoke test",
    ], {
      cwd: dir,
      env: { ...process.env, PI_CODING_AGENT_DIR: join(dir, "agent"), PI_OFFLINE: "1", PI_TELEMETRY: "0" },
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const received = JSON.parse(result.stdout.trim());
    const originalPreamble: string = buildSystemPromptState({ cwd: dir }).sections.preamble;
    const identity = knownIdentities.find(({ before }) => originalPreamble.startsWith(before));
    assert.ok(identity, `Unrecognized Pi preamble: ${originalPreamble}`);
    assert.equal(received.preamble, identity.after + originalPreamble.slice(identity.before.length));
    assert.equal(received.docs, null);
    assert.match(received.toolsSection, piToolsFooterPattern);
    assert.equal(received.addendum, "<addendum>\nKeep this custom instruction about pi.\n</addendum>");
    assert.deepEqual(received.tools, ["read", "bash", "edit", "write"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Pi RPC session persists /pi-trim mode across new_session and fresh Pi processes", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-trim-rpc-"));
  const startRpc = () => {
    const child = spawn(process.execPath, [
      resolve(packageRoot, "dist/bundle/cli.js"),
      "--mode", "rpc", "--offline", "--no-approve", "--no-extensions", "--no-skills",
      "--no-prompt-templates", "--no-context-files",
      "-e", fileURLToPath(new URL("./fixtures/faux-provider.ts", import.meta.url)),
      "-e", fileURLToPath(new URL("../extensions/index.ts", import.meta.url)),
      "--provider", "pi-trim-test", "--model", "local",
    ], {
      cwd: dir,
      env: { ...process.env, PI_CODING_AGENT_DIR: join(dir, "agent"), PI_OFFLINE: "1", PI_TELEMETRY: "0" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buffer = "";
    let stderr = "";
    const waiters: Array<{ match: (event: any) => boolean; resolve: (event: any) => void; reject: (err: Error) => void }> = [];
    const backlog: any[] = [];
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      while (buffer.includes("\n")) {
        const i = buffer.indexOf("\n");
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        let event: any;
        try { event = JSON.parse(line); } catch { continue; }
        const idx = waiters.findIndex((w) => w.match(event));
        if (idx !== -1) {
          const [w] = waiters.splice(idx, 1);
          w.resolve(event);
        } else {
          backlog.push(event);
        }
      }
    });
    const nextEvent = (match: (event: any) => boolean, label: string) => {
      const existing = backlog.findIndex(match);
      if (existing !== -1) return Promise.resolve(backlog.splice(existing, 1)[0]);
      return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}; stderr=${stderr}`)), 15_000);
        waiters.push({
          match,
          resolve: (e) => { clearTimeout(timer); resolve(e); },
          reject: (err) => { clearTimeout(timer); reject(err); },
        });
      });
    };
    const send = (payload: object) => { child.stdin.write(JSON.stringify(payload) + "\n"); };
    const runPromptAndReadPayload = async (message: string) => {
      send({ type: "prompt", message });
      const end = await nextEvent((e) => e.type === "agent_end", `agent_end for ${message}`);
      const assistant = end.messages.findLast((m: any) => m.role === "assistant");
      const text = assistant.content.find((b: any) => b.type === "text").text;
      return JSON.parse(text);
    };
    const stop = async () => {
      child.kill();
      await new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) resolve();
        else child.once("close", () => resolve());
      });
    };
    return { nextEvent, send, runPromptAndReadPayload, stop };
  };

  let rpc = startRpc();
  try {
    // Wait for initial command registration.
    rpc.send({ type: "get_commands", id: "cmds" });
    const cmds = await rpc.nextEvent((e) => e.type === "response" && e.id === "cmds", "get_commands");
    assert.ok(cmds.data.commands.some((c: any) => c.name === "pi-trim"));

    // Turn 1 (default): <tools> and Pi's tools footer are present.
    const t1 = await rpc.runPromptAndReadPayload("turn 1");
    assert.match(t1.toolsSection, piToolsFooterPattern);
    assert.deepEqual(t1.tools, ["read", "bash", "edit", "write"]);

    // Switch to aggressive mode via /pi-trim mode.
    rpc.send({ type: "prompt", id: "mode1", message: "/pi-trim mode" });
    const notify1 = await rpc.nextEvent((e) => e.type === "extension_ui_request" && e.method === "notify", "notify aggressive");
    assert.match(notify1.message, /mode set to aggressive/);
    await rpc.nextEvent((e) => e.type === "response" && e.id === "mode1", "mode1 response");

    // Turn 2 (aggressive): <tools> and Additional tools may be available. are stripped; tool declarations remain.
    const t2 = await rpc.runPromptAndReadPayload("turn 2");
    assert.equal(t2.toolsSection, null);
    assert.equal(t2.docs, null);
    assert.deepEqual(t2.tools, ["read", "bash", "edit", "write"]);

    // /pi-trim status reflects last request in aggressive mode.
    rpc.send({ type: "prompt", id: "status1", message: "/pi-trim status" });
    const statusNotify = await rpc.nextEvent((e) => e.type === "extension_ui_request" && e.method === "notify", "notify status");
    assert.match(statusNotify.message, /Mode: aggressive/);
    assert.match(statusNotify.message, /Pi tools list/);
    await rpc.nextEvent((e) => e.type === "response" && e.id === "status1", "status1 response");

    // new_session keeps the persisted aggressive mode.
    rpc.send({ type: "new_session", id: "new1" });
    const newRes = await rpc.nextEvent((e) => e.type === "response" && e.id === "new1", "new_session");
    assert.equal(newRes.success, true);

    const t3 = await rpc.runPromptAndReadPayload("turn 3");
    assert.equal(t3.toolsSection, null);
    await rpc.stop();

    // A brand-new Pi process against the same agentDir also starts in aggressive mode.
    rpc = startRpc();
    const freshT1 = await rpc.runPromptAndReadPayload("fresh turn 1");
    assert.equal(freshT1.toolsSection, null);

    // Switching back to default persists for subsequent new sessions too.
    rpc.send({ type: "prompt", id: "mode2", message: "/pi-trim mode default" });
    await rpc.nextEvent((e) => e.type === "response" && e.id === "mode2", "mode2 response");
    rpc.send({ type: "new_session", id: "new2" });
    await rpc.nextEvent((e) => e.type === "response" && e.id === "new2", "new2 response");
    const freshT2 = await rpc.runPromptAndReadPayload("fresh turn 2");
    assert.match(freshT2.toolsSection, piToolsFooterPattern);
  } finally {
    await rpc.stop();
    rmSync(dir, { recursive: true, force: true });
  }
});
