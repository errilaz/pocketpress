import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import tags from "html-tags"
import voids from "html-tags/void"
import { all as properties } from "known-css-properties"

const reserved = ["var", "continue"]
const slot = "//{GENERATED_CODE}"

generateRun()

export async function generateRun() {
  const template = await readFile(join(__dirname, "runTemplate.ts"), "utf8")
  let dsl = "// Elements \n\n"
  for (const tag of tags) {
    const isVoid = (voids as string[]).includes(tag)
    const name = reserved.includes(tag) ? `_${tag}` : tag
    dsl += `const ${name} = Markup.element("${tag}", ${isVoid})\n`
  }

  dsl += "\n// Properties\n\n"

  for (const property of properties.filter(p => !p.startsWith("-epub"))) {
    const name = camelize(propertyName(property))
    dsl += `const ${name} = Markup.property("${property}")\n`
  }

  dsl += "\n// At-rules\n\n"

  for (const atRule of atRules()) {
    const name = camelize(atRule)
    dsl += `const $${name} = Markup.atRule("${atRule}")\n`
  }

  await writeFile(join(__dirname, "run.ts"), template.replace(slot, dsl), "utf8")
}

/** Formats a property variable name. */
function propertyName(property: string) {
  switch (true) {
    case reserved.includes(property):
      return `_${property}`
    case property.startsWith("-"):
      return property.substring(1)
  }
  return property
}

/** Turn a kebab-case name into camelCase. */
function camelize(kebab: string) {
  return kebab.replace(/-[a-z]/g, ([, c]) => c.toUpperCase());
}

function atRules() {
  return [
    "charset",
    "import",
    "namespace",
    "media",
    "supports",
    "page",
    "keyframes",
    "counter-style",
    "font-feature-values",
    "layer",
    "color-profile",
    "container",
    "font-palette-values",
    "font-face",
  ]
}
