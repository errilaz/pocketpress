# PocketPress tests

## Run

```sh
pnpm run test:run
pnpm exec vitest run test/site.test.ts --threads false
pnpm exec vitest run test/watch.test.ts --threads false
```

`test:run` runs once without worker threads. CLI tests already start separate processes. `pnpm test` retains Vitest's interactive watch mode.

Node.js, Bash, and the installed development dependencies are required. Vite is declared directly because Vitest resolves it from the project root.

## Coverage

- `site.test.ts`: a complete LiveScript site with layouts, nested includes, HTML/CSS/Markdown outputs, metadata, navigation, tag pages, feeds, sitemap, and robots.
- `cli.test.ts`: command flags, discovery, exclusions, output paths, optional site metadata, file reads, site-local dependencies, rebuilds, and error diagnostics.
- `template.test.ts`: compilation, evaluation scopes, generated DSL names, helper injection, includes, and errors.
- `markup.test.ts`: class proxies, CSS helpers, embedded Markdown and LiveScript, raw content, document composition, links, and reload markup.
- `metadata.test.ts`: JSON Feed and Atom fields, URL handling, defaults, escaping, and sitemap selection.
- `print.test.ts`: HTML/CSS serialization and content boundaries.
- `watch.test.ts`: real initial builds, partial changes, source additions/removals, syntax-error recovery, and reload-script behavior.

XML checks cover expected structure and fields; they are not full XML schema validation. Browser reload behavior runs against a small VM-based DOM substitute, not a browser.

## Isolation

`SiteFixture` creates a temporary site and a separate existing output directory. It supplies an empty `package.json` unless a test overrides or removes it. The complete site lives in `fixtures/site` and is copied before execution.

CLI tests invoke `bin/pocket` with `POCKET_DEV=true` and `TS_NODE_TRANSPILE_ONLY=true`. This exercises current sources without relying on stale `lib` output. These execution tests do not perform TypeScript checking. Child processes use UTC for deterministic dates and have bounded execution times.

Watch tests preload `support/watch-ready.cjs`. This observer wraps the real Chokidar factory only to report its `ready` event; it does not replace file watching. Tests wait for readiness and completed rebuilds instead of guessing startup delays. Cleanup terminates the child process group before removing temporary files.

Direct markup tests initialize `createTemplate` first, matching the CLI's load order through the existing circular imports.

## Regression coverage

All regression checks run as ordinary tests. No expected-failure markers remain.

1. Sites build without an optional `package.json`.
2. Builds create missing output directories, including shared parent directories for concurrent writes.
3. Unbraced multiline metadata retains its first field, with or without surrounding comments and final newlines.
4. Dated navigation and feeds sort by full timestamps across months, years, and times within a day.
5. Atom author names are XML-escaped.
6. Sitemap locations escape both the base URL and the page path.
7. HTML attribute values are escaped.
8. Inline style attributes are HTML-escaped without changing standalone CSS output.

Fixtures cover both existing and missing output directories, explicit and unbraced metadata objects, and sites with and without configuration. The complete-site fixture uses dates within one month; separate regressions cover month and year boundaries and timezone offsets.
