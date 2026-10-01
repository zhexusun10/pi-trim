import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { encode } from "gpt-tokenizer/encoding/o200k_base";
import { trimSystemMessage, systemText } from "../lib/trim.ts";

const require = createRequire(import.meta.url);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent"))), "..");
const { buildSystemPromptSections } = await import(pathToFileURL(resolve(packageRoot, "dist/core/system-prompt.js")).href);
const toolSnippets: Record<string, string> = {};
const toolGuidelines: Record<string, string[]> = {};
for (const name of ["read", "bash", "edit", "write"]) {
  const module = await import(pathToFileURL(resolve(packageRoot, `dist/core/tools/${name}.js`)).href);
  const contribution = module[`${name}ToolSystemPromptContribution`];
  toolSnippets[name] = contribution.snippet;
  toolGuidelines[name] = contribution.guidelines;
}
const sections = buildSystemPromptSections({ cwd: "/workspace", toolSnippets, toolGuidelines });
for (const key of Object.keys(sections)) sections[key] = sections[key].replaceAll(packageRoot, "/opt/pi");
const original = { role: "system" as const, content: "", sections, timestamp: 0 };
const trimmed = trimSystemMessage(original);
const before = systemText(original);
const after = systemText(trimmed);
const beforeTokens = encode(before).length;
const afterTokens = encode(after).length;
const result = {
  piVersion: require(resolve(packageRoot, "package.json")).version,
  tokenizer: "gpt-tokenizer 4.0.0 / o200k_base",
  setup: "Default read/bash/edit/write snippets and guidelines; no skills, project context, or addendum. Pi install path normalized to /opt/pi; cwd /workspace. System text only; excludes tool schemas and provider wrappers.",
  beforeTokens, afterTokens, removedTokens: beforeTokens - afterTokens,
  removedPercent: Number(((beforeTokens - afterTokens) / beforeTokens * 100).toFixed(1)),
  beforeCharacters: [...before].length, afterCharacters: [...after].length,
};
mkdirSync("benchmarks", { recursive: true });
writeFileSync("benchmarks/prompt.json", JSON.stringify(result, null, 2) + "\n");
writeFileSync("benchmarks/before.txt", before + "\n");
writeFileSync("benchmarks/after.txt", after + "\n");
console.log(JSON.stringify(result, null, 2));
