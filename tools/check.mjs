#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Syntax-checks every module and proves the service worker's precache list
// matches the files on disk. No dependencies:
//
//   node tools/check.mjs

import { readdirSync, existsSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
let failures = 0

function fail(message) {
  failures++
  console.error(`  ✗ ${message}`)
}

function ok(message) {
  console.log(`  ✓ ${message}`)
}

const jsFiles = readdirSync(join(root, "js"))
  .filter((f) => f.endsWith(".js"))
  .map((f) => `js/${f}`)

console.log(`Checking ${jsFiles.length} modules`)
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", join(root, file)], { encoding: "utf8" })
  if (result.status === 0) ok(file)
  else {
    fail(`${file}\n${result.stderr.trim()}`)
  }
}

console.log("Checking the service worker's precache list")
const sw = readFileSync(join(root, "sw.js"), "utf8")
const assetsBlock = /const ASSETS = \[([\s\S]*?)\]/.exec(sw)?.[1] || ""
const listed = [...assetsBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1])
for (const entry of listed) {
  if (entry === "./") continue
  if (!existsSync(join(root, entry))) fail(`precached but missing: ${entry}`)
}
ok(`${listed.length} entries`)

const onDisk = []
const walk = (dir) => {
  for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${item.name}`
    if (item.isDirectory()) {
      if (item.name !== "icons") walk(path)
    } else if (/\.(js|css|html|webmanifest)$/.test(item.name)) onDisk.push(path)
  }
}
for (const dir of ["js", "css"]) walk(dir)
onDisk.push("index.html", "manifest.webmanifest")
for (const file of onDisk) {
  if (!listed.includes(file)) fail(`not precached: ${file}`)
}
ok("every module, style and the manifest is precached")

console.log("Checking that no module imports a file that does not exist")
for (const file of jsFiles) {
  const source = readFileSync(join(root, file), "utf8")
  for (const match of source.matchAll(/from\s+"(\.\/[^"]+)"/g)) {
    if (!existsSync(join(root, dirname(file), match[1]))) fail(`${file} imports missing ${match[1]}`)
  }
}
ok("imports resolve")

if (failures) {
  console.error(`\n${failures} problem(s)`)
  process.exit(1)
}
console.log("\nAll good.")
