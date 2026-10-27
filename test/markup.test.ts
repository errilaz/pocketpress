import { describe, expect, it } from "vitest"
import { runInNewContext } from "vm"
import "../src/createTemplate"
import { Markup } from "../src/markup"
import { print } from "../src/print"

describe("markup helpers", () => {
  it("creates custom elements", () => {
    expect(print(Markup.elem("my-widget", { role: "status" }, "Ready")))
      .toBe('<my-widget role="status">Ready</my-widget>')
  })

  it("adds kebab-case classes through chained element proxies", () => {
    const element = Markup.element("div", false)
    expect(print(element.redBold.alsoItalic("Styled")))
      .toBe('<div class="red-bold also-italic">Styled</div>')
  })

  it("does not leak classes between calls or derived element factories", () => {
    const element = Markup.element("div", false)
    const notice = element.notice
    expect(print(notice("First"))).toBe('<div class="notice">First</div>')
    expect(print(notice.important("Second"))).toBe('<div class="notice important">Second</div>')
    expect(print(notice("Third"))).toBe('<div class="notice">Third</div>')
    expect(print(element("Plain"))).toBe("<div>Plain</div>")
  })

  it("combines proxy classes and attribute classes", () => {
    const element = Markup.element("div", false)
    expect(print(element.notice({ class: "extra" }, "Text")))
      .toBe('<div class="notice extra">Text</div>')
  })

  it("creates void elements without a closing tag or children", () => {
    expect(print(Markup.element("input", true)({ type: "text" }, "ignored")))
      .toBe('<input type="text">')
  })

  it("renders named property factories as inline styles", () => {
    const color = Markup.property("color")
    expect(print(Markup.elem("p", color("red"), "Text"))).toBe('<p style="color: red">Text</p>')
  })

  it("supports custom properties inside CSS rules", () => {
    expect(print(Markup.rule(":root", Markup.prop("--accent", "purple"))))
      .toBe(":root{--accent:purple}")
  })

  it("builds statement at-rules", () => {
    expect(print(Markup.atRule("import")('url("theme.css")'))).toBe('@import url("theme.css");')
  })

  it("builds block at-rules without a condition", () => {
    expect(print(Markup.atRule("font-face")(Markup.prop("font-family", "Example"))))
      .toBe("@font-face{font-family:Example}")
  })

  it("builds conditional at-rules containing CSS rules", () => {
    expect(print(Markup.atRule("media")("print", Markup.rule("body", Markup.prop("color", "black")))))
      .toBe("@media print{body{color:black}}")
  })

  it("passes multiple rules through a stylesheet", () => {
    expect(print(Markup.stylesheet(
      Markup.rule("p", Markup.prop("color", "red")),
      Markup.rule("a", Markup.prop("color", "blue")),
    ))).toBe("p{color:red}a{color:blue}")
  })

  it("parses embedded Markdown without escaping the generated HTML", () => {
    expect(print(Markup.markdown("**bold** and *italic*"))).toBe("<p><strong>bold</strong> and <em>italic</em></p>\n")
  })

  it("escapes text inside Markdown code spans", () => {
    expect(print(Markup.markdown("`<unsafe>`"))).toBe("<p><code>&lt;unsafe&gt;</code></p>\n")
  })

  it("combines raw Markdown and rendered HTML with document separators", () => {
    expect(print(Markup.document(Markup.raw("# Heading"), Markup.elem("p", "Text"))))
      .toBe("\n\n# Heading\n\n<p>Text</p>")
  })

  it("renders an empty document and stylesheet as empty strings", () => {
    expect(print(Markup.document())).toBe("")
    expect(print(Markup.stylesheet())).toBe("")
  })

  it.each([
    [null, ""], [undefined, ""], [0, "0"], [false, "false"], ["<b>raw</b>", "<b>raw</b>"],
  ])("converts raw content %s without HTML escaping", (value, expected) => {
    expect(print(Markup.raw(value))).toBe(expected)
  })

  it("quotes and escapes CSS strings", () => {
    expect(Markup.quote('a"b\\c')).toBe('"a\\"b\\\\c"')
    expect(Markup.quote("")).toBe('""')
  })

  it("compiles embedded LiveScript into executable, unescaped JavaScript", () => {
    const markup = print(Markup.livescript('globalThis.message = "<hello>"'))
    const script = markup.slice("<script>".length, -"</script>".length)
    const context: { message?: string } = {}
    runInNewContext(script, context)
    expect(context.message).toBe("<hello>")
    expect(markup).not.toContain("&lt;hello&gt;")
    expect(markup).toMatch(/^<script>[\s\S]*<\/script>$/)
  })

  it("accepts explicit compiler options for embedded LiveScript", () => {
    const markup = print(Markup.livescript({ bare: true }, "answer = 6 * 7"))
    const context: { answer?: number } = {}
    runInNewContext(markup.slice(8, -9), context)
    expect(context.answer).toBe(42)
  })

  it("reports invalid embedded LiveScript", () => {
    expect(() => Markup.livescript("(")).toThrow()
  })

  it.each([
    ["/", "/"], ["/posts/", "/posts"], ["/posts/index.html", "/posts/index.html"],
  ])("creates production links for %s", (input, expected) => {
    expect(Markup.linkToFrom("/output", false)(input)).toBe(expected)
  })

  it.each([
    ["/", "/output/index.html"], ["/posts/", "/output/posts/index.html"],
    ["/posts/entry.html", "/output/posts/entry.html"],
  ])("creates local preview links for %s", (input, expected) => {
    expect(Markup.linkToFrom("/output", true)(input)).toBe(expected)
  })

  it("omits reload markup when watch mode is disabled", () => {
    expect(print(Markup.liveReloadFrom("/site", false)())).toBe("")
  })

  it("embeds the site-root reload script when watch mode is enabled", () => {
    const markup = print(Markup.liveReloadFrom("/site", true)())
    expect(markup).toContain('window.LIVE_RELOAD_SRC = "file:///site/.live-reload.js"')
    expect(markup).toContain('<script src="file:///site/.live-reload.js"></script>')
  })
})
