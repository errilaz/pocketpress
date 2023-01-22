import escapeHtml from "escape-html"
import { SiteBuild, SiteConfig, SiteDetails, Template } from "./model"

export function buildSitemapXml(build: SiteBuild, site: SiteDetails, config: SiteConfig) {
  const [head, tail] = siteMapEnvelope
  return `${head}${site.templates.filter(t => !!t.map).map(({ url }) => `  <url>
    <loc>${config.baseUrl}${trimIndex(url)}</loc>
  </url>`).join("\n")}${tail}`
}

export function buildRobotsTxt(build: SiteBuild, site: SiteDetails, config: SiteConfig) {
  return `User-agent: *
Sitemap: ${config.baseUrl}/sitemap.xml
`
}

export function buildFeedXml(build: SiteBuild, entries: Template[], config: SiteConfig) {
  const updated = entries[0].date!.toISOString()
  const head = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
	<title>${escapeHtml(config.title || config.baseUrl)}</title>
	<link href="${config.baseUrl}/feed.xml" rel="self" />
	<link href="${config.baseUrl}/" />
	<id>${config.baseUrl}</id>
	<updated>${updated}</updated>
  <generator uri="https://github.com/errilaz/pocketpress" version="1.0">
    PocketPress
  </generator>
`
  const tail = `
</feed>
`
  return `${head}${entries.map(({ url, title, summary, date }) => `  <entry>
    <id>${config.baseUrl}${url}</id>
    <title>${escapeHtml(title)}</title>
    <summary>${escapeHtml(summary)}</summary>
    <updated>${date!.toISOString()}</updated>
    <content>${config.baseUrl}${trimIndex(url)}</content>
  </entry>`).join("\n")}${tail}` 
}

export function buildFeedJson(build: SiteBuild, entries: Template[], config: SiteConfig) {
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: config.title || config.baseUrl,
    home_page_url: config.baseUrl,
    feed_url: config.baseUrl + "/feed.json",
    language: config.language || "en-US",
    items: entries.map(({ url, title, summary, date, tags }) => ({
      id: `${config.baseUrl}${trimIndex(url)}`,
      url: `${config.baseUrl}${trimIndex(url)}`,
      title,
      content_text: summary || "",
      summary,
      date_published: date!.toISOString(),
      tags,
    }))
  }, null, 2)
}

function trimIndex(url: string) {
  return url.replace(/index.html$/, "")
}

const siteMapEnvelope = [`<?xml version="1.0" encoding="utf-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
>
`, `
</urlset>
`]
