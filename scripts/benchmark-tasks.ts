import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { tasks } from "../benchmarks/tasks.ts";

const provider = process.env.BENCH_PROVIDER;
const model = process.env.BENCH_MODEL;
if (!provider || !model) throw Error("Set BENCH_PROVIDER and BENCH_MODEL. This benchmark makes 20 model-assisted coding runs and uses your Pi credentials.");
const repeats = Number(process.env.BENCH_REPEATS ?? 1);
if (!Number.isInteger(repeats) || repeats < 1) throw Error("BENCH_REPEATS must be a positive integer.");
const root = mkdtempSync(join(tmpdir(), "pi-trim-bench-"));
const agentDir = join(root, "agent");
mkdirSync(agentDir);
symlinkSync(process.env.BENCH_AUTH_PATH ?? join(homedir(), ".pi/agent/auth.json"), join(agentDir, "auth.json"));
writeFileSync(join(agentDir, "settings.json"), JSON.stringify({ defaultProvider: provider, defaultModel: model, enableCacheWarming: false }));
const packageRoot = resolve(dirname(fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"))), "..");
const cli = join(packageRoot, "dist/bundle/cli.js");
const extension = resolve("extensions/index.ts");
const results: any[] = [];
const selected = tasks.slice(0, Number(process.env.BENCH_TASK_LIMIT ?? tasks.length));
const output = process.env.BENCH_OUTPUT ?? "benchmarks/local/tasks.json";
mkdirSync(dirname(output), { recursive: true });

async function run(task: typeof tasks[number], mode: string, repeat: number) {
  const cwd = join(root, `${task.id}-${mode}-${repeat}`);
  mkdirSync(cwd);
  writeFileSync(join(cwd, "task.mjs"), "// Implement the requested exports here.\n");
  const testSource = `import assert from 'node:assert/strict';\nimport * as m from './task.mjs';\n${task.tests}\n`;
  writeFileSync(join(cwd, "test.mjs"), testSource);
  const args = [cli, "--offline", "--no-session", "--mode", "json", "--thinking", "off", "--provider", provider!, "--model", model!,
    "--tools", "read,bash,edit,write", "--no-extensions", "--no-skills", "--no-prompt-templates", "--no-themes", "--no-context-files", "--no-approve"];
  if (mode === "trim") args.push("-e", extension);
  args.push(`Implement task.mjs. ${task.requirement} Read the existing files, edit task.mjs, and run node test.mjs. Do not modify test.mjs or install dependencies. Keep your final answer brief.`);
  const started = performance.now();
  let firstTextMs: number | null = null;
  let firstOutputMs: number | null = null;
  let agentStartMs: number | null = null;
  let lineBuffer = "";
  let stderr = "";
  let error: string | undefined;
  const toolCalls: Record<string, number> = {};
  let input = 0, outputTokens = 0, cacheRead = 0, cacheWrite = 0, cost = 0;
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, PI_CODING_AGENT_DIR: agentDir, PI_OFFLINE: "1", PI_PACKAGE_DIR: packageRoot }, stdio: ["ignore", "pipe", "pipe"] });
  const timer = setTimeout(() => { error = "Timeout after 180 seconds"; child.kill("SIGTERM"); }, 180_000);
  child.stderr.on("data", (data) => { stderr += data.toString(); });
  child.stdout.on("data", (data) => {
    lineBuffer += data.toString();
    while (lineBuffer.includes("\n")) {
      const index = lineBuffer.indexOf("\n");
      const line = lineBuffer.slice(0, index); lineBuffer = lineBuffer.slice(index + 1);
      let event: any; try { event = JSON.parse(line); } catch { continue; }
      const elapsed = Math.round(performance.now() - started);
      if (event.type === "agent_start") agentStartMs = elapsed;
      const delta = event.assistantMessageEvent?.type;
      if (["text_delta", "thinking_delta", "toolcall_delta"].includes(delta) && firstOutputMs === null) firstOutputMs = elapsed;
      if (delta === "text_delta" && firstTextMs === null) firstTextMs = elapsed;
      if (event.type === "tool_execution_start") toolCalls[event.toolName] = (toolCalls[event.toolName] ?? 0) + 1;
      if (event.type === "message_end" && event.message?.role === "assistant") {
        const usage = event.message.usage;
        input += usage?.input ?? 0; outputTokens += usage?.output ?? 0;
        cacheRead += usage?.cacheRead ?? 0; cacheWrite += usage?.cacheWrite ?? 0; cost += usage?.cost?.total ?? 0;
        if (event.message.stopReason === "error") error = event.message.errorMessage ?? "Provider error";
      }
    }
  });
  const exitCode = await new Promise<number | null>((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  clearTimeout(timer);
  const elapsedMs = Math.round(performance.now() - started);
  const oracle = spawn(process.execPath, ["test.mjs"], { cwd, stdio: "ignore" });
  const oracleExit = await new Promise<number | null>((resolve, reject) => { oracle.on("error", reject); oracle.on("close", resolve); });
  const result = { task: task.id, mode, repeat, success: exitCode === 0 && oracleExit === 0 && readFileSync(join(cwd, "test.mjs"), "utf8") === testSource && !error,
    exitCode, elapsedMs, firstTextMs, firstOutputMs, agentStartMs,
    inputTokens: input, outputTokens, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite,
    totalInputTokens: input + cacheRead + cacheWrite, reportedCostUsd: cost, toolCalls,
    ...(error || exitCode !== 0 ? { error: error ?? stderr.slice(-500) } : {}) };
  console.log(`${task.id} / ${mode}: ${result.success ? "PASS" : "FAIL"}; ${elapsedMs}ms; ${result.totalInputTokens} input tokens`);
  results.push(result);
  writeFileSync(output, JSON.stringify({ provider, model, piVersion: "0.99.2", repeats, results }, null, 2) + "\n");
  return result;
}

try {
  for (let repeat = 1; repeat <= repeats; repeat++) {
    for (const [index, task] of selected.entries()) {
      // Alternate the order to reduce systematic warm-cache ordering bias.
      for (const mode of (index + repeat) % 2 ? ["baseline", "trim"] : ["trim", "baseline"]) {
        const result = await run(task, mode, repeat);
        if (result.error) throw Error(`Stopped after provider/runtime error in ${task.id}/${mode}: ${result.error}`);
      }
    }
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}
