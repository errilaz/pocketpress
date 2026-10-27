import { spawn, ChildProcessWithoutNullStreams } from "child_process"
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises"
import { tmpdir } from "os"
import { dirname, join, resolve } from "path"

export type SiteFixture = {
  directory: string
  root: string
  output: string
}

export namespace SiteFixture {
  export type Result = {
    code: number | null
    signal: NodeJS.Signals | null
    stdout: string
    stderr: string
  }

  export type Process = {
    child: ChildProcessWithoutNullStreams
    stdout: string
    stderr: string
    closed: boolean
    result: Promise<Result>
  }

  export async function create(files: Record<string, string> = {}): Promise<SiteFixture> {
    const directory = await mkdtemp(join(tmpdir(), "pocketpress-test-"))
    const site = { directory, root: join(directory, "site"), output: join(directory, "output") }
    try {
      await mkdir(site.output)
      await write(site, "package.json", "{}")
      for (const [path, content] of Object.entries(files)) {
        await write(site, path, content)
      }
      return site
    }
    catch (error) {
      await remove(site)
      throw error
    }
  }

  export async function load(name: string): Promise<SiteFixture> {
    const site = await create()
    try {
      await cp(resolve(__dirname, "../fixtures", name), site.root, { recursive: true })
      return site
    }
    catch (error) {
      await remove(site)
      throw error
    }
  }

  export async function write(site: SiteFixture, path: string, content: string) {
    const target = join(site.root, path)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content, "utf8")
  }

  export function read(site: SiteFixture, path: string) {
    return readFile(join(site.root, path), "utf8")
  }

  export function remove(site: SiteFixture) {
    return rm(site.directory, { recursive: true, force: true })
  }

  export function start(site: SiteFixture, args: string[] = [], env: NodeJS.ProcessEnv = {}): Process {
    const child = spawn("bash", [resolve(__dirname, "../../bin/pocket"), ...args], {
      cwd: site.root,
      detached: true,
      env: {
        ...process.env,
        POCKET_DEV: "true",
        TS_NODE_TRANSPILE_ONLY: "true",
        TZ: "UTC",
        ...env,
      },
      stdio: "pipe",
    })
    const running: Process = {
      child,
      stdout: "",
      stderr: "",
      closed: false,
      result: new Promise((resolveResult, reject) => {
        child.once("error", reject)
        child.once("close", (code, signal) => {
          running.closed = true
          resolveResult({ code, signal, stdout: running.stdout, stderr: running.stderr })
        })
      }),
    }
    child.stdout.setEncoding("utf8").on("data", chunk => { running.stdout += chunk })
    child.stderr.setEncoding("utf8").on("data", chunk => { running.stderr += chunk })
    return running
  }

  export async function run(site: SiteFixture, args: string[] = []): Promise<Result> {
    const running = start(site, args)
    const timeout = setTimeout(() => terminate(running, "SIGKILL"), 10000)
    try {
      const result = await running.result
      if (result.signal) {
        throw new Error(`CLI terminated with ${result.signal}\n${result.stdout}\n${result.stderr}`)
      }
      return result
    }
    finally {
      clearTimeout(timeout)
    }
  }

  export function assertSuccess(result: Result) {
    if (result.code !== 0) {
      throw new Error(`CLI exited ${result.code}\n${result.stdout}\n${result.stderr}`)
    }
  }

  export async function waitForOutput(running: Process, text: string, offset = 0) {
    const deadline = Date.now() + 10000
    while (!running.stdout.slice(offset).includes(text)) {
      if (running.closed || Date.now() >= deadline) {
        throw new Error(`Waiting for ${JSON.stringify(text)}\n${running.stdout}\n${running.stderr}`)
      }
      await new Promise(resolveWait => setTimeout(resolveWait, 25))
    }
  }

  export async function stop(running: Process) {
    terminate(running, "SIGTERM")
    const timeout = setTimeout(() => terminate(running, "SIGKILL"), 2000)
    try {
      await running.result
    }
    finally {
      clearTimeout(timeout)
    }
  }

  function terminate(running: Process, signal: NodeJS.Signals) {
    if (!running.child.pid) return
    try {
      process.kill(-running.child.pid, signal)
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error
    }
  }
}
