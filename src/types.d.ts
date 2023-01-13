module "livescript" {
  declare function compile(code: string, options?: {
    bare?: boolean
    header?: boolean
    const?: boolean
    json?: boolean
    warn?: boolean
    filename?: string
  }): string

  declare function run(code: string, options?: {
    const?: boolean
    filename?: string
  })
}
