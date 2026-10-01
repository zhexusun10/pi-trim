# Migrating from strip-pi-docs.ts

The old standalone extension patched JavaScript files in Pi's installation directory. pi-trim does not carry that behavior forward.

1. Remove the old `strip-pi-docs.ts` from your global extension directory (`~/.pi/agent/extensions/`), or remove its configured path. If it is a symlink, remove only the link.
2. If the old extension ran, reinstall Pi with the package manager you originally used. Removing the old extension alone does not restore patched Pi files. Do this after disabling the old extension, so it cannot patch the fresh installation again.
3. Install pi-trim using `pi install npm:pi-trim` or the GitHub source.
4. Restart Pi and inspect `/pi-trim status` after a request.

An already-patched host may report little or no additional reduction. The published benchmark uses a fresh, unmodified Pi npm package, not a patched installation.

The old `/strip-docs` command is replaced by `/pi-trim status` and `/pi-trim diff`. Installation scripts and file-patching commands have been removed.
