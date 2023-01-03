import options from "toptions"
import { readdir, stat } from "fs/promises"
import { join, resolve } from "path"
import { template } from "./template"
import { writeFileSync as writeFile } from "fs"

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

// Run command

cli()
  .catch(e => { console.error(e); process.exit(1) })

async function cli() {
  scan(root!)
}

async function scan(dir: string) {
  if (verbose) console.log(`scanning ${local(dir)}`)
  const names = await readdir(dir)
  for (const name of names) {
    const path = join(dir, name)
    const entry = await stat(path)
    if (entry.isFile()) build(path)
    else if (entry.isDirectory()) {
      scan(path)
    }
  }
}

const doctype = "<!DOCTYPE html>"

function build(path: string) {
  if (!path.endsWith(".html.ls")) return
  if (verbose) console.log(`building ${local(path)}`)
  const result = template(path)
  const markup = result.page.toString()
  const output = `${doctype}\n${markup}`
  writeFile(path.substring(0, path.length - 3), output, "utf8")
}

function local(path: string) {
  return "." + path.substring(root.length)
}

function usage() {
  console.log(`Usage: pocket [options]
  
  Options:
    -p, --path <dir>      Path to site directory
    -v, --verbose         Print extra information
    -h, --help            Display this message
`)
}