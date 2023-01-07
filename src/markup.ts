/// <reference path="./livescript.d.ts" />
import { resolve, dirname } from "path"
import { marked } from "marked"
import { readFileSync as readFile } from "fs"
import { Element, Property, Raw, Rule } from "./model"
import { compile } from "livescript"

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
      return template(path)()
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

  export function template(path: string) {
    const contents = readFile(path, "utf8")
    const ls = `return (
include = include-from "${path}"
load-file = load-file-from "${path}"
${contents}
)
`
    const js = compile(ls, { header: false, filename: path })
    return () => eval(js)
  }
}

export default Markup

export function kebabize(camel: string) {
  return camel.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
}