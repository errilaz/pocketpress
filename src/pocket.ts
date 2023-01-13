import options from "toptions"
import { resolve } from "path"
import { build } from "./build"
import { watcher } from "./watcher"

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
  watcher(root!, excludes)
}

function usage() {
  console.log(`Usage: pocket [options]
  
  Options:
    -p, --path <dir>      Path to site directory
    -e, --exclude <dir>   Ignore directory
    -h, --help            Display this message
`)
}