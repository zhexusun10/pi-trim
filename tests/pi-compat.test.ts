import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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
    assert.equal(received.addendum, "<addendum>\nKeep this custom instruction about pi.\n</addendum>");
    assert.deepEqual(received.tools, ["read", "bash", "edit", "write"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
