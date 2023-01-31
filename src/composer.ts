import tags from "html-tags"
import voids from "html-tags/void"
import { all as properties } from "known-css-properties"
import { Markup } from "./markup"
import { writeFileSync, mkdirSync, accessSync, constants, readFileSync } from "fs"
import { print } from "./print"
import { Article, Document, SiteBuild, SiteConfig, SiteDetails, Stylesheet, Template } from "./model"
import { dirname, join } from "path"
import { buildFeedJson, buildFeedXml, buildRobotsTxt, buildSitemapXml } from "./metadata"

const doctype = "<!DOCTYPE html>"

/** Clashes with LS/JS names. */
const reserved = ["var", "continue"]
defineGlobals()

process.on("message", (site: SiteBuild) => compose(site))

/** Receives build configuration from `build.ts` and runs the templates, producing markup. */
function compose(build: SiteBuild) {
  const [articles, tagTemplate] = compileArticles(build)
  const site: SiteDetails = {
    templates: articles.filter(a => a.type === "template") as Template[],
    documents: articles.filter(a => a.type === "document") as Document[],
    stylesheets: articles.filter(a => a.type === "stylesheet") as Stylesheet[],
    ...buildDetails(articles)
  }
  const entries = site.templates
    .filter(t => !!t.date && t.feed !== false)
    .sort((a, b) => b.date!.getDate()! - a.date!.getDate())
  if (tagTemplate) {
    articles.push(...compileTagArticles(tagTemplate, build, site))
  }
  for (const article of articles) {
    try {
      const target = join(build.output, article.path.substring(build.root.length, article.path.length - 3))
      if (article.type !== "template") {
        writeFile(target, print(article.content))
        continue
      }
      const meta: any = { ...article, site }
      const index = entries.findIndex(e => e.path === article.path)
      if (index !== -1) {
        meta.next = entries[index - 1]
        meta.previous = entries[index + 1]
      }
      const page = typeof article.page === "function"
        ? article.page(meta) 
        : article.page
      const markup = print(page)
      const output = `${doctype}\n${markup}`
      writeFile(target, output)
    }
    catch (e) {
      report("Runtime", build, article.path, e)
    }
  }

  writeSiteMetadata(build, site, entries)

  if (build.watch) {
    process.send!("done")
  }
  else {
    process.exit(0)
  }
}

function writeSiteMetadata(build: SiteBuild, site: SiteDetails, entries: Template[]) {
  const packageJson = join(build.root, "package.json")
  if (!exists(packageJson)) return
  const config = JSON.parse(readFile(packageJson))?.pocket as SiteConfig
  if (!config || !config.baseUrl) return

  writeFile(join(build.output, "sitemap.xml"), buildSitemapXml(build, site, config))
  writeFile(join(build.output, "robots.txt"), buildRobotsTxt(build, site, config))

  if (entries.length > 0) {
    writeFile(join(build.output, "feed.xml"), buildFeedXml(build, entries, config))
    writeFile(join(build.output, "feed.json"), buildFeedJson(build, entries, config))
  }
}

function compileArticles(build: SiteBuild): [Article[], string | null] {
  const articles: Article[] = []
  let tagTemplate = null
  for (const path of build.templates) {
    try {
      if (path.endsWith("[tag].html.ls")) {
        tagTemplate = path
        continue
      }
      const url = path.substring(build.root.length, path.length - 3)
      const template = Markup.template(path, build)
      const result = template()
      if (path.endsWith(".html.ls")) {
        if (result.date) {
          result.date = new Date(result.date)
        }
        articles.push({ type: "template", path, url, ...result })
      }
      else if (path.endsWith(".css.ls")) {
        articles.push({ type: "stylesheet", path, url, content: result })
      }
      else if (path.endsWith(".md.ls")) {
        articles.push({ type: "document", path, url, content: result })
      }
    }
    catch (e) {
      report("Compile", build, path, e)
    }
  }
  return [articles, tagTemplate]
}

function compileTagArticles(tagTemplate: string, build: SiteBuild, site: SiteDetails) {
  const template = Markup.template(tagTemplate, build)
  return site.tags.map(tag => {
    try {
      const path = tagTemplate.replace("[tag]", tag.name)
      const url = path.substring(build.root.length, path.length - 3)
      const result = template()
      return { type: "template", path, url, tag, ...result }
    }
    catch (e) {
      report("Compile", build, tagTemplate, e)
    }
  })
}

/** Builds `tags` and `authors`. */
function buildDetails(articles: Article[]): Pick<SiteDetails, "tags" | "authors"> {
  const tags: { [name: string]: Article[] } = {}
  const authors: { [name: string]: Article[] } = {}
  for (const article of articles) {
    if (article.type !== "template") continue
    if (article.tags) {
      for (const tag of article.tags) {
        if (!tags[tag]) tags[tag] = []
        tags[tag].push(article)
      }
    }
    if (article.author) {
      if (!authors[article.author]) authors[article.author] = []
      authors[article.author].push(article)
    }
  }
  return {
    tags: Object.keys(tags)
      .map(name => ({ name, templates: tags[name] }))
      .sort((a, b) => b.templates.length - a.templates.length),
    authors: Object.keys(authors)
      .map(name => ({ name, templates: authors[name] }))
      .sort((a, b) => b.templates.length - a.templates.length),
  }
}

/** Print error. */
function report(context: string, build: SiteBuild, path: string, e: any) {
  if (!(e instanceof Error)) {
    console.error(`${context} error in ${path.substring(build.root.length)}:`, e)
    return
  }
  console.error(`${context} error in "${path.substring(build.root.length)}":`, e.message)
  if (!build.watch) {
    process.exit(1)
  }
}

/** Creates global variables for functions to create HTML elements and CSS properties. */
function defineGlobals() {
  const top = global as any
  top.raw = Markup.raw
  top.prop = Markup.prop
  top.elem = Markup.elem
  top.rule = Markup.rule
  top.markdown = Markup.markdown
  top.livescript = Markup.livescript
  top.document = Markup.document
  top.stylesheet = Markup.stylesheet
  top.quote = Markup.quote

  for (const tag of tags) {
    const isVoid = (voids as string[]).includes(tag)
    const name = reserved.includes(tag) ? `_${tag}` : tag
    top[name] = Markup.element(tag, isVoid)
  }

  for (const property of properties) {
    const name = camelize(propertyName(property))
    top[name] = Markup.property(property)
  }
}

/** Formats a property variable name. */
function propertyName(property: string) {
  switch (true) {
    case reserved.includes(property):
      return `_${property}`
    case property.startsWith("-"):
      return property.substring(1)
  }
  return property
}

/** Turn a kebab-case name into camelCase. */
function camelize(kebab: string) {
  return kebab.replace(/-[a-z]/g, ([, c]) => c.toUpperCase());
}

function exists(path: string) {
  try {
    accessSync(path, constants.F_OK)
    return true
  }
  catch { return false }
}

function writeFile(path: string, data: string) {
  const dir = dirname(path)
  if (!exists(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(path, data, "utf8")
}

function readFile(path: string) {
  return readFileSync(path, "utf8")
}