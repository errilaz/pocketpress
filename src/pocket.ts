import options from "toptions"
import { resolve } from "path"
import { build } from "./build"
import { watcher } from "./watcher"

const parse = options({
  path: options.arg(0),
  output: options.flag("o"),
  exclude: options.list("e", ""),
  watch: options.bit("w"),
  help: options.bit("h"),
})

const { path, output, exclude, watch, help } = parse(process.argv.slice(2))

const root = resolve(path || "")
const out = output ? resolve(output) : root

if (help) {
  usage()
  process.exit(0)
}

const excludes = [
  ...exclude,
  ".git",
  "node_modules",
].map(dir => resolve(root, dir))

process.env.NODE_PATH = `${process.env.NODE_PATH}:${root}/node_modules`
if (process.env.POCKET_DEV !== "bun") {
  require("module").Module._initPaths()
}

if (!watch) {
  build(root, out, !!watch, excludes)
    .catch(e => { console.error(e); process.exit(1) })
}
else {
  console.log(`watching ${root}`)
  watcher(root, out, excludes)
}

function usage() {
  console.log(`Usage: pocket [options] [path]
  
  Options:
    -o, --output <dir>    Output directory
    -e, --exclude <dir>   Ignore directory
    -w, --watch           Enter watch mode
    -h, --help            Display this message
`)
}