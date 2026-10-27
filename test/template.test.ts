import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { join } from "path"
import { createTemplate } from "../src/createTemplate"
import { SiteBuild } from "../src/model"
import { print } from "../src/print"
import { SiteFixture } from "./support/SiteFixture"

describe("template execution", () => {
  let site: SiteFixture

  beforeEach(async () => {
    site = await SiteFixture.create()
  })

  afterEach(async () => {
    if (site) await SiteFixture.remove(site)
  })

  it.each(["", " ", "\n\t\n"])("evaluates empty template %j as empty content", async source => {
    await SiteFixture.write(site, "empty.ls", source)
    expect(createTemplate(join(site.root, "empty.ls"), buildFor(site))()).toBe("")
  })

  it("returns the last expression after local computation", async () => {
    await SiteFixture.write(site, "value.ls", "answer = 6 * 7\nanswer")
    expect(createTemplate(join(site.root, "value.ls"), buildFor(site))()).toBe(42)
  })

  it("returns metadata and a page function without invoking it", async () => {
    await SiteFixture.write(site, "index.html.ls", '{title: "Heading", page: (meta) -> h1 meta.title}')
    const result = createTemplate(join(site.root, "index.html.ls"), buildFor(site))()
    expect(result.title).toBe("Heading")
    expect(result.page).toBeTypeOf("function")
    expect(print(result.page({ title: "Provided title" }))).toBe("<h1>Provided title</h1>")
  })

  it.each([
    ["without a final newline", 'title: "Heading"\npage: (meta) -> h1 meta.title'],
    ["with a final newline", 'title: "Heading"\npage: (meta) -> h1 meta.title\n'],
    ["with a trailing comment", 'title: "Heading"\npage: (meta) -> h1 meta.title # comment'],
    ["with a leading comment", '# comment\ntitle: "Heading"\npage: (meta) -> h1 meta.title'],
  ])("preserves unbraced metadata %s", async (_name, source) => {
    await SiteFixture.write(site, "index.html.ls", source)
    const result = createTemplate(join(site.root, "index.html.ls"), buildFor(site))()
    expect(result.title).toBe("Heading")
    expect(print(result.page(result))).toBe("<h1>Heading</h1>")
  })

  it("creates a fresh evaluation scope each time a compiled template runs", async () => {
    await SiteFixture.write(site, "counter.ls", "count = 0\n-> ++count")
    const template = createTemplate(join(site.root, "counter.ls"), buildFor(site))
    const first = template()
    expect(first()).toBe(1)
    expect(first()).toBe(2)
    expect(template()()).toBe(1)
  })

  it("exposes generated HTML elements, CSS properties, and class sugar", async () => {
    await SiteFixture.write(site, "markup.ls", 'div.red-bold (color "red"), (font-weight "bold"), (input {type: "checkbox"}), "Text"')
    expect(print(createTemplate(join(site.root, "markup.ls"), buildFor(site))()))
      .toBe('<div class="red-bold" style="color: red;font-weight: bold"><input type="checkbox">Text</div>')
  })

  it("exposes reserved-name aliases and vendor properties", async () => {
    await SiteFixture.write(site, "markup.ls", '_var (webkit-user-select "none"), "value"')
    expect(print(createTemplate(join(site.root, "markup.ls"), buildFor(site))()))
      .toBe('<var style="-webkit-user-select: none">value</var>')
  })

  it("exposes custom element, property, and raw helpers", async () => {
    await SiteFixture.write(site, "markup.ls", 'elem "my-widget", (prop "--accent", "red"), (raw "<b>raw</b>")')
    expect(print(createTemplate(join(site.root, "markup.ls"), buildFor(site))()))
      .toBe('<my-widget style="--accent: red"><b>raw</b></my-widget>')
  })

  it("exposes Markdown and CSS quote helpers", async () => {
    await SiteFixture.write(site, "markup.ls", 'div (markdown "**bold**"), (quote "Example")')
    expect(print(createTemplate(join(site.root, "markup.ls"), buildFor(site))()))
      .toBe("<div><p><strong>bold</strong></p>\n&quot;Example&quot;</div>")
  })

  it("returns callable layouts from include", async () => {
    await SiteFixture.write(site, "layout.ls", '(heading, content) -> div (h1 heading), content')
    await SiteFixture.write(site, "index.html.ls", 'layout = include "layout.ls"\npage: layout "Title", p "Body"')
    const result = createTemplate(join(site.root, "index.html.ls"), buildFor(site))()
    expect(print(result.page)).toBe("<div><h1>Title</h1><p>Body</p></div>")
  })

  it("binds load-file to each included file's directory", async () => {
    await SiteFixture.write(site, "message.txt", "Wrong directory")
    await SiteFixture.write(site, "parts/message.txt", "Correct directory")
    await SiteFixture.write(site, "parts/partial.ls", 'p load-file "message.txt"')
    await SiteFixture.write(site, "index.html.ls", 'page: include "parts/partial.ls"')
    expect(print(createTemplate(join(site.root, "index.html.ls"), buildFor(site))().page))
      .toBe("<p>Correct directory</p>")
  })

  it("rereads included sources when a compiled parent runs again", async () => {
    await SiteFixture.write(site, "partial.ls", 'p "Before"')
    await SiteFixture.write(site, "index.html.ls", 'page: include "partial.ls"')
    const template = createTemplate(join(site.root, "index.html.ls"), buildFor(site))
    expect(print(template().page)).toBe("<p>Before</p>")
    await SiteFixture.write(site, "partial.ls", 'p "After"')
    expect(print(template().page)).toBe("<p>After</p>")
  })

  it("uses the build output directory for watch-mode links", async () => {
    await SiteFixture.write(site, "link.ls", 'a {href: link-to "/posts/"}, "Posts"')
    const build = { ...buildFor(site), watch: true }
    expect(print(createTemplate(join(site.root, "link.ls"), build)()))
      .toBe(`<a href="${site.output}/posts/index.html">Posts</a>`)
  })

  it("throws syntax errors during compilation", async () => {
    await SiteFixture.write(site, "broken.ls", "(")
    expect(() => createTemplate(join(site.root, "broken.ls"), buildFor(site))).toThrow()
  })

  it("defers evaluation errors until the compiled template runs", async () => {
    await SiteFixture.write(site, "broken.ls", 'throw new Error "template failed"')
    const template = createTemplate(join(site.root, "broken.ls"), buildFor(site))
    expect(template).toThrow("template failed")
  })

  it("reports missing template files", () => {
    expect(() => createTemplate(join(site.root, "missing.ls"), buildFor(site))).toThrow(/ENOENT/)
  })
})

function buildFor(site: SiteFixture): SiteBuild {
  return { root: site.root, output: site.output, watch: false, templates: [] }
}
