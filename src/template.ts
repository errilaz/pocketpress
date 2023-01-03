import tags from "html-tags"
import voids from "html-tags/void"
import { all as knownProperties } from "known-css-properties"
import { readFileSync as readFile } from "fs"
import { compile } from "./compile"

const reserved = ["var", "continue"]

const properties = knownProperties.filter(p => !p.startsWith("epub"))
const library = buildLibrary()

export function template(path: string) {
  const include = `
include = Markup.includeFrom "${path}"
`
  const ls = library + include + readFile(path, "utf8")
  const js = compile(`return (${ls})`, path)
  return (function () { return eval(js) })()
}

function buildLibrary() {
  return `
Markup = (require "pocketpress/markup").default
rule = Markup.rule
${tags.map((tag: string) => {
  const isVoid = (voids as string[]).includes(tag)
  const name = reserved.includes(tag) ? `_${tag}` : tag
  return `${name} = Markup.element "${tag}", ${isVoid}`
}).join("\n")}

${properties.map(property => {
  const name = camelize(propertyName(property))
  return `${name} = Markup.property "${property}"`
}).join("\n")}
`
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