/**
 * Drive the workbench in a real browser: navigate, report what the page logs, and
 * run an optional script against it.
 *
 *   node scripts/browser.mjs <url> [width] [height] [out.png] [check.mjs]
 *
 * The check script is a file rather than an argument because a script with `//`
 * comments does not survive being collapsed onto one line. It is evaluated after
 * the page has settled, and its return value is printed as JSON.
 *
 * A page that logs an error or throws is a failure, and so is a non-zero exit.
 * That is the whole point: a hook called outside its provider, or a render that
 * throws, leaves a blank page that types, tests, lint and build all pass.
 *
 * Chrome is launched if nothing is listening on the debugging port, so this is one
 * command. Pass a port as `CDP_PORT` to reuse one that is already open.
 */
import { spawn } from "node:child_process"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { readFile } from "node:fs/promises"

const [url, w = "1440", h = "900", out, check] = process.argv.slice(2)
if (!url) {
  console.error(
    "usage: node scripts/browser.mjs <url> [width] [height] [out.png] [check.mjs]"
  )
  process.exit(2)
}

const PORT = process.env.CDP_PORT ?? "9222"
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const listening = async () => {
  try {
    return (await fetch(`http://localhost:${PORT}/json/version`)).ok
  } catch {
    return false
  }
}

let profile
async function ensureChrome() {
  if (await listening()) return
  if (!existsSync(CHROME)) {
    console.error(`no Chrome at ${CHROME}; set CHROME_PATH`)
    process.exit(2)
  }
  profile = mkdtempSync(path.join(tmpdir(), "wb-chrome-"))
  spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--disable-gpu",
      "about:blank",
    ],
    { stdio: "ignore", detached: true }
  ).unref()

  for (let waited = 0; waited < 60; waited++) {
    await new Promise((r) => setTimeout(r, 250))
    if (await listening()) return
  }
  console.error("Chrome did not open a debugging port")
  process.exit(2)
}

await ensureChrome()

const targets = await (await fetch(`http://localhost:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === "page")
const ws = new WebSocket(page.webSocketDebuggerUrl)

let nextId = 0
const waiting = new Map()
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId
    waiting.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })

/** Everything the page said against it, which is how a blank page explains itself. */
const complaints = []

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.method === "Runtime.consoleAPICalled") {
    const { type, args = [] } = message.params
    if (type !== "error" && type !== "warning") return
    complaints.push(
      `[${type}] ` +
        args
          .map((a) => a.value ?? a.description ?? a.preview?.description ?? "")
          .join(" ")
          .slice(0, 400)
    )
  }
  if (message.method === "Runtime.exceptionThrown") {
    const { exceptionDetails } = message.params
    complaints.push(
      "[threw] " +
        (exceptionDetails.exception?.description ?? exceptionDetails.text).slice(
          0,
          400
        )
    )
  }
  if (message.id && waiting.has(message.id)) {
    const { resolve, reject } = waiting.get(message.id)
    waiting.delete(message.id)
    message.error
      ? reject(new Error(JSON.stringify(message.error)))
      : resolve(message.result)
  }
}

await new Promise((resolve) => (ws.onopen = resolve))

await send("Runtime.enable")
await send("Page.enable")
await send("Emulation.setDeviceMetricsOverride", {
  width: Number(w),
  height: Number(h),
  deviceScaleFactor: 1,
  mobile: Number(w) < 768,
})
await send("Page.navigate", { url })
await new Promise((r) => setTimeout(r, 2500))

if (check) {
  const source = await readFile(check, "utf8")
  const result = await send("Runtime.evaluate", {
    expression: source,
    returnByValue: true,
    awaitPromise: true,
  })
  console.log(
    JSON.stringify(result.result.value ?? result.result.description, null, 2)
  )
}

if (out?.endsWith(".png")) {
  const shot = await send("Page.captureScreenshot", { format: "png" })
  await (await import("node:fs/promises")).writeFile(
    out,
    Buffer.from(shot.data, "base64")
  )
  console.log("wrote", out)
}

ws.close()
if (profile) rmSync(profile, { recursive: true, force: true })

if (complaints.length > 0) {
  console.error(`\n${complaints.length} complaint(s) from the page:`)
  for (const line of complaints) console.error(line)
  process.exit(1)
}
process.exit(0)