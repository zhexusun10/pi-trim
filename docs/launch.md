# Launch materials

Use the measured system-text result, not a claim about total request size, task quality, or guaranteed latency. Attach `assets/before-after.png` when the channel permits it. Read each community's rules before posting; these are drafts for the maintainer to publish.

## Pi Discord

**Title: Less Pi in Pi: an inspectable system-prompt experiment**

I built pi-trim, a tiny Pi Package that strips Pi's self-description, documentation pointers, and PI_* hint from provider-bound system messages while preserving tools and project instructions.

On Pi 0.99.2's default system-text fixture: 540 → 274 tokens with o200k_base (-49.3%). That excludes tool schemas and project context; it is not a billing or quality claim.

`pi install npm:pi-trim`

It runs in memory, with no file patching, network requests, telemetry, or model calls. `/pi-trim status` and `/pi-trim diff` show what changed. The repo includes source, reproducible prompt measurements, and a ten-task comparison.

https://github.com/zhexusun10/pi-trim

Feedback on compatibility and preservation of custom prompts would be especially useful.

## X

pi-trim — Less Pi in Pi.

Pi 0.99.2 default system text: 540 → 274 tokens (-49.3%, o200k_base). Tools + your instructions stay. In-memory only; inspect with /pi-trim diff.

Not a speed/quality claim. Reproducible benchmark:
https://github.com/zhexusun10/pi-trim

## Reddit

**Title: I tested removing Pi's own documentation pointers from its system prompt**

I'm the author of pi-trim, an experimental Pi Package. I wanted to see what happens if the coding model gets less context about the harness itself.

The package removes only Pi's recognized identity phrase, documentation section, and one PI_* environment-variable hint. It preserves tools, project instructions, skills, and conversation messages. It does not rewrite Pi's installation or session files.

The default Pi 0.99.2 system-text fixture goes from 540 to 274 o200k_base tokens. That is a 49.3% reduction in system text, not in the whole request. Project context and tool schemas can dominate the real request.

I included a reproducible prompt counter and a ten-task baseline/treatment harness, with raw metrics and caveats in the repo. I am not claiming that removing these instructions makes the model smarter or reliably faster. It also removes useful pointers when working on Pi's own SDK, so that is a real tradeoff.

Source, measurements, and installation: https://github.com/zhexusun10/pi-trim

If you try it, I'd be interested in tasks where losing the Pi docs pointers helps or hurts.

## Show HN

**Title: Show HN: pi-trim – Less Pi in Pi's system prompt**

**URL:** https://github.com/zhexusun10/pi-trim

**First comment:**

I built an inspectable Pi Package that removes the harness's own identity phrase, documentation pointers, and environment-variable hint before model requests. Tools, project instructions, skills, and other system sections remain.

The default Pi 0.99.2 system-text fixture measures 540 → 274 o200k_base tokens; tool schemas and project context are excluded. The repo includes the before/after text, tokenizer script, and a ten-task model comparison. A single small suite does not establish better latency or quality.

The extension makes no network requests or filesystem operations. `/pi-trim diff` exposes the exact changes. Install with `pi install npm:pi-trim`.

It is intentionally a small experiment. The main tradeoff is losing Pi's automatic documentation pointers when developing Pi extensions or SDK integrations.

## Release follow-up

After publishing, check npm metadata and the Pi catalog. Eligibility comes from the `pi-package` keyword; Pi controls indexing and listing timing. Prioritize bug reports with reproducible prompts, then expand the benchmark across providers and real repository tasks before making performance claims.
