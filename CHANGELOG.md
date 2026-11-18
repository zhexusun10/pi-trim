# Changelog

## 0.3.1

- Persist `/pi-trim mode` across new Pi sessions in `pi-trim.json` inside `getAgentDir()` (`~/.pi/agent/pi-trim.json` or `$PI_CODING_AGENT_DIR/pi-trim.json`), while keeping explicit session-branch `pi-trim-mode` entries higher priority on resume and tree navigation.
- Isolate `PI_CODING_AGENT_DIR` in extension tests and verify persistence across `new_session` and fresh Pi RPC processes.

## 0.3.0

- Add `/pi-trim mode` (`default` | `aggressive`) with argument completions and session-branch persistence across reload, resume, fork, and tree navigation.
- In `aggressive` mode, remove Pi's recognized `<tools>` summary list (including `Additional tools may be available.` and Pi 1.0/1.4 equivalents) while preserving API tool schemas, `<rules>`, and custom `<tools>` sections.
- Suppress redundant mid-session `tools` section deletion notices after `<tools>` has already been stripped from the leading system message.
- Verify mode toggling, session tree restoration, and real Pi RPC sessions across Pi 1.0.0, 1.4.0, and 1.5.0 fixtures.

## 0.2.2

- Support the Pi 1.5.0 default identity while preserving compatibility with the previous wording.
- Test Pi 1.0.0, 1.4.0, and 1.5.0 prompt generation and CLI requests using a local faux provider.
- Refresh the prompt benchmark and illustrated demo using Pi 1.5.0.

## 0.2.1

- Update package description and discoverability keywords (`pi-coding-agent`, `context`, `token-optimization`).
- Provide standard MP4 video (`assets/demo.mp4`) in Pi Gallery metadata (`pi.video`).

## 0.2.0

- **Pi 1.0 compatibility**: Verified and tested with Pi 1.0.
- Updated visual assets with monochrome grayscale design (black, white, gray palette).
- Slowed down the second frame of the demo animation for better readability.
- Updated all documentation and benchmarks to reference Pi 1.0.
- Core extension API remains stable and fully compatible with Pi 1.0.

## 0.1.1

- Move the Chinese translation into `docs/` so npm selects the English README as the package homepage.
- Include the completed ten-task comparison in the npm README.

## 0.1.0

- Initial Pi Package release: npm and GitHub installation, explicit extension manifest, and gallery metadata.
- Transform recognized Pi system-prompt boilerplate in memory before model requests.
- Preserve project context, skills, tools, custom sections, and conversation messages.
- Add `/pi-trim status` and `/pi-trim diff` inspection commands.
- Include reproducible prompt and coding-task benchmarks, CI, and English-first documentation.
- Replace the original standalone script's installation-file patching; see the migration guide.
