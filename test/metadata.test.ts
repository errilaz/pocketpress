import { describe, expect, it } from "vitest"
import { buildFeedJson, buildFeedXml, buildRobotsTxt, buildSitemapXml } from "../src/metadata"
import { SiteBuild, SiteConfig, SiteDetails, Template } from "../src/model"

const build: SiteBuild = { root: "/site", output: "/output", watch: false, templates: [] }
const config: SiteConfig = { baseUrl: "https://example.test" }

describe("site metadata", () => {
  it("creates an empty sitemap envelope", () => {
    const output = buildSitemapXml(build, details([]), config)
    expect(output).toContain('<?xml version="1.0" encoding="utf-8"?>')
    expect(output).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(output).not.toContain("<url>")
    expect(output.trimEnd()).toMatch(/<\/urlset>$/)
  })

  it("includes only sitemap opt-ins and trims index filenames", () => {
    const output = buildSitemapXml(build, details([
      article({ url: "/index.html", map: true }),
      article({ url: "/posts/index.html", map: true }),
      article({ url: "/posts/entry.html", map: true }),
      article({ url: "/hidden.html", map: false }),
      article({ url: "/unlisted.html" }),
    ]), config)
    expect([...output.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])).toEqual([
      "https://example.test/", "https://example.test/posts/", "https://example.test/posts/entry.html",
    ])
  })

  it("writes a robots policy pointing to the sitemap", () => {
    expect(buildRobotsTxt(build, details([]), config))
      .toBe("User-agent: *\nSitemap: https://example.test/sitemap.xml\n")
  })

  it("uses JSON Feed defaults when title, language, and summary are absent", () => {
    const feed = JSON.parse(buildFeedJson(build, [article()], config))
    expect(feed.title).toBe(config.baseUrl)
    expect(feed.language).toBe("en-US")
    expect(feed.items[0]).not.toHaveProperty("summary")
    expect(feed.items[0].content_text).toBe("")
  })

  it("supports an empty JSON Feed", () => {
    expect(JSON.parse(buildFeedJson(build, [], config)).items).toEqual([])
  })

  it("uses configured JSON Feed title and language", () => {
    const feed = JSON.parse(buildFeedJson(build, [article()], { ...config, title: "Journal", language: "de" }))
    expect(feed.title).toBe("Journal")
    expect(feed.language).toBe("de")
  })

  it("normalizes JSON Feed index URLs and publication timestamps", () => {
    const feed = JSON.parse(buildFeedJson(build, [article({
      url: "/posts/index.html", date: new Date("2023-01-02T03:04:05+02:00"),
    })], config))
    expect(feed.items[0]).toMatchObject({
      id: "https://example.test/posts/", url: "https://example.test/posts/",
      date_published: "2023-01-02T01:04:05.000Z",
    })
  })

  it("round-trips quotes, newlines, Unicode, and tags in JSON Feed", () => {
    const entry = article({ title: 'A "quoted" café', summary: "First\nSecond <line>", tags: ["日本語", "code"] })
    const feed = JSON.parse(buildFeedJson(build, [entry], config))
    expect(feed.items[0]).toMatchObject({
      title: entry.title, summary: entry.summary, content_text: entry.summary, tags: entry.tags,
    })
  })

  it("preserves supplied feed entry order without mutating entries", () => {
    const entries = [article({ title: "First" }), article({ title: "Second" })]
    const before = JSON.stringify(entries)
    const json = JSON.parse(buildFeedJson(build, entries, config))
    const xml = buildFeedXml(build, entries, config)
    expect(json.items.map((entry: { title: string }) => entry.title)).toEqual(["First", "Second"])
    expect(xml.indexOf("<title>First</title>")).toBeLessThan(xml.indexOf("<title>Second</title>"))
    expect(JSON.stringify(entries)).toBe(before)
  })

  it("uses the base URL and Unknown author as Atom fallbacks", () => {
    const feed = buildFeedXml(build, [article()], config)
    expect(feed).toContain("<title>https://example.test</title>")
    expect(feed).toContain("<author><name>Unknown</name></author>")
  })

  it("escapes Atom titles and summaries", () => {
    const feed = buildFeedXml(build, [article({ title: "<Entry>", summary: 'A & "B"' })], {
      ...config, title: "Research & Notes",
    })
    expect(feed).toContain("<title>Research &amp; Notes</title>")
    expect(feed).toContain("<title>&lt;Entry&gt;</title>")
    expect(feed).toContain("<summary>A &amp; &quot;B&quot;</summary>")
  })

  it("escapes Atom embedded HTML and includes a read-more link", () => {
    const feed = buildFeedXml(build, [article({ summary: "Hello" })], config)
    expect(feed).toContain('<content type="html">')
    expect(feed).toContain('Hello&lt;br&gt;&lt;br&gt;&lt;a href=&quot;https://example.test/entry.html&quot;&gt;Read more&lt;/a&gt;')
  })

  it("uses the first supplied entry for the Atom feed update time", () => {
    const feed = buildFeedXml(build, [article({ date: new Date("2023-04-05T00:00:00Z") })], config)
    expect(feed.match(/<updated>(.*?)<\/updated>/)?.[1]).toBe("2023-04-05T00:00:00.000Z")
    expect(feed).toContain('<link href="https://example.test/feed.xml" rel="self" />')
  })

  it("trims index filenames in Atom links", () => {
    const feed = buildFeedXml(build, [article({ url: "/posts/index.html" })], config)
    expect(feed).toContain("<link>https://example.test/posts/</link>")
  })

  describe("regressions", () => {
    it("escapes author names in Atom XML", () => {
      const feed = buildFeedXml(build, [article({ author: "Alice & Bob <Team>" })], config)
      expect(feed).toContain("<author><name>Alice &amp; Bob &lt;Team&gt;</name></author>")
    })

    it("escapes sitemap URLs containing ampersands", () => {
      const sitemap = buildSitemapXml(build, details([article({ map: true, url: "/a&b.html" })]), config)
      expect(sitemap).toContain("<loc>https://example.test/a&amp;b.html</loc>")
    })

    it("escapes the configured base URL in sitemap locations", () => {
      const sitemap = buildSitemapXml(build, details([article({ map: true, url: "/index.html" })]), {
        baseUrl: "https://example.test/research&notes",
      })
      expect(sitemap).toContain("<loc>https://example.test/research&amp;notes/</loc>")
    })
  })
})

function article(overrides: Partial<Template> = {}): Template {
  return {
    type: "template", path: "/site/entry.html.ls", url: "/entry.html",
    date: new Date("2023-01-01T00:00:00Z"), ...overrides,
  }
}

function details(templates: Template[]): SiteDetails {
  return { templates, documents: [], stylesheets: [], authors: [], tags: [] }
}
