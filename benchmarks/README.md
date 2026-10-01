# Benchmarks

## System text

Run `npm ci --ignore-scripts` and `npm run benchmark`.

The harness imports the prompt builder and built-in tool contributions from a fresh npm installation of Pi 0.99.2. It generates the default read/bash/edit/write prompt, normalizes the installation directory to `/opt/pi` and the working directory to `/workspace`, then runs the exact transformer used by the extension.

| Metric | Default Pi | pi-trim |
| --- | ---: | ---: |
| `o200k_base` tokens | 540 | 274 |
| Characters | 2,448 | 1,248 |

**266 fewer tokens (49.3%)** in system text. See [prompt.json](prompt.json), [before.txt](before.txt), and [after.txt](after.txt). Generated Pi prompt excerpts are licensed under the upstream [MIT license](PI-LICENSE).

The fixture includes tool snippets and guidelines, but not full tool schemas, provider request wrappers, skills, addenda, or project instructions. This is tokenizer output, not an API billing measurement. Runtime `/pi-trim status` uses a cheaper chars/4 estimate, which will differ.

## Coding tasks

The repository includes ten fixed JavaScript coding tasks with deterministic assertion-based verifiers: finite sums, stable deduplication, CSV parsing, an LRU cache, async retries, numeric version comparison, topological sorting, wildcard matching, concurrency limits, and a transfer ledger.

Run the opt-in comparison with your Pi credentials:

```bash
BENCH_PROVIDER=openai-codex BENCH_MODEL=gpt-6-sol npm run benchmark:tasks
```

This makes **20 coding-agent runs** by default and consumes provider usage. `BENCH_REPEATS=3` repeats the suite; `BENCH_TASK_LIMIT=1` performs a small smoke comparison. `BENCH_AUTH_PATH` can point to another Pi auth file. Local results go to `benchmarks/local/tasks.json`, excluded from Git. Use `BENCH_OUTPUT` to choose another destination.

Each condition gets a fresh temporary task directory and ephemeral Pi session. The harness uses the unmodified npm Pi CLI, isolates its config directory, disables extension/skill/context discovery and startup network operations, explicitly selects read/bash/edit/write tools and thinking off, and loads pi-trim only for the treatment. Baseline and treatment order alternate across tasks. Both use the same provider and model.

The harness records:

- Independent verifier success, with the test file checked for modification.
- First text-delta time, first output-delta time (text, thinking, or tool-call arguments), and total process duration. These include CLI startup and are client-observed timings.
- Pi-reported input, output, cached-read and cached-write tokens; total input is their uncached and cached input sum.
- Pi-reported model-price cost estimate, which need not correspond to a subscription bill.
- Tool calls by name.

There is a 180-second timeout per run. Provider errors stop the suite; incomplete results are retained locally. Temporary task/config directories are cleaned up. The extension itself makes no model calls; this developer benchmark does.

These are small synthetic coding tasks, not a production repository benchmark. One run per task cannot establish a latency or quality improvement. Provider prompt caching, shared prefixes, network variance, model nondeterminism, and test coverage all affect the comparison. For stronger claims, repeat with multiple models and real repository tasks, randomize run order, and control cache conditions.

Published results from the initial run are linked below once the full suite has completed.
