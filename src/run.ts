import { Markup } from "./markup"
import { SiteBuild } from "./model"

/** Evaluate template code (isolated from other modules). */
export function run(code: string, path: string, site: SiteBuild) {
  const include = Markup.includeFrom(path, site)
  const loadFile = Markup.loadFileFrom(path, site.root)
  const liveReload = Markup.liveReloadFrom(site.root, site.watch)
  const linkTo = Markup.linkToFrom(site.root, site.watch)
  return eval(code)
}
