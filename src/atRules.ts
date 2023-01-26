import { Markup } from "./markup"
import { AtRule } from "./model"

export const atRules: { [key: string]: AtRule } = {
  $charset: Markup.regularAtRule("charset"),
  $import: Markup.regularAtRule("import"),
  $namespace: Markup.regularAtRule("namespace"),

  $media: Markup.nestedAtRule("media"),
  $supports: Markup.nestedAtRule("supports"),
  $page: Markup.nestedAtRule("page"),
  $keyframes: Markup.nestedAtRule("keyframes"),
  $counterStyle: Markup.nestedAtRule("counter-style"),
  $fontFeatureValues: Markup.nestedAtRule("font-feature-values"),
  $layer: Markup.nestedAtRule("layer"),
  $colorProfile: Markup.nestedAtRule("color-profile"),
  $container: Markup.nestedAtRule("container"),
  $fontPaletteValues: Markup.nestedAtRule("font-palette-values"),

  $fontFace: Markup.blockAtRule("font-face"),
}
