/** Site build configuration. */
export interface SiteBuild {
  root: string
  templates: string[]
}

/** Representation of an HTML element. */
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
      this.children.push(content.toString())
    }
  }
}

/** Representation of a CSS property/value. */
export class Property {
  name: string
  value: string

  constructor(name: string, value: any) {
    this.name = name
    this.value = value
  }
}

/** Representation of a CSS rule. */
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
}

/** Unescaped HTML content. */
export class Raw {
  text: string

  constructor(object: any) {
    this.text = object === null || object === undefined ? "" : object.toString()
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
