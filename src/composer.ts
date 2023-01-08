import tags from "html-tags"
import voids from "html-tags/void"
import { all as knownProperties } from "known-css-properties"
import Markup from "./markup"
import { writeFileSync as writeFile } from "fs"
import { print } from "./print"
import { SiteBuild } from "./model"

const doctype = "<!DOCTYPE html>"

process.on("message", (site: SiteBuild) => compose(site))

function compose(site: SiteBuild) {
  defineGlobals()
  for (const path of site.templates) {
    const template = Markup.template(path, site.root)
    const result = template()
    const markup = print(result.page)
    const output = `${doctype}\n${markup}`
    const target = path.substring(0, path.length - 3)
    writeFile(target, output, "utf8")
  }
  process.exit(0)
}

const reserved = ["var", "continue"]
const properties = knownProperties.filter(p => !p.startsWith("epub"))

function defineGlobals() {
  const top = global as any
  top.rule = Markup.rule
  top.raw = Markup.raw
  top.markdown = Markup.markdown
  top.includeFrom = Markup.includeFrom
  top.loadFileFrom = Markup.loadFileFrom

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

function propertyName(property: string) {
  switch (true) {
    case reserved.includes(property):
      return `_${property}`
    case property.startsWith("-"):
      return property.substring(1)
  }
  return property
}

function camelize(kebab: string) {
  return kebab.replace(/-[a-z]/g, ([, c]) => c.toUpperCase());
}