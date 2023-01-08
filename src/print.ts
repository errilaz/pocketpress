import escape from "escape-html"
import { Element, Raw, Rule } from "./model"

interface Printer { text: string, level: number }

export function print(x: any) {
  const printer = { text: "", level: 0 }
  printNode(x, printer)
  return printer.text
}

function printNode(x: any, p: Printer) {
  const type = typeof x
  switch (true) {
    case x === undefined || x === null || x === "" || x === false:
      break
    case type === "string":
    case type === "number":
    case type === "boolean":
    case type === "bigint":
      p.text += escape(x)
      break
    case x instanceof Raw:
      p.text += x.text
      break
    case Array.isArray(x):
      for (const e of x)
        printNode(e, p)
      break
    case x instanceof Element: {
      p.text += `${indent(p)}<${x.tag}`
      const attributes = Object.keys(x.attributes)
        .map(key => `${key}="${x.attributes[key]}"`)
        .join(" ")
      if (attributes.length > 0) p.text += " " + attributes
      const properties = Object.keys(x.properties)
        .map(key => `${key}: ${x.properties[key]}`)
        .join("; ")
      if (properties.length > 0) {
        p.text += ` style="${properties}"`
      }
      p.text += ">\n"
      if (x.isVoid) {
        break
      }
      p.level++
      for (const child of x.children) {
        printNode(child, p)
      }
      p.level--
      p.text += `\n${indent(p)}</${x.tag}>\n`
      break
    }
    case x instanceof Rule: {
      p.text += `${indent(p)}${x.selector} {\n`
      p.level++
      p.text += Object.keys(x.properties)
        .map(key => `${indent(p)}${key}: ${x.properties[key]}`)
        .join(";\n")
      p.level--
      p.text += `\n${indent(p)}}\n`
      break
    }
  }
}

function indent(p: Printer) {
  let s = ""
  for (let i = 0; i < p.level; i++) {
    s += "  "
  }
  return s
}
