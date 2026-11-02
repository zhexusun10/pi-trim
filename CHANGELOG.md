# Changelog

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
