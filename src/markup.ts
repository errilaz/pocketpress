/// <reference path="./types.d.ts" />
import { resolve, dirname, join } from "path"
import { marked } from "marked"
import { readFileSync as readFile } from "fs"
import { Element, MediaQuery, Property, Raw, Rule, SiteBuild } from "./model"
import { compile, CompileOptions } from "livescript"
import { run } from "./run"

/** Functions for the template DSL. */
export module Markup {
  /** Compile a template and return a function which runs it. */
  export function template(path: string, site: SiteBuild) {
    const contents = readFile(path, "utf8")
    const ls = `return (${contents})`
    const js = compile(ls, { header: false, filename: path })
    return () => run(js, path, site)
  }

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

  /** Custom property helper. */
  export function prop(name: string, value: any) {
    return new Property(name, value)
  }

  /** Creates a media query. */
  export function media(query: string, ...rules: Rule[]) {
    return new MediaQuery(query, rules)
  }

  /** Factory for `include` functions. */
  export function includeFrom(context: string, site: SiteBuild) {
    return function include(file: string) {
      const path = siteResolve(context, file, site.root)
      return template(path, site)()
    }
  }

  /** Creates an instance of Raw. */
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

  export function liveReloadFrom(root: string, enable: boolean) {
    if (!enable) return () => false
    const src = "file://" + join(root, ".live-reload.js")
    return () => new Raw(`
      <script>window.LIVE_RELOAD_SRC = "${src}"</script>
      <script src="${src}"></script>
    `)
  }

  export function livescript(code: string): Element;
  export function livescript(options: CompileOptions, code: string): Element;
  export function livescript(options: CompileOptions | string, code?: string): Element {
    if (code === undefined) {
      code = options as string
      options = {}
    }
    options = { header: false, ...options as CompileOptions } 
    return new Element("script", false, [raw(compile(code, options))])
  }
}

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
