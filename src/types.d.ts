module "livescript" {
  declare interface CompileOptions {
    bare?: boolean
    header?: boolean
    const?: boolean
    json?: boolean
    warn?: boolean
    filename?: string
  }
  declare function compile(code: string, options?: CompileOptions & {
    map: "embedded" | "linked" | "linked-src" | "debug"
  }): { code: string, map: string }
  declare function compile(code: string, options?: CompileOptions & {
    map?: undefined | false
  }): string

  declare function run(code: string, options?: {
    const?: boolean
    filename?: string
  })
}
