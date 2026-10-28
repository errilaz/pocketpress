import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { rm } from "fs/promises"
import { join, resolve } from "path"
import { runInNewContext } from "vm"
import { SiteFixture } from "./support/SiteFixture"

describe("watch mode", () => {
  let site: SiteFixture
  let running: SiteFixture.Process | undefined

  beforeEach(async () => {
    site = await SiteFixture.create({
      "index.html.ls": 'page: div (include "partial.ls"), (live-reload!)',
      "partial.ls": 'p "Original content"',
      ".git/ignored.html.ls": "page: (",
      "node_modules/ignored.html.ls": "page: (",
      "drafts/ignored.html.ls": "page: (",
      "notes.txt": "Not a template",
      "manual.md": "Not a template",
      "static.css": "body{color:red}",
    })
    const observer = resolve(__dirname, "support/watch-ready.cjs")
    running = SiteFixture.start(site, ["--watch", "--exclude", "drafts"], observer)
    await SiteFixture.waitForOutput(running, "POCKETPRESS_TEST_WATCH_READY")
  }, 15000)

  afterEach(async () => {
    try {
      if (running) await SiteFixture.stop(running)
    }
    finally {
      running = undefined
      if (site) await SiteFixture.remove(site)
    }
  })

  it("performs an initial build and writes the local reload script", async () => {
    const markup = await SiteFixture.read(site, "index.html")
    expect(markup).toContain("<p>Original content</p>")
    expect(markup).toContain(`file://${site.root}/.live-reload.js`)
    expect(await SiteFixture.read(site, ".live-reload.js")).toContain("window.LIVE_RELOAD_TIME")
    expect(running!.closed).toBe(false)
  })

  it("rebuilds after an included partial changes and advances the reload stamp", async () => {
    const stamp = await SiteFixture.read(site, ".live-reload.js")
    const offset = running!.stdout.length
    await SiteFixture.write(site, "partial.ls", 'p "Updated partial content"')
    await SiteFixture.waitForOutput(running!, "rebuilt site in", offset)
    expect(await SiteFixture.read(site, "index.html")).toContain("<p>Updated partial content</p>")
    expect(await SiteFixture.read(site, ".live-reload.js")).not.toBe(stamp)
  })

  it("watches only LiveScript sources outside excluded directories", () => {
    const prefix = "POCKETPRESS_TEST_WATCHED "
    const snapshot = running!.stdout.split("\n").find(line => line.startsWith(prefix))
    expect(snapshot).toBeDefined()
    const watched: Record<string, string[]> = JSON.parse(snapshot!.slice(prefix.length))
    const files = Object.entries(watched).flatMap(([directory, names]) =>
      names.map(name => resolve(site.root, directory, name)),
    )
    expect(files).toContain(join(site.root, "index.html.ls"))
    expect(files).toContain(join(site.root, "partial.ls"))
    for (const path of [
      ".git/ignored.html.ls", "node_modules/ignored.html.ls", "drafts/ignored.html.ls",
      "notes.txt", "manual.md", "static.css", "index.html", ".live-reload.js", "package.json",
    ]) {
      expect(files).not.toContain(join(site.root, path))
    }
  })

  it("discovers LiveScript pages inside directories created after startup", async () => {
    const offset = running!.stdout.length
    await SiteFixture.write(site, "new-tree/nested/entry.html.ls", 'page: h1 "New nested page"')
    await SiteFixture.waitForOutput(running!, "rebuilt site in", offset)
    expect(await SiteFixture.read(site, "new-tree/nested/entry.html"))
      .toBe("<!DOCTYPE html>\n<h1>New nested page</h1>")
    expect(running!.stderr).toBe("")
  })

  it("refreshes the site index when source pages are added and removed", async () => {
    let offset = running!.stdout.length
    await SiteFixture.write(site, "index.html.ls", 'page: (meta) -> p meta.site.templates.length')
    await SiteFixture.waitForOutput(running!, "rebuilt site in", offset)
    expect(await SiteFixture.read(site, "index.html")).toContain("<p>1</p>")

    offset = running!.stdout.length
    await SiteFixture.write(site, "extra.html.ls", 'page: p "Extra page"')
    await SiteFixture.waitForOutput(running!, "rebuilt site in", offset)
    expect(await SiteFixture.read(site, "extra.html")).toContain("<p>Extra page</p>")
    expect(await SiteFixture.read(site, "index.html")).toContain("<p>2</p>")

    offset = running!.stdout.length
    await rm(join(site.root, "extra.html.ls"))
    await SiteFixture.waitForOutput(running!, "rebuilt site in", offset)
    expect(await SiteFixture.read(site, "index.html")).toContain("<p>1</p>")
  }, 15000)

  it("survives a syntax error and rebuilds after correction", async () => {
    let offset = running!.stdout.length
    await SiteFixture.write(site, "index.html.ls", "page: (")
    await SiteFixture.waitForOutput(running!, "rebuilt site in", offset)
    expect(running!.stderr).toContain('Compile error in "/index.html.ls"')
    expect(running!.closed).toBe(false)

    offset = running!.stdout.length
    await SiteFixture.write(site, "index.html.ls", 'page: h1 "Recovered page"')
    await SiteFixture.waitForOutput(running!, "rebuilt site in", offset)
    expect(await SiteFixture.read(site, "index.html")).toBe("<!DOCTYPE html>\n<h1>Recovered page</h1>")
  }, 15000)

  it("polls the reload script and reloads the browser only for a changed stamp", async () => {
    const script = await SiteFixture.read(site, ".live-reload.js")
    const reload = vi.fn()
    const appendChild = vi.fn()
    const removeChild = vi.fn()
    const setAttribute = vi.fn()
    const setTimeout = vi.fn()
    const element = { setAttribute }
    const window: { LIVE_RELOAD_SRC: string, LIVE_RELOAD_TIME?: number } = {
      LIVE_RELOAD_SRC: `file://${site.root}/.live-reload.js`,
    }
    const context = {
      window, setTimeout,
      document: { body: { appendChild, removeChild }, createElement: () => element, location: { reload } },
    }

    runInNewContext(script, context)
    expect(reload).not.toHaveBeenCalled()
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000)
    setTimeout.mock.calls[0][0]()
    expect(setAttribute).toHaveBeenCalledWith("src", window.LIVE_RELOAD_SRC)
    expect(appendChild).toHaveBeenCalledWith(element)

    runInNewContext(script, context)
    expect(removeChild).toHaveBeenCalledWith(element)
    expect(reload).not.toHaveBeenCalled()
    window.LIVE_RELOAD_TIME = -1
    runInNewContext(script, context)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
