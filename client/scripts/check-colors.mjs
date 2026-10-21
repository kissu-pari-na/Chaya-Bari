#!/usr/bin/env node
// Guard for design.md §2: no component may hard-code a colour.
// Fails on hex / rgb() / hsl() literals in src/**/*.{css,ts,tsx} outside the
// token files. White/black alpha are allowed only for gloss highlights,
// glass borders and drop shadows (as the glass spec defines them).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src', import.meta.url))
const ALLOWED_FILES = new Set(['styles/tokens.css', 'styles/palettes.css', 'lib/palettes.gen.ts'])
const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(([^)]*)\)/g
const GLOSS = /^\s*(255,\s*255,\s*255|0,\s*0,\s*0),\s*0?\.\d+\s*$/

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : /\.(css|tsx?)$/.test(f) ? [p] : []
  })

const problems = []
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).replace(/\\/g, '/')
  if (ALLOWED_FILES.has(rel)) continue
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) return
      for (const m of line.matchAll(COLOR)) {
        if (m[1] !== undefined && GLOSS.test(m[1])) continue
        // Hex inside an id/url/entity, not a colour (e.g. url(#n), &#123;)
        if (m[0].startsWith('#') && /url\(|%23|&#/.test(line)) continue
        problems.push(`${rel}:${i + 1}  ${m[0]}`)
      }
    })
}
if (problems.length) {
  console.error(`Hard-coded colours (use tokens from styles/tokens.css):\n${problems.join('\n')}`)
  process.exit(1)
}
console.log('Colours: no hard-coded colours outside the token files.')
