/// <reference path="livescript.d.ts" />
import LiveScript from "livescript"

export function compile(code: string, filename: string) {
  return LiveScript.compile(code, {
    filename,
    header: false,
  })
}
