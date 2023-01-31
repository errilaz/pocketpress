import { readdir, stat } from "fs/promises"
import { join } from "path"
import { render } from "./render"

/** Scans the site directory, collecting template paths and rendering. */
export async function build(root: string, output: string, watch: boolean, excludes: string[]) {
  const templates = await scan(root, excludes)
  await render({ root, output, watch, templates })
}

async function scan(root: string, excludes: string[]) {
  const templates: string[] = []
  await scanDir(root)
  return templates

  /** Recursively look for `.html.ls` files. */
  async function scanDir(dir: string) {
    const names = await readdir(dir)
    for (const name of names) {
      const path = join(dir, name)
      if (excludes.includes(path)) {
        continue
      }
      const entry = await stat(path)
      if (entry.isFile()) {
        if (path.endsWith(".html.ls") || path.endsWith(".md.ls") || path.endsWith(".css.ls")) {
          templates.push(path)
        }
      }
      else if (entry.isDirectory()) {
        await scanDir(path)
      }
    }
  }
}