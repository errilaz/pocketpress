import { describe, it, expect } from "vitest"
import { AtRule, Element, Property, Raw, Rule } from "../src/model"
import { print } from "../src/print"

describe("print", () => {

  it("renders elements", () => {
    const output = print(new Element("div", false, [
      "hello"
    ]))

    expect(output).toBe("<div>hello</div>")
  })

  it("renders void elements", () => {
    const output = print(new Element("hr", true, []))

    expect(output).toBe("<hr>")
  })

  it("renders element attributes", () => {
    const output = print(new Element("div", false, [
      { class: "foo" },
      "hello"
    ]))

    expect(output).toBe(`<div class="foo">hello</div>`)
  })

  it("escapes literal content", () => {
    const output = print(new Element("div", false, [
      "<hello>"
    ]))

    expect(output).toBe("<div>&lt;hello&gt;</div>")
  })

  it("doesn't escape raw content", () => {
    const output = print(new Element("div", false, [
      new Raw("<hr>")
    ]))

    expect(output).toBe("<div><hr></div>")
  })

  it("renders compact rules", () => {
    const output = print(new Rule(".foo", [
      new Property("color", "red"),
      new Property("background", "blue")
    ]))

    expect(output).toBe(".foo{color:red;background:blue}")
  })

  it("renders nested rules", () => {
    const output = print(new Rule(".foo", [
      new Property("color", "red"),
      new Rule(".bar", [
        new Property("color", "blue")
      ])
    ]))

    expect(output).toBe(".foo{color:red}.foo .bar{color:blue}")
  })

  it("renders only nested rule when parent has no properties", () => {
    const output = print(new Rule(".foo", [
      new Rule(".bar", [
        new Property("color", "blue")
      ])
    ]))

    expect(output).toBe(".foo .bar{color:blue}")
  })

  it("renders combined nested rules", () => {
    const output = print(new Rule(".foo", [
      new Rule("&.bar", [
        new Property("color", "blue")
      ])
    ]))

    expect(output).toBe(".foo.bar{color:blue}")
  })

  it("renders nested rules with pseudo-classes", () => {
    const output = print(new Rule(".foo", [
      new Property("color", "red"),
      new Rule(":hover", [
        new Property("color", "blue")
      ])
    ]))

    expect(output).toBe(".foo{color:red}.foo:hover{color:blue}")
  })

  it("renders nested rules with multiple selectors in parent", () => {
    const output = print(new Rule(".foo, .bar", [
      new Property("color", "red"),
      new Rule(".baz", [
        new Property("color", "green")
      ])
    ]))

    expect(output).toBe(".foo,.bar{color:red}.foo .baz{color:green}.bar .baz{color:green}")
  })

  it("renders nested rules with multiple selectors in child", () => {
    const output = print(new Rule(".foo", [
      new Rule(".bar,.baz", [
        new Property("color", "purple")
      ])
    ]))

    expect(output).toBe(".foo .bar,.foo .baz{color:purple}")
  })

  it("renders nested rules with multiple selectors at both levels", () => {
    const output = print(new Rule(".foo, .bar", [
      new Rule(".baz,.buz", [
        new Property("color", "green")
      ])
    ]))

    expect(output).toBe(".foo .baz,.foo .buz{color:green}.bar .baz,.bar .buz{color:green}")
  })

  it("renders regular at-rules", () => {
    const output = print(new AtRule("import", "url(foo.css)", []))

    expect(output).toBe("@import url(foo.css);")
  })

  it("renders block at-rules", () => {
    const output = print(new AtRule("font-face", null, [
      new Property("font-family", `"Consolas"`)
    ]))

    expect(output).toBe(`@font-face{font-family:"Consolas"}`)
  })

  it("renders nested at-rules containing rules", () => {
    const output = print(new AtRule("media", "(min-width: 600px)", [
      new Rule(".foo", [
        new Property("color", "red")
      ])
    ]))

    expect(output).toBe("@media (min-width: 600px){.foo{color:red}}")
  })

  it("renders nested at-rules containing nested rules", () => {
    const output = print(new AtRule("media", "(min-width: 600px)", [
      new Rule(".foo", [
        new Property("color", "red"),
        new Rule(".bar", [
          new Property("color", "blue")
        ])
      ])
    ]))

    expect(output).toBe("@media (min-width: 600px){.foo{color:red}.foo .bar{color:blue}}")
  })

  it("renders nested at-rules nested inside other nested at-rule", () => {
    const output = print(new AtRule("supports", "(display: flex)", [
      new AtRule("media", "(min-width: 900px)", [
        new Rule(".foo", [
          new Property("display", "flex")
        ])
      ])
    ]))

    expect(output).toBe("@supports (display: flex){@media (min-width: 900px){.foo{display:flex}}}")
  })

  it("renders nested at-rules without contents", () => {
    const output = print(new AtRule("layer", "utilities", []))

    expect(output).toBe("@layer utilities;")
  })

  it("renders nested at-rules with properties", () => {
    const output = print(new AtRule("counter-style", "thumbs", [
      new Property("system", "cyclic")
    ]))

    expect(output).toBe("@counter-style thumbs{system:cyclic}")
  })

  it("renders nested at-rules without a rule", () => {
    const output = print(new AtRule("layer", null, [
      new Rule("p", [
        new Property("color", "red")
      ])
    ]))

    expect(output).toBe("@layer{p{color:red}}")
  })

})

