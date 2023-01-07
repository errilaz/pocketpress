# PocketPress

> A little static site generator

⚠️ Alpha quality! ⚠️

PocketPress is an extremely limited SSG that produces HTML/CSS from a LiveScript-based DSL. Run the tool on a folder and it builds `*.html.ls` files into `.html` pages. It is meant to create simple sites quickly, typically hosted on GitHub pages.

## TODO

- [x] Use a child process with globals to replace local-vars templates (for speed)
- [ ] Separate HTML printing from markup model
  - [ ] Produce human-readable markup
  - [ ] Support `raw` and custom properties in `rule`
- [ ] Add `--verbose`
- [ ] Docs
- [ ] Tolerant building (skip & log broken pages)
- [ ] Memoize template library
- [ ] Page tags
- [ ] Page date
- [ ] Embed file properties, file tree, etc. into templates as data
- [ ] Nested CSS rules
- [ ] Generate `robots.txt` and `sitemap.xml`
- [ ] Generate Atom `feed.xml` and JSONFeed `feed.json`
- [ ] Merge properties with `style` attribute if both present
- [ ] `~` site root resolution for `include` and `load-file`
- [ ] Allow single file build
- [ ] Page authors
- [ ] `--watch` and simple live reload
- [ ] Add known CSS keywords, colors, `url()`, functions, etc. to template DSL
