const chokidar = require("chokidar")
const watch = chokidar.watch

chokidar.watch = (...args) => {
  const watcher = watch(...args)
  watcher.once("ready", () => {
    process.stdout.write("POCKETPRESS_TEST_WATCH_READY\n")
  })
  return watcher
}
