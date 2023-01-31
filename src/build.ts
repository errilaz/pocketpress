import { readdir, stat } from "fs/promises"
import { join } from "path"
import { ChildProcess, fork } from "child_process"

/** Scans the site directory, collecting template paths and sending them to spawned composer process. */
export async function build(root: string, output: string, watch: boolean, excludes: string[], composer?: ChildProcess) {
  const templates = await scan(root, excludes)

  if (!composer) {
    composer = fork(join(__dirname, "composer"), {
      stdio: "inherit",
      env: {
        NODE_PATH: `${process.env.NODE_PATH}:${root}/node_modules`
      }
    })
  }

  composer.send({ root, output, watch, templates })

  await new Promise<void>(resolve => {
    composer!.on(watch ? "message" : "close", complete)

    function complete() {
      composer!.off(watch ? "message" : "close", complete)
      resolve()
    }
  })

  return composer
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