import { afterEach, describe, expect, it } from "vitest"
import { mkdir, readFile, readdir, rm } from "fs/promises"
import { join } from "path"
import { SiteFixture } from "./support/SiteFixture"

describe("pocket CLI", () => {
  let site: SiteFixture | undefined

  afterEach(async () => {
    if (site) await SiteFixture.remove(site)
    site = undefined
  })

  it.each(["-h", "--help"])("prints help with %s without building", async flag => {
    site = await SiteFixture.create({ "index.html.ls": "page: (" })
    const result = await SiteFixture.run(site, [flag])
    SiteFixture.assertSuccess(result)
    expect(result.stdout).toContain("Usage: pocket [options] [path]")
    expect(result.stdout).toContain("--output")
    expect(result.stdout).toContain("--exclude")
    expect(result.stdout).toContain("--watch")
    expect(await readdir(site.root)).not.toContain("index.html")
  })

  it("uses the current directory and writes output beside templates", async () => {
    site = await SiteFixture.create({ "index.html.ls": 'page: h1 "Hello"' })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html")).toBe("<!DOCTYPE html>\n<h1>Hello</h1>")
    expect(await SiteFixture.read(site, "index.html.ls")).toBe('page: h1 "Hello"')
  })

  it("accepts an explicit source path containing spaces and Unicode", async () => {
    site = await SiteFixture.create({
      "nested café/package.json": "{}",
      "nested café/index.html.ls": 'page: p "café"',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site, [join(site.root, "nested café")]))
    expect(await SiteFixture.read(site, "nested café/index.html")).toBe("<!DOCTYPE html>\n<p>café</p>")
    expect(await readdir(site.root)).not.toContain("index.html")
  })

  it.each(["-o", "--output"])("writes to a separate existing directory with %s", async flag => {
    site = await SiteFixture.create({ "index.html.ls": 'page: p "Separate output"' })
    SiteFixture.assertSuccess(await SiteFixture.run(site, [flag, site.output]))
    expect(await readFile(join(site.output, "index.html"), "utf8"))
      .toBe("<!DOCTYPE html>\n<p>Separate output</p>")
    expect(await readdir(site.root)).not.toContain("index.html")
  })

  it("preserves nested paths in a prepared output tree", async () => {
    site = await SiteFixture.create({ "posts/entry.html.ls": 'page: p "Nested"' })
    await mkdir(join(site.output, "posts"))
    SiteFixture.assertSuccess(await SiteFixture.run(site, ["--output", site.output]))
    expect(await readFile(join(site.output, "posts/entry.html"), "utf8"))
      .toBe("<!DOCTYPE html>\n<p>Nested</p>")
  })

  it("ignores default exclusions and non-template source files", async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: p "Included"',
      ".git/bad.html.ls": "page: (",
      "node_modules/bad.html.ls": "page: (",
      "unused.ls": "(",
      "ignored.txt.ls": "(",
      "existing.html": "Keep existing content",
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "existing.html")).toBe("Keep existing content")
    expect(await readdir(join(site.root, ".git"))).toEqual(["bad.html.ls"])
    expect(await readdir(join(site.root, "node_modules"))).toEqual(["bad.html.ls"])
    expect(await readdir(site.root)).not.toContain("ignored.txt")
  })

  it("accepts repeated short and long exclude flags relative to the site root", async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: p "Included"',
      "drafts/bad.html.ls": "page: (",
      "private/bad.css.ls": "(",
      "drafts-public/index.html.ls": 'page: p "Not excluded"',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site, ["-e", "drafts", "--exclude", "private"]))
    expect(await SiteFixture.read(site, "drafts-public/index.html")).toContain("Not excluded")
    expect(await readdir(join(site.root, "drafts"))).toEqual(["bad.html.ls"])
    expect(await readdir(join(site.root, "private"))).toEqual(["bad.css.ls"])
  })

  it("builds an empty site without generating artifacts", async () => {
    site = await SiteFixture.create()
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await readdir(site.root)).toEqual(["package.json"])
  })

  it.each([
    ["no pocket config", {}],
    ["no base URL", { pocket: { title: "Local site" } }],
  ])("omits site-wide artifacts with %s", async (_name, config) => {
    site = await SiteFixture.create({
      "package.json": JSON.stringify(config),
      "index.html.ls": '{date: "2023-01-01", map: true, page: p "Local"}',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect((await readdir(site.root)).sort()).toEqual(["index.html", "index.html.ls", "package.json"])
  })

  it("writes robots and sitemap but no feeds when no dated pages qualify", async () => {
    site = await SiteFixture.create({
      "package.json": JSON.stringify({ pocket: { baseUrl: "https://example.test" } }),
      "index.html.ls": '{map: true, page: p "Undated"}',
      "hidden.html.ls": '{date: "2023-01-01", feed: false, page: p "Hidden"}',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    const files = await readdir(site.root)
    expect(files).toContain("sitemap.xml")
    expect(files).toContain("robots.txt")
    expect(files).not.toContain("feed.xml")
    expect(files).not.toContain("feed.json")
  })

  it("does not emit a tag page when there are no tags", async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: p "No tags"',
      "[tag].html.ls": 'page: ({tag}) -> h1 tag.name',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect((await readdir(site.root)).filter(path => path.endsWith(".html"))).toEqual(["index.html"])
  })

  it("supports relative and root-relative file reads from nested templates", async () => {
    site = await SiteFixture.create({
      "shared.txt": "Root content",
      "posts/local.txt": "Local content",
      "posts/index.html.ls": 'page: div (load-file "local.txt"), (load-file "~/shared.txt")',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "posts/index.html"))
      .toBe("<!DOCTYPE html>\n<div>Local contentRoot content</div>")
  })

  it("resolves nested includes relative to the included file", async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: include "parts/outer.ls"',
      "parts/outer.ls": 'div include "inner.ls"',
      "parts/inner.ls": 'p "Nested partial"',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html"))
      .toBe("<!DOCTYPE html>\n<div><p>Nested partial</p></div>")
  })

  it("resolves dependencies from the site's node_modules", async () => {
    site = await SiteFixture.create({
      "node_modules/fixture-dependency/index.js": 'module.exports = "Site dependency"',
      "index.html.ls": 'page: p require "fixture-dependency"',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html")).toContain("<p>Site dependency</p>")
  })

  it("executes templates under Bun", async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: p (if process.versions.bun then "Bun" else "Other runtime")',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html")).toBe("<!DOCTYPE html>\n<p>Bun</p>")
  })

  it("provides require for Node-compatible built-ins inside evaluated templates", async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: p (require("node:path").basename "/posts/entry.html")',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html")).toBe("<!DOCTYPE html>\n<p>entry.html</p>")
  })

  it("resolves relative requires from the template rather than PocketPress", async () => {
    site = await SiteFixture.create({
      "posts/message.cjs": 'module.exports = "Template dependency"',
      "posts/index.html.ls": 'page: p require "./message.cjs"',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "posts/index.html"))
      .toBe("<!DOCTYPE html>\n<p>Template dependency</p>")
  })

  it("binds require independently for included templates and their callers", async () => {
    site = await SiteFixture.create({
      "message.cjs": 'module.exports = "Root dependency"',
      "parts/message.cjs": 'module.exports = "Partial dependency"',
      "parts/partial.ls": 'p require "./message.cjs"',
      "index.html.ls": 'page: div (include "parts/partial.ls"), (p require "./message.cjs")',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html"))
      .toBe("<!DOCTYPE html>\n<div><p>Partial dependency</p><p>Root dependency</p></div>")
  })

  it("keeps template dependencies separate from PocketPress dependencies", async () => {
    site = await SiteFixture.create({
      "node_modules/marked/index.js": 'module.exports = "Site marked"',
      "index.html.ls": 'page: div (p require "marked"), (markdown "**Real parser**")',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html"))
      .toBe("<!DOCTYPE html>\n<div><p>Site marked</p><p><strong>Real parser</strong></p>\n</div>")
  })

  it("rebuilds changed partials without consuming generated files", async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: include "partial.ls"',
      "partial.ls": 'p "Before"',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html")).toContain("<p>Before</p>")
    await SiteFixture.write(site, "partial.ls", 'p "After"')
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html")).toBe("<!DOCTYPE html>\n<p>After</p>")
  })

  it("leaves reload helpers out of production output", async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: div (live-reload!), (a {href: link-to "/posts/"}, "Posts")',
    })
    SiteFixture.assertSuccess(await SiteFixture.run(site))
    expect(await SiteFixture.read(site, "index.html"))
      .toBe('<!DOCTYPE html>\n<div><a href="/posts">Posts</a></div>')
    expect(await readdir(site.root)).not.toContain(".live-reload.js")
  })

  it.each([
    ["syntax error", "page: (", "Compile error"],
    ["missing include", 'page: include "missing.ls"', "Compile error"],
    ["missing loaded file", 'page: load-file "missing.txt"', "Compile error"],
    ["evaluation error", 'throw new Error "evaluation failed"', "Compile error"],
    ["render error", 'page: -> throw new Error "render failed"', "Runtime error"],
  ])("fails with a filename and diagnostic for %s", async (_name, source, diagnostic) => {
    site = await SiteFixture.create({ "broken.html.ls": source })
    const result = await SiteFixture.run(site)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain(diagnostic)
    expect(result.stderr).toContain("broken.html.ls")
    expect(await readdir(site.root)).not.toContain("broken.html")
  })

  it("fails on malformed package metadata", async () => {
    site = await SiteFixture.create({ "package.json": "{" })
    const result = await SiteFixture.run(site)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("SyntaxError")
  })

  it("fails when the source directory does not exist", async () => {
    site = await SiteFixture.create()
    const result = await SiteFixture.run(site, [join(site.root, "missing")])
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("ENOENT")
    expect(result.stderr).toContain("missing")
  })

  it("reports output write errors", async () => {
    site = await SiteFixture.create({ "index.html.ls": 'page: p "Cannot write"' })
    await mkdir(join(site.root, "index.html"))
    const result = await SiteFixture.run(site)
    expect(result.code).toBe(1)
    expect(result.stderr).toContain("EISDIR")
    expect(result.stderr).toContain("index.html")
  })

  describe("regressions", () => {
    it("builds without the optional package.json", async () => {
      site = await SiteFixture.create({ "index.html.ls": 'page: p "No config"' })
      await rm(join(site.root, "package.json"))
      const result = await SiteFixture.run(site)
      expect(result.stderr).toBe("")
      expect(result.code).toBe(0)
      expect(await SiteFixture.read(site, "index.html")).toBe("<!DOCTYPE html>\n<p>No config</p>")
    })

    it("creates a missing output directory tree", async () => {
      site = await SiteFixture.create({
        "posts/index.html.ls": 'page: p "Nested"',
        "posts/other.html.ls": 'page: p "Same directory"',
        "assets/theme.css.ls": 'stylesheet rule "body", color "red"',
      })
      const output = join(site.directory, "new-output")
      const result = await SiteFixture.run(site, ["--output", output])
      expect(result.stderr).toBe("")
      expect(result.code).toBe(0)
      expect(await readFile(join(output, "posts/index.html"), "utf8")).toContain("Nested")
      expect(await readFile(join(output, "posts/other.html"), "utf8")).toContain("Same directory")
      expect(await readFile(join(output, "assets/theme.css"), "utf8")).toBe("body{color:red}")
    })

    it("keeps the first field in an unbraced multiline metadata object", async () => {
      site = await SiteFixture.create({
        "index.html.ls": 'title: "Expected title"\npage: (meta) -> h1 meta.title',
      })
      SiteFixture.assertSuccess(await SiteFixture.run(site))
      expect(await SiteFixture.read(site, "index.html"))
        .toBe("<!DOCTYPE html>\n<h1>Expected title</h1>")
    })

    it("sorts feeds and neighbors across month and year boundaries", async () => {
      site = await SiteFixture.create({
        "package.json": JSON.stringify({ pocket: { baseUrl: "https://example.test" } }),
        "older.html.ls": '{title: "Older", date: "2022-12-31", page: (meta) -> p meta.next?.title}',
        "middle.html.ls": '{title: "Middle", date: "2023-01-20", page: (meta) -> p meta.next?.title}',
        "newest.html.ls": '{title: "Newest", date: "2023-02-01", page: (meta) -> p meta.previous?.title}',
      })
      SiteFixture.assertSuccess(await SiteFixture.run(site))
      const feed = JSON.parse(await SiteFixture.read(site, "feed.json"))
      expect(feed.items.map((entry: { title: string }) => entry.title)).toEqual(["Newest", "Middle", "Older"])
      expect(await SiteFixture.read(site, "older.html")).toContain("<p>Middle</p>")
      expect(await SiteFixture.read(site, "middle.html")).toContain("<p>Newest</p>")
      expect(await SiteFixture.read(site, "newest.html")).toContain("<p>Middle</p>")
    })

    it("sorts entries on the same day by full publication timestamp", async () => {
      site = await SiteFixture.create({
        "package.json": JSON.stringify({ pocket: { baseUrl: "https://example.test" } }),
        "earlier.html.ls": '{title: "Earlier", date: "2023-01-01T10:00:00+02:00", page: (meta) -> p meta.next?.title}',
        "later.html.ls": '{title: "Later", date: "2023-01-01T09:00:00Z", page: (meta) -> p meta.previous?.title}',
      })
      SiteFixture.assertSuccess(await SiteFixture.run(site))
      const feed = JSON.parse(await SiteFixture.read(site, "feed.json"))
      expect(feed.items.map((entry: { title: string }) => entry.title)).toEqual(["Later", "Earlier"])
      expect(await SiteFixture.read(site, "earlier.html")).toContain("<p>Later</p>")
      expect(await SiteFixture.read(site, "later.html")).toContain("<p>Earlier</p>")
      expect(await SiteFixture.read(site, "feed.xml")).toContain("<updated>2023-01-01T09:00:00.000Z</updated>")
    })
  })
})