describe("print content boundaries", () => {
  it.each([undefined, null, false, ""])("omits empty content %s", value => {
    expect(print(value)).toBe("")
    expect(print(new Element("p", false, [value]))).toBe("<p></p>")
  })

  it.each([[0, "0"], [true, "true"], [42, "42"], [BigInt(123), "123"]])(
    "preserves scalar content %s", (value, expected) => {
      expect(print(value)).toBe(expected)
      expect(print(new Element("p", false, [value]))).toBe(`<p>${expected}</p>`)
    },
  )

  it("flattens nested content arrays while retaining order", () => {
    expect(print(["one", [null, new Element("b", false, ["two"]), [false, 0]], "three"]))
      .toBe("one<b>two</b>0three")
  })

  it("escapes all HTML-sensitive text characters", () => {
    expect(print(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;")
  })

  it("does not share output buffers between calls", () => {
    expect(print("first")).toBe("first")
    expect(print("second")).toBe("second")
  })

  it("merges attributes from nested content arrays", () => {
    expect(print(new Element("div", false, [[{ class: "one" }], { class: "two" }, { id: "main" }])))
      .toBe('<div class="one two" id="main"></div>')
  })

  it("keeps the last value for repeated inline CSS properties", () => {
    expect(print(new Element("p", false, [new Property("color", "red"), new Property("color", "blue")])))
      .toBe('<p style="color: blue"></p>')
  })

  it("keeps the last value for repeated rule declarations", () => {
    expect(print(new Rule("p", [new Property("color", "red"), new Property("color", "blue")])))
      .toBe("p{color:blue}")
  })

  it("renders raw content inside an element without changing it", () => {
    expect(print(new Element("script", false, [new Raw('if (count < 2) alert("ok");')])))
      .toBe('<script>if (count < 2) alert("ok");</script>')
  })

  it("omits children and closing tags for void elements", () => {
    expect(print(new Element("hr", true, ["ignored", new Element("p", false, ["ignored"])])))
      .toBe("<hr>")
  })

  describe("regressions", () => {
    it("escapes HTML attribute values", () => {
      expect(print(new Element("div", false, [{ title: 'A "quote" & <tag>' }])))
        .toBe('<div title="A &quot;quote&quot; &amp; &lt;tag&gt;"></div>')
    })

    it("escapes serialized inline style attributes", () => {
      expect(print(new Element("p", false, [new Property("font-family", '"Example"')])))
        .toBe('<p style="font-family: &quot;Example&quot;"></p>')
    })

    it("escapes CSS values only when serializing an HTML attribute", () => {
      const property = new Property("font-family", '"Example & Co"')
      expect(print(new Element("p", false, [property])))
        .toBe('<p style="font-family: &quot;Example &amp; Co&quot;"></p>')
      expect(print(new Rule("p", [property]))).toBe('p{font-family:"Example & Co"}')
    })
  })
})
