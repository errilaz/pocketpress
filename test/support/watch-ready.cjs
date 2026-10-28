const { FSWatcher } = require("chokidar")
const emit = FSWatcher.prototype.emit

FSWatcher.prototype.emit = function (event, ...args) {
  if (event === "ready") {
    process.stdout.write(`POCKETPRESS_TEST_WATCHED ${JSON.stringify(this.getWatched())}\n`)
    process.stdout.write("POCKETPRESS_TEST_WATCH_READY\n")
  }
  return emit.call(this, event, ...args)
}
