import { watch } from "chokidar"
import { writeFile } from "fs/promises"
import { join } from "path"
import { build } from "./build"

/** Starts a chokidar watch to build on changes. */
export async function watcher(root: string, output: string, excludes: string[]) {
  await build(root, output, !!watch, excludes)
  console.log("built site")
  await writeFile(join(root, ".live-reload.js"), liveReload(), "utf8")
  watch(root, {
    ignored: [
      ...excludes.map(path => ({ path, recursive: true })),
      (path, stats) => stats?.isFile() === true && !path.endsWith(".ls"),
    ],
    ignoreInitial: true,
    cwd: root,
    backend: "polling",
  }).on("all", async (event, path) => {
    if (event === "addDir" || event === "unlinkDir") return
    console.log(path, `${event}d`)
    const start = performance.now()
    await build(root, output, !!watch, excludes)
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
