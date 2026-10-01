# Releasing

1. Run `npm ci --ignore-scripts`, `npm run check`, `npm test`, and `npm run benchmark`.
2. Update the version and changelog together. Inspect `npm pack --dry-run` for unintended files.
3. Publish with `npm publish --access public`; npm may require browser or OTP authentication.
4. Tag the tested commit and create a GitHub release with measurements and compatibility notes.
5. Check `npm view pi-trim version` and install the published package into an isolated Pi config directory.
6. Verify the package's gallery eligibility (`pi-package` keyword) and check https://pi.dev/packages for indexing. Indexing is controlled by Pi; a keyword does not promise immediate listing.

Pi provides host dependencies. Do not move them into runtime dependencies or bundle them. Model benchmarks are opt-in and consume provider usage. Avoid committing credentials, private prompts, generated task workspaces, or full session transcripts.
