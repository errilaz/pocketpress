import escape from "escape-html"

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
