# Changelog

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
