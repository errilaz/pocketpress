import { resolve, dirname } from "path"
import { template } from "./template"
import escape from "escape-html"
import { marked } from "marked"
import { readFileSync as readFile } from "fs"

export class Element {
  tag: string
  isVoid: boolean
  attributes: { [name: string]: string } = {}
  properties: { [name: string]: string } = {}
  children: any[] = []

  constructor(tag: string, isVoid: boolean, contents: any[]) {
    this.tag = tag
    this.isVoid = isVoid
    for (const content of contents) {
      this.add(content)
    }
  }

  add(content: any) {
    if (isEmpty(content)) return
    else if (isChild(content)) {
      this.children.push(content)
    }
    else if (content instanceof Property) {
      this.properties[content.name] = content.value
    }
    else if (Array.isArray(content)) {
      for (const element of content) {
        this.add(element)
      }
    }
    else if (typeof content === "object") {
      for (const key in content) {
        if (this.attributes[key]) {
          this.attributes[key] += " " + content[key].toString()
        }
        else {
          this.attributes[key] = content[key].toString()
        }
      }
    }
    else {
      this.children.push(escape(content.toString()))
    }
  }

  toString() {
    let output = `<${this.tag}`
    const attributes = Object.keys(this.attributes)
      .map(key => `${key}="${this.attributes[key]}"`)
      .join(" ")
    if (attributes.length > 0) output += " " + attributes
    const properties = Object.keys(this.properties)
      .map(key => `${key}: ${this.properties[key]}`)
      .join("; ")
    if (properties.length > 0) {
      output += ` style="${properties}"`
    }
    output += ">"
    if (this.isVoid) {
      return output
    }
    for (const child of this.children) {
      output += child.toString()
    }
    output += `</${this.tag}>`
    return output
  }
}

export class Property {
  name: string
  value: string

  constructor(name: string, value: any) {
    this.name = name
    this.value = value
  }
}

export class Rule {
  selector: string
  properties: { [name: string]: string } = {}

  constructor(selector: string, properties: Property[]) {
    this.selector = selector
    for (const property of properties) {
      this.add(property)
    }
  }

  add(property: Property) {
    this.properties[property.name] = property.value
  }

  toString() {
    let output = `${this.selector} { `
    output += Object.keys(this.properties)
      .map(key => `${key}: ${this.properties[key]}`)
      .join("; ")
    output += " } "
    return output
  }
}

export class Raw {
  text: string

  constructor(object: any) {
    this.text = object === null || object === undefined ? "" : object.toString()
  }

  toString() {
    return this.text
  }
}

module Markup {
  export function rule(selector: string, ...properties: Property[]) {
    return new Rule(selector, properties)
  }

  export function element(tag: string, isVoid: boolean) {
    return new Proxy(createElement, { get: withClass })

    function createElement(...contents: any[]): Element {
      return new Element(tag, isVoid, contents)
    }

    function withClass(obj: any, cssClass: string) {
      cssClass = kebabize(cssClass)
      const proxy = new Proxy(createElement.bind(null, { class: cssClass }), {
        get: withAnotherClass
      })
      Object.defineProperty(proxy, "_cssClass", {
        value: cssClass,
        enumerable: false
      })
      return proxy
    }

    function withAnotherClass(obj: any, cssClass: string): Element {
      cssClass = kebabize(cssClass)
      const classes = [obj._cssClass, cssClass].join(" ")
      const proxy = new Proxy(createElement.bind(null, { class: classes }), {
        get: withAnotherClass
      })
      Object.defineProperty(proxy, "_cssClass", {
        value: classes,
        enumerable: false
      })
      return proxy
    }
  }

  export function property(name: string) {
    return function property(value: any) {
      return new Property(name, value)
    }
  }

  export function includeFrom(context: string) {
    return function include(file: string) {
      const path = resolve(dirname(context), file)
      return template(path)
    }
  }

  export function raw(object: any) {
    return new Raw(object)
  }

  export function markdown(markdown: string) {
    return new Raw(marked.parse(markdown))
  }

  export function loadFileFrom(context: string) {
    return function loadFile(file: string) {
      const path = resolve(dirname(context), file)
      return readFile(path, "utf8")
    }
  }
}

export default Markup

function isEmpty(x: any) {
  return x === undefined
    || x === null
    || x === ""
    || x === false
}

function isChild(x: any) {
  return x === true
    || x instanceof Element
    || x instanceof Rule
    || x instanceof Raw
}

export function kebabize(camel: string) {
  return camel.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
}