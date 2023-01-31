import { Markup } from "./markup"
import { SiteBuild } from "./model"

// Basics

const raw = Markup.raw
const prop = Markup.prop
const elem = Markup.elem
const rule = Markup.rule
const markdown = Markup.markdown
const livescript = Markup.livescript
const document = Markup.document
const stylesheet = Markup.stylesheet
const quote = Markup.quote

//{GENERATED_CODE}

/** Evaluate template code (isolated from other modules). */
export function run(__code: string, __path: string, __build: SiteBuild) {
  const include = Markup.includeFrom(__path, __build)
  const loadFile = Markup.loadFileFrom(__path, __build.root)
  const liveReload = Markup.liveReloadFrom(__build.root, __build.watch)
  const linkTo = Markup.linkToFrom(__build.output, __build.watch)
  return eval(__code)
}
