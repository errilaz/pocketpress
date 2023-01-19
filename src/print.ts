import escape from "escape-html"
import { Element, MediaQuery, Raw, Rule } from "./model"

/** State for `print`. */
interface Printer {
  text: string
  level: number
  compact: boolean
}

/** Pretty print HTML content. */
export function print(x: any, compact = false) {
  const printer = { text: "", level: 0, compact }
  printNode(x, printer)
  return printer.text
}

/** Add an artifact to the `Printer`. */
function printNode(x: any, p: Printer) {
  const type = typeof x
  switch (true) {
    case x === undefined || x === null || x === "" || x === false:
      break
    case type === "string":
    case type === "number":
    case type === "boolean":
    case type === "bigint":
      if (p.compact)
        p.text += escape(x)
      else 
        p.text += escape(x).replace(/\n/g, `${end(p)}${indent(p)}`)
      break
    case x instanceof Raw:
      if (p.compact)
        p.text += x.text
      else
        p.text += x.text.replace(/\n/g, `${end(p)}${indent(p)}`)
      break
    case Array.isArray(x):
      for (const e of x)
        printNode(e, p)
      break
    case x instanceof Element: {
      p.text += `<${x.tag}`
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
      p.text += `>${end(p)}`
      if (x.isVoid) {
        p.text += indent(p)
        break
      }
      p.level++
      p.text += indent(p)
      for (const child of x.children) {
        printNode(child, p)
      }
      p.level--
      p.text += `${end(p)}${indent(p)}`
      p.text += `</${x.tag}>${end(p)}${indent(p)}`
      break
    }
    case x instanceof Rule: {
      p.text += `${x.selector} {${end(p)}`
      p.level++
      p.text += Object.keys(x.properties)
        .map(key => `${indent(p)}${key}: ${x.properties[key]}`)
        .join(`;${end(p)}`)
      p.level--
      p.text += `${end(p)}${indent(p)}}${end(p)}${indent(p)}`
      break
    }
    case x instanceof MediaQuery: {
      p.text += `@media ${x.query} {${end(p)}`
      p.level++
      p.text += indent(p)
      for (const rule of x.rules) {
        printNode(rule, p)
      }
      p.level--
      p.text += `${end(p)}${indent(p)}}${end(p)}${indent(p)}`
      break
    }
  }
}

/** Returns necessary indentation spaces based on `Printer` state. */
function indent(p: Printer) {
  if (p.compact) return ""
  let s = ""
  for (let i = 0; i < p.level; i++) {
    s += "  "
  }
  return s
}

function end(p: Printer) {
  if (p.compact) return ""
  return "\n"
}