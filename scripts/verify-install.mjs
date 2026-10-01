import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) throw Error("Usage: node scripts/verify-install.mjs <npm:pi-trim|git:github.com/zhexusun10/pi-trim>");
const root = mkdtempSync(join(tmpdir(), "pi-trim-install-"));
const packageRoot = resolve(dirname(fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"))), "..");
const cli = join(packageRoot, "dist/bundle/cli.js");
const env = { ...process.env, PI_CODING_AGENT_DIR: join(root, "agent"), PI_PACKAGE_DIR: packageRoot, PI_OFFLINE: "1" };
try {
  const installed = spawnSync(process.execPath, [cli, "install", source], { env, cwd: root, encoding: "utf8", timeout: 60_000 });
  if (installed.status !== 0) throw Error(installed.stderr || installed.stdout || String(installed.error));
  const listed = spawnSync(process.execPath, [cli, "list"], { env, cwd: root, encoding: "utf8", timeout: 30_000 });
  if (listed.status !== 0 || !listed.stdout.includes(source)) throw Error("Installed source is absent from pi list.");
  const child = spawn(process.execPath, [cli, "--mode", "rpc", "--no-session", "--offline", "--no-approve"], { env, cwd: root });
  let buffer = "", errors = "";
  child.stderr.on("data", (data) => { errors += data; });
  const loaded = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(Error("RPC load timed out: " + errors)); }, 30_000);
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", () => { clearTimeout(timer); reject(Error("RPC closed before command response: " + errors)); });
    child.stdout.on("data", (data) => {
      buffer += data;
      while (buffer.includes("\n")) {
        const i = buffer.indexOf("\n"); const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
        let result; try { result = JSON.parse(line); } catch { continue; }
        if (result.type === "response" && result.command === "get_commands") {
          clearTimeout(timer); child.kill();
          resolve(result.success && result.data?.commands?.some((command) => command.name === "pi-trim"));
        }
      }
    });
    child.stdin.write(JSON.stringify({ type: "get_commands", id: "verify" }) + "\n");
  });
  if (!loaded) throw Error("Pi installed the package but did not load its pi-trim command.");
  console.log(`PASS: ${source} installs, appears in pi list, and loads /pi-trim in RPC mode.`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
