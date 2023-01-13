/// <reference path="./types.d.ts" />
import { resolve, dirname, join, relative } from "path"
import { marked } from "marked"
import { readFileSync as readFile } from "fs"
import { Element, Property, Raw, Rule } from "./model"
import { compile } from "livescript"

/** Functions for the template DSL. */
module Markup {
  /** Constructs a CSS rule. */
  export function rule(selector: string, ...properties: Property[]) {
    return new Rule(selector, properties)
  }

  /** Factory for Element instances with CSS class name proxies wrapping them. */
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

  /** Factory for Property-returning functions. */
  export function property(name: string) {
    return function property(value: any) {
      return new Property(name, value)
    }
  }

  /** Factory for `include` functions. */
  export function includeFrom(context: string, root: string) {
    return function include(file: string) {
      const path = siteResolve(context, file, root)
      return template(path, root)()
    }
  }

  /** Returns an instance of Raw. */
  export function raw(object: any) {
    return new Raw(object)
  }

  /** Parses markdown and returns a Raw containing the HTML. */
  export function markdown(markdown: string) {
    return new Raw(marked.parse(markdown))
  }

  /** Factory for `load-file` functions. */
  export function loadFileFrom(context: string, root: string) {
    return function loadFile(file: string) {
      const path = siteResolve(context, file, root)
      return readFile(path, "utf8")
    }
  }

  /** Compile a template and return a function which runs it. */
  export function template(path: string, root: string) {
    const contents = readFile(path, "utf8")
    const ls = `return (
include = include-from "${path}", "${root}"
load-file = load-file-from "${path}", "${root}"
live-reload = live-reload-from "${path}", "${root}"
${contents}
)
`
    const js = compile(ls, { header: false, filename: path })
    return () => eval(js)
  }

  export function liveReloadFrom(context: string, root: string) {
    const src = `${relative(context, root)}/.live-reload.js`
    return () => new Raw(`
      <script>window.LIVE_RELOAD_SRC = "${src}"</script>
      <script src="${src}"></script>
    `)
  }
}

export default Markup

/** Transform camelCase name into kebab-case. */
function kebabize(camel: string) {
  return camel.replace(/[A-Z]/g, c => "-" + c.toLowerCase());
}

/** Resolve root-relative and file-relative paths. */
function siteResolve(context: string, file: string, root: string) {
  if (file.startsWith("~/")) {
    return join(root, file.substring(2))
  }
  return resolve(dirname(context), file)
}