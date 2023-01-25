import { describe, it, expect } from "vitest"
import { Element, MediaQuery, Property, Raw, Rule } from "../src/model"
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

  it("renders media queries", () => {
    const output = print(new MediaQuery("(min-width: 600px)", [
      new Rule(".foo", [
        new Property("color", "red")
      ])
    ]))

    expect(output).toBe("@media (min-width: 600px){.foo{color:red}}")
  })

  it("renders media queries with nested rules", () => {
    const output = print(new MediaQuery("(min-width: 600px)", [
      new Rule(".foo", [
        new Property("color", "red"),
        new Rule(".bar", [
          new Property("color", "blue")
        ])
      ])
    ]))

    expect(output).toBe("@media (min-width: 600px){.foo{color:red}.foo .bar{color:blue}}")
  })
})