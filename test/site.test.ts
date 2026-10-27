import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { readdir } from "fs/promises"
import { join } from "path"
import { SiteFixture } from "./support/SiteFixture"

describe("complete site", () => {
  let site: SiteFixture

  beforeAll(async () => {
    site = await SiteFixture.load("site")
    SiteFixture.assertSuccess(await SiteFixture.run(site))
  }, 15000)

  afterAll(async () => {
    if (site) await SiteFixture.remove(site)
  })

  it("renders a layout with its relative partial", async () => {
    expect(await SiteFixture.read(site, "index.html")).toBe(
      '<!DOCTYPE html>\n<html><head><title>Home</title></head><body><header>Fixture Journal</header><main><h1>Welcome</h1></main><p class="shared-note">Shared note</p></body></html>',
    )
  })

  it("renders nested templates with root-relative layouts", async () => {
    const output = await SiteFixture.read(site, "posts/first.html")
    expect(output).toContain("<title>First entry</title>")
    expect(output).toContain('<p class="shared-note">Shared note</p>')
    expect(output).toContain('"url":"/posts/first.html"')
    expect(output).toContain('"date":"2023-01-10T00:00:00.000Z"')
  })

  it("connects dated entries in chronological order", async () => {
    const first = await SiteFixture.read(site, "posts/first.html")
    const second = await SiteFixture.read(site, "posts/second.html")
    expect(first).toContain('"next":"Second entry"')
    expect(first).not.toContain('"previous"')
    expect(second).toContain('"previous":"First entry"')
    expect(second).not.toContain('"next"')
  })

  it("excludes feed-disabled entries from dated navigation", async () => {
    expect(await SiteFixture.read(site, "posts/hidden.html")).toBe("<!DOCTYPE html>\n<pre>{}</pre>")
  })

  it("renders standalone CSS with nested selector products and media queries", async () => {
    expect(await SiteFixture.read(site, "style.css")).toBe(
      "body{color:black;--accent:purple}a,button{color:purple}a:hover,a:focus{color:red}button:hover,button:focus{color:red}@media (min-width: 600px){body{margin:0}}",
    )
  })

  it("renders Markdown with embedded HTML and no doctype", async () => {
    expect(await SiteFixture.read(site, "README.md")).toBe(
      "\n\n# Fixture Journal\n\n<table><tbody><tr><td>Feature</td><td>Status</td></tr></tbody></table>\n\nGenerated with PocketPress.",
    )
  })

  it("exposes templates, documents, and stylesheets in separate site lists", async () => {
    const details = JSON.parse((await SiteFixture.read(site, "inspect.html")).replace("<!DOCTYPE html>\n", ""))
    expect(details.templates.map((entry: { url: string }) => entry.url).sort()).toEqual([
      "/index.html", "/inspect.html", "/notes.html", "/posts/first.html", "/posts/hidden.html", "/posts/second.html",
    ])
    expect(details.documents.map((entry: { url: string }) => entry.url)).toEqual(["/README.md"])
    expect(details.stylesheets.map((entry: { url: string }) => entry.url)).toEqual(["/style.css"])
  })

  it("groups authors and tags with the most-used groups first", async () => {
    const details = JSON.parse((await SiteFixture.read(site, "inspect.html")).replace("<!DOCTYPE html>\n", ""))
    expect(details.authors.map((author: { name: string, templates: unknown[] }) => [author.name, author.templates.length]))
      .toEqual([["Alice", 2], ["Bob", 1]])
    expect(details.tags[0].name).toBe("shared")
    expect(details.tags[0].templates.map((entry: { title: string }) => entry.title).sort())
      .toEqual(["First entry", "Second entry"])
  })

  it.each([
    ["code", ["First entry"], ["Second entry", "Unlisted entry", "Undated notes"]],
    ["shared", ["First entry", "Second entry"], ["Unlisted entry", "Undated notes"]],
    ["private", ["Unlisted entry"], ["First entry", "Second entry", "Undated notes"]],
  ])("generates the %s tag page with only matching articles", async (tag, included, excluded) => {
    const output = await SiteFixture.read(site, `${tag}.html`)
    expect(output).toContain(`<h1>${tag}</h1><p>/${tag}.html</p>`)
    for (const title of included) expect(output).toContain(`>${title}</a>`)
    for (const title of excluded) expect(output).not.toContain(title)
  })

  it("does not emit layouts, partials, or the literal tag template", async () => {
    const files = await readdir(site.root)
    expect(files).not.toContain("layout")
    expect(files).not.toContain("[tag].html")
    expect(await readdir(join(site.root, "partials"))).toEqual(["note.ls"])
  })

  it("writes a sitemap containing only opted-in pages", async () => {
    const sitemap = await SiteFixture.read(site, "sitemap.xml")
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]).sort()
    expect(locations).toEqual([
      "https://example.test/", "https://example.test/posts/first.html", "https://example.test/posts/second.html",
    ])
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(sitemap.trimEnd()).toMatch(/<\/urlset>$/)
  })

  it("points robots.txt at the configured sitemap", async () => {
    expect(await SiteFixture.read(site, "robots.txt"))
      .toBe("User-agent: *\nSitemap: https://example.test/sitemap.xml\n")
  })

  it("writes JSON Feed with site metadata and newest eligible entries first", async () => {
    const feed = JSON.parse(await SiteFixture.read(site, "feed.json"))
    expect(feed).toMatchObject({
      version: "https://jsonfeed.org/version/1.1",
      title: "Fixture Journal",
      language: "en-GB",
      home_page_url: "https://example.test",
      feed_url: "https://example.test/feed.json",
    })
    expect(feed.items).toEqual([
      {
        id: "https://example.test/posts/second.html", url: "https://example.test/posts/second.html",
        title: "Second entry", content_text: "Second summary", summary: "Second summary",
        date_published: "2023-01-20T00:00:00.000Z", tags: ["shared"],
      },
      {
        id: "https://example.test/posts/first.html", url: "https://example.test/posts/first.html",
        title: "First entry", content_text: "First summary", summary: "First summary",
        date_published: "2023-01-10T00:00:00.000Z", tags: ["code", "shared"],
      },
    ])
  })

  it("writes Atom entries with authors, summaries, dates, and absolute links", async () => {
    const feed = await SiteFixture.read(site, "feed.xml")
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
    expect(feed).toContain("<title>Fixture Journal</title>")
    expect(feed).toContain("<updated>2023-01-20T00:00:00.000Z</updated>")
    expect(feed.match(/<entry>/g)).toHaveLength(2)
    expect(feed).toContain("<summary>First summary</summary>")
    expect(feed).toContain("<author><name>Alice</name></author>")
    expect(feed).toContain("<link>https://example.test/posts/first.html</link>")
    expect(feed.indexOf("<title>Second entry</title>")).toBeLessThan(feed.indexOf("<title>First entry</title>"))
    expect(feed).not.toContain("Unlisted entry")
    expect(feed).not.toContain("Undated notes")
    expect(feed.trimEnd()).toMatch(/<\/feed>$/)
  })
})
