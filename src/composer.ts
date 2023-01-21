import tags from "html-tags"
import voids from "html-tags/void"
import { all as knownProperties } from "known-css-properties"
import { Markup } from "./markup"
import { writeFileSync as writeFile } from "fs"
import { print } from "./print"
import { Article, SiteBuild, Template } from "./model"

const doctype = "<!DOCTYPE html>"

process.on("message", (site: SiteBuild) => compose(site))

/** Receives build configuration from `build.ts` and runs the templates, producing markup. */
function compose(site: SiteBuild) {
  defineGlobals()
  const articles = compileAll(site)
  for (const article of articles) {
    try {
      const target = article.path.substring(0, article.path.length - 3)
      if (article.type === "document") {
        writeFile(target, print(article.content, true), "utf8")
        continue
      }
      const page = typeof article.page === "function"
        ? article.page({ ...article, site, articles }) 
        : article.page
      const markup = print(page)
      const output = `${doctype}\n${markup}`
      writeFile(target, output, "utf8")
    }
    catch (e) {
      report("Runtime", site, article.path, e)
    }
  }

  if (site.watch) {
    process.send!("done")
  }
  else {
    process.exit(0)
  }
}

function compileAll(site: SiteBuild) {
  const articles: Article[] = []
  for (const path of site.templates) {
    try {
      const url = path.substring(site.root.length, path.length - 3)
      const template = Markup.template(path, site)
      const result = template()
      if (path.endsWith(".html.ls")) {
        articles.push({ type: "template", path, url, ...result })
      }
      else {
        articles.push({ type: "document", path, url, content: result })
      }
    }
    catch (e) {
      report("Compile", site, path, e)
    }
  }
  return articles
}

/** Print error. */
function report(context: string, site: SiteBuild, path: string, e: any) {
  if (!(e instanceof Error)) {
    console.error(`${context} error in ${path.substring(site.root.length)}:`, e)
    return
  }
  console.error(`${context} error in "${path.substring(site.root.length)}":`, e.message)
  if (!site.watch) {
    process.exit(1)
  }
}

/** Clashes with LS/JS names. */
const reserved = ["var", "continue"]

/** Disable epub properties (for now). */
const properties = knownProperties.filter(p => !p.startsWith("epub"))

/** Creates global variables for functions to create HTML elements and CSS properties. */
function defineGlobals() {
  const top = global as any
  top.raw = Markup.raw
  top.prop = Markup.prop
  top.elem = Markup.elem
  top.rule = Markup.rule
  top.media = Markup.media
  top.markdown = Markup.markdown
  top.livescript = Markup.livescript
  top.document = Markup.document

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