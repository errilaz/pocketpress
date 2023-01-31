import { watch } from "chokidar"
import { writeFile } from "fs/promises"
import { join } from "path"
import { build } from "./build"

/** Starts a chokidar watch to build on changes. */
export async function watcher(root: string, output: string, excludes: string[]) {
  const ignored = [...excludes, "**/*.html", "**/*.css", ".live-reload.js"]
  const composer = await build(root, output, !!watch, excludes)
  console.log("built site")
  await writeFile(join(root, ".live-reload.js"), liveReload(), "utf8")
  watch(`${root}/**/*.ls`, {
    ignored,
    ignoreInitial: true,
    cwd: root,
  }).on("all", async (event, path) => {
    console.log(path, `${event}d`)
    const start = performance.now()
    await build(root, output, !!watch, excludes, composer)
    await writeFile(join(root, ".live-reload.js"), liveReload(), "utf8")
    const duration = (performance.now() - start).toFixed(2)
    console.log(`rebuilt site in ${duration}ms`)
  })
}

/** Creates an updated live reload script. */
function liveReload() {
  const time = Date.now()
  return `(function() {
    if (window.LIVE_RELOAD_TIME === undefined || window.LIVE_RELOAD_TIME === ${time}) {
      window.LIVE_RELOAD_TIME = ${time}
      if (window.LIVE_RELOAD_LAST) {
        document.body.removeChild(window.LIVE_RELOAD_LAST)
      }
      setTimeout(() => {
        const script = document.createElement("script")
        script.setAttribute("src", window.LIVE_RELOAD_SRC)
        document.body.appendChild(script)
        window.LIVE_RELOAD_LAST = script
      }, 1000)
    }
    else {
      document.location.reload()
    }
  })()`
}
