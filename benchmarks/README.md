# Benchmarks

## System text

Run `npm ci --ignore-scripts` and `npm run benchmark`.

The harness imports the prompt builder and built-in tool contributions from a fresh npm installation of Pi 1.0. It generates the default read/bash/edit/write prompt, normalizes the installation directory to `/opt/pi` and the working directory to `/workspace`, then runs the exact transformer used by the extension.

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

## Initial coding-task results

Measured on **2026-10-02**, using `openai-codex / gpt-6-sol`, Pi 1.0, thinking off, one paired pass per task. [Raw per-task metrics and summary](tasks-openai-codex-gpt-6-sol.json).

| Metric | Default Pi | pi-trim |
| --- | ---: | ---: |
| Tasks passing independent verifiers | 10 / 10 | 10 / 10 |
| Total input tokens across ten tasks, including cached input | 63,903 | 50,699 |
| Uncached input tokens | 25,759 | 30,091 |
| Cached-read input tokens | 38,144 | 20,608 |
| Output tokens | 3,115 | 3,097 |
| Median input tokens per task | 6,394 | 5,084.5 |
| Median first text delta, from process start | 14.179 s | 13.673 s |
| Median first output delta, including tool-call arguments | 4.968 s | 4.397 s |
| Median total process time | 17.961 s | 17.454 s |
| Aggregate tools: read / bash / edit / write | 20 / 20 / 8 / 2 | 20 / 20 / 8 / 2 |
| Sum of Pi-reported model-price cost estimates | $0.090297 | $0.095274 |

The treatment used **20.7% fewer total input tokens** in this suite. Both conditions passed all ten tasks and had the same aggregate tool-call counts. There was no observed change in that aggregate tool-use mix; this does not establish equivalent behavior on larger tasks.

The treatment's estimated cost was **5.5% higher**, despite lower total input. Cache hits and output tokens affect cost independently of prompt size. Neither a cost saving nor a reliable latency improvement is established. Baseline LRU-cache time (127.568 s) and treatment retry time (72.535 s) were outliers. The small, single-pass suite and uncontrolled provider cache make broader performance claims premature.
