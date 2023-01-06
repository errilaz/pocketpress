# PocketPress

> A little static site generator

⚠️ Alpha quality! ⚠️

PocketPress is an extremely limited SSG that produces HTML/CSS from a LiveScript-based DSL. Run the tool on a folder and it builds `*.html.ls` files into `.html` pages. It is meant to create simple sites quickly, typically hosted on GitHub pages.

## TODO

- [ ] Docs
- [ ] Tolerant building (skip & log broken pages)
- [ ] Memoize template library
- [ ] Page tags
- [ ] Page date
- [ ] Nested CSS rules
- [ ] Support `raw` and custom properties in `rule`
- [ ] Generate `robots.txt` and `sitemap.xml`
- [ ] Generate Atom `feed.xml` and JSONFeed `feed.json`
- [ ] Merge properties with `style` attribute if both present
- [ ] Produce human-readable markup
- [ ] Use a child process with globals to replace local-vars templates (for speed & `require` support)
  - [ ] Maybe: `--watch` and simple live reload
  - [ ] Maybe: add known CSS keywords, colors, `url()`, functions, etc. to template DSL
- [ ] Maybe: Page authors

