# pi-trim

**Less Pi in Pi.**

Strip Pi-specific identity and documentation from the system prompt. Keep the coding assistant, tools, and your instructions.

[![CI](https://github.com/zhexusun10/pi-trim/actions/workflows/ci.yml/badge.svg)](https://github.com/zhexusun10/pi-trim/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/pi-trim)](https://www.npmjs.com/package/pi-trim)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Pi 1.0](https://img.shields.io/badge/Pi-1.0-blue.svg)](https://pi.dev)

[简体中文](docs/README.zh-CN.md) · [Measured results](benchmarks/README.md) · [Source](extensions/index.ts)

![Pi's default system text: 540 to 274 tokens, measured with o200k_base](https://raw.githubusercontent.com/zhexusun10/pi-trim/main/assets/before-after.png)

```bash
pi install npm:pi-trim
```

Then start a new Pi process, or use `/reload` in an existing session.

GitHub installation also works:

```bash
pi install git:github.com/zhexusun10/pi-trim
```

## What changes?

What happens if Pi knows less about Pi?

Pi already keeps its default prompt small. This package removes three recognizable pieces of its own boilerplate:

| Before | After |
| --- | --- |
| `You are an expert coding assistant operating inside pi, a coding agent harness.` | `You are an expert coding assistant.` |
| Pi's `<docs>` section: pointers to its README, SDK, extensions, themes, skills, and TUI documentation | Removed from the provider-bound system messages |
| The exact rule telling the model to inspect `PI_*` environment variables | Removed |

Tool descriptions and schemas, other rules, project instructions, skills, addenda, custom sections, and conversation messages remain intact. A user-defined docs section with different contents is preserved. This is a targeted transformation, not a filter for every occurrence of `pi` or `docs`.

You can still ask the model about Pi, but its automatic documentation pointers are gone. Provide the relevant paths or links yourself when doing Pi SDK or extension work.

## Inspect it

```text
/pi-trim
/pi-trim status
/pi-trim diff
```

`status` reports original and remaining character counts, a **chars / 4 token estimate**, and changed sections. `diff` shows the exact removed or replaced text.

Before the first model request, the command previews the base prompt. Afterwards, it describes the system text in the most recent request, including system-message updates. Tool schemas are excluded. Other extensions running later can change that request again.

![Illustrated pi-trim command demo, based on the measured fixture](https://raw.githubusercontent.com/zhexusun10/pi-trim/main/assets/demo.gif)

The animation is an illustrated command demo, not a recording of a live model session.

## Measured prompt reduction

| Pi 1.0 default system text | Tokens |
| --- | ---: |
| Before | 540 |
| After | 274 |
| Removed | **266 (49.3%)** |

Measured using `gpt-tokenizer` 4.0.0, `o200k_base`, with default read/bash/edit/write tool snippets and guidelines. Installation paths are normalized to `/opt/pi`, and the working directory to `/workspace`. No project instructions, skills, or addenda. Tool schemas and provider formatting are excluded.

These are tokenizer counts for the published fixture, not provider billing totals. Adding your project context reduces the percentage saved. Smaller prompts do not establish better task success, latency, or cost; see the [benchmark methodology and results](benchmarks/README.md).

```bash
npm ci --ignore-scripts
npm run benchmark
```

## Coding-task comparison

A single paired pass over ten small JavaScript tasks with `openai-codex / gpt-6-sol`:

| Metric | Default Pi | pi-trim |
| --- | ---: | ---: |
| Task success | 10 / 10 | 10 / 10 |
| Total input tokens, including cached input | 63,903 | 50,699 (-20.7%) |
| Median first text delta (includes CLI startup) | 14.179 s | 13.673 s |
| Pi-reported model-price cost estimate | $0.090297 | $0.095274 (+5.5%) |

Aggregate tool-call counts were identical. This run does **not** establish better latency, quality, or cost: it is small, cache state was uncontrolled, and there were timing outliers. [Raw data, full metrics, and caveats](benchmarks/README.md#initial-coding-task-results).

## How it works

The extension hooks `context_with_system` before each model call. It clones recognized system messages, transforms only the relevant content or named sections, and returns the replacement messages. It preserves tool additions/removals and section-deletion markers in mid-session updates. Pi's stored transcript is not rewritten.

The extension itself makes **no network requests, telemetry, model calls, file reads, or file writes**. It only transforms system messages in memory and shows reports on request. Pi's own behavior and installation operations are separate.

Tested with **Pi 1.0** and Node.js 22.19+. The manifest follows [Pi's host-provided peer dependency convention](https://pi.dev/docs/latest/packages); it does not bundle Pi. Earlier Pi versions without `context_with_system` are unsupported. Upstream prompt changes may require new matching rules; unknown content passes through.

## Update and remove

```bash
pi update npm:pi-trim
pi remove npm:pi-trim
```

For a GitHub install, use `git:github.com/zhexusun10/pi-trim` as the source instead. Restart Pi or run `/reload` after removal.

Migrating from the old `strip-pi-docs.ts` script? See the [migration guide](docs/migration.md), especially if it previously patched your Pi installation.

## Development

```bash
npm ci --ignore-scripts
npm run check
npm test
npm run benchmark
pi -e .
```

No build step or runtime dependencies. Pi loads the TypeScript extension directly. Tests cover preservation of project context, tools, custom sections, text blocks, and mid-session updates.

For real coding-task comparisons, see [benchmarks/README.md](benchmarks/README.md). Contributions and bug reports are welcome; include the Pi version and a minimal prompt example with private content removed.

## License

MIT. An independent community package, not an official Pi product.
