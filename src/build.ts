import { readdir, stat } from "fs/promises"
import { join } from "path"
import { ChildProcess, fork } from "child_process"

/** Scans the site directory, collecting template paths and sending them to spawned composer process. */
export async function build(root: string, watch: boolean, excludes: string[], composer?: ChildProcess) {
  const templates: string[] = []
  await scanDir(root)

  if (!composer) {
    composer = fork(join(__dirname, "composer"), {
      stdio: "inherit"
    })
  }

  composer.send({ root, watch, templates })

  await new Promise<void>(resolve => {
    composer!.once(watch ? "message" : "close", () => resolve())
  })

  return composer

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
        if (path.endsWith(".html.ls")) {
          templates.push(path)
        }
      }
      else if (entry.isDirectory()) {
        await scanDir(path)
      }
    }
  }
}
