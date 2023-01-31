import { readFileSync as readFile } from "fs"
import { compile } from "livescript"
import { SiteBuild } from "./model"
import { run } from "./run"

/** Compile a template and return a function which runs it. */
export function createTemplate(path: string, site: SiteBuild) {
  let contents = readFile(path, "utf8")
  if (/^\s*$/.test(contents)) contents = `""`
  const ls = `return (${contents})`
  const js = compile(ls, { header: false, filename: path })
  return () => run(js, path, site)
}