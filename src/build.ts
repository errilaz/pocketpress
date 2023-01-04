/// <reference path="livescript.d.ts" />
import LiveScript from "livescript"
import { readdir, stat } from "fs/promises"
import { join } from "path"
import { template } from "./template"
import { writeFileSync as writeFile } from "fs"

export async function scan(dir: string) {
  const names = await readdir(dir)
  for (const name of names) {
    const path = join(dir, name)
    const entry = await stat(path)
    if (entry.isFile()) build(path)
    else if (entry.isDirectory()) {
      scan(path)
    }
  }
}

const doctype = "<!DOCTYPE html>"

function build(path: string) {
  if (!path.endsWith(".html.ls")) return
  const result = template(path)
  const markup = result.page.toString()
  const output = `${doctype}\n${markup}`
  writeFile(path.substring(0, path.length - 3), output, "utf8")
}

function compile(code: string, filename: string) {
  return LiveScript.compile(code, {
    filename,
    header: false,
  })
}
