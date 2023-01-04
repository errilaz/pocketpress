import options from "toptions"
import { resolve } from "path"
import { scan } from "./build"

const cwd = process.cwd()

const parse = options({
  path: options.flag("p", "", cwd),
  verbose: options.bit("v"),
  help: options.bit("h"),
})

const { path, verbose, help } = parse(process.argv.slice(2))

const root = resolve(path!)

if (help) {
  usage()
  process.exit(0)
}

scan(root!)
  .catch(e => { console.error(e); process.exit(1) })

function usage() {
  console.log(`Usage: pocket [options]
  
  Options:
    -p, --path <dir>      Path to site directory
    -v, --verbose         Print extra information
    -h, --help            Display this message
`)
}