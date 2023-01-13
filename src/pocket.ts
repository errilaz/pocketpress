/// <reference path="./types.d.ts" />
import options from "toptions"
import { join, resolve } from "path"
import { build } from "./build"
import { watch as watcher } from "chokidar"
import { writeFile } from "fs/promises"

const cwd = process.cwd()

const parse = options({
  path: options.flag("p", "", cwd),
  exclude: options.list("e", ""),
  watch: options.bit("w"),
  help: options.bit("h"),
})

const { path, exclude, watch, help } = parse(process.argv.slice(2))

const root = resolve(path!)

if (help) {
  usage()
  process.exit(0)
}

const excludes = [
  ...exclude,
  ".git",
  "node_modules",
].map(dir => resolve(root, dir))

if (!watch) {
  build(root!, !!watch, excludes)
    .catch(e => { console.error(e); process.exit(1) })
}
else {
  console.log(`watching ${root}`)
  startWatcher()
}

async function startWatcher() {
  const ignored = [...exclude, "**/*.html", ".live-reload.js"] 
  const composer = await build(root!, !!watch, excludes)
  await writeFile(join(root, ".live-reload.js"), liveReload(), "utf8")
  watcher(`${root}/**/*.ls`, {
    ignored,
    ignoreInitial: true,
    cwd: root,
  }).on("all", async (event, path) => {
    console.log(path, `${event}d`)
    await build(root!, !!watch, excludes, composer)
    await writeFile(join(root, ".live-reload.js"), liveReload(), "utf8")
  })
}

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

function usage() {
  console.log(`Usage: pocket [options]
  
  Options:
    -p, --path <dir>      Path to site directory
    -e, --exclude <dir>   Ignore directory
    -h, --help            Display this message
`)
}