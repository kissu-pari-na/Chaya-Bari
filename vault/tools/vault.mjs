#!/usr/bin/env node
// Knowledge-vault CLI for Chaya Bari. Zero dependencies (Node 18+).
//
// The vault is a graph: every file in vault/nodes/ is a node (a business
// feature or a cross-cutting concern); `relations` in its frontmatter are the
// edges. Rules, decisions, open questions and ideas live on the nodes.
//
//   node vault/tools/vault.mjs brief               session-start summary for AI agents
//   node vault/tools/vault.mjs check               validate the graph (exit 1 on errors)
//   node vault/tools/vault.mjs build               regenerate INDEX.md, graph.json, graph.html
//   node vault/tools/vault.mjs rules <path...>     rules that govern the given files
//   node vault/tools/vault.mjs impact <node-id>    node, its edges, and neighbours' rules
//   node vault/tools/vault.mjs questions           open questions + proposed decisions (need the user)
//   node vault/tools/vault.mjs ideas [--all]       improvement backlog, best first
//   node vault/tools/vault.mjs stale               nodes whose code changed after their last review
//   node vault/tools/vault.mjs suggest             self-improvement prompts derived from the graph
//   node vault/tools/vault.mjs next-id <node> <R|D|Q|I>   next free entry id for a node

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const VAULT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = resolve(VAULT, '..')
const NODES_DIR = join(VAULT, 'nodes')

export const RELATION_TYPES = {
  'depends-on': 'cannot work without the target',
  triggers: 'an event here causes behaviour in the target',
  feeds: 'produces data the target consumes',
  constrains: 'imposes rules the target must obey',
  configures: 'holds settings the target reads',
  extends: 'specialises or builds on the target',
  uses: 'calls into the target, loosely coupled',
}
const KINDS = ['feature', 'cross-cutting', 'integration', 'meta']
const STATUSES = ['live', 'partial', 'mock', 'planned', 'deprecated']
const SECTIONS = { Rules: 'R', Decisions: 'D', 'Open questions': 'Q', Ideas: 'I' }
const IMPACT = { high: 3, med: 2, low: 1 }
const EFFORT = { S: 3, M: 2, L: 1 }

// ---------------------------------------------------------------- parsing

function parseFrontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) throw new Error(`${file}: missing frontmatter`)
  const data = {}
  let listKey = null
  for (const raw of m[1].split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const item = raw.match(/^\s+-\s+(.*)$/)
    if (item && listKey) {
      data[listKey].push(item[1].trim())
      continue
    }
    const kv = raw.match(/^([A-Za-z][\w-]*):\s*(.*)$/)
    if (!kv) throw new Error(`${file}: cannot parse frontmatter line "${raw}"`)
    const [, key, value] = kv
    if (value === '') {
      data[key] = []
      listKey = key
    } else {
      data[key] = value.replace(/^["']|["']$/g, '')
      listKey = null
    }
  }
  return { data, body: text.slice(m[0].length) }
}

function parseMeta(meta) {
  const out = { tokens: [] }
  for (const tok of meta.split(/[\s·]+/).filter(Boolean)) {
    const kv = tok.match(/^([a-z-]+):(.+)$/)
    if (kv) out[kv[1]] = kv[2]
    else if (/^\d{4}-\d{2}-\d{2}$/.test(tok)) out.date = tok
    else out.tokens.push(tok)
  }
  return out
}

function parseBody(body) {
  const sections = {}
  let current = null
  let entry = null
  const summary = []
  for (const line of body.split(/\r?\n/)) {
    const h = line.match(/^##\s+(.*)$/)
    if (h) {
      current = h[1].trim()
      sections[current] ??= { entries: [], text: [] }
      entry = null
      continue
    }
    if (!current) {
      if (!/^#\s/.test(line)) summary.push(line)
      continue
    }
    const e = line.match(/^- \*\*([RDQI]-[A-Z0-9]+-\d{3})\*\*\s*(?:\[([^\]]*)\])?\s*(.*)$/)
    if (e) {
      entry = { id: e[1], meta: parseMeta(e[2] ?? ''), text: e[3].trim(), more: [] }
      sections[current].entries.push(entry)
    } else if (entry && /^\s{2,}\S/.test(line)) {
      entry.more.push(line.trim())
    } else {
      if (line.trim()) entry = null
      sections[current].text.push(line)
    }
  }
  return { sections, summary: summary.join('\n').trim() }
}

function parseRelation(s) {
  const m = s.match(/^([a-z-]+)\s+([a-z0-9-]+)\s*(?:—|--)\s*(.*)$/)
  return m ? { type: m[1], to: m[2], note: m[3].trim() } : { invalid: s }
}

export function loadVault() {
  const nodes = []
  for (const f of readdirSync(NODES_DIR).filter((f) => f.endsWith('.md')).sort()) {
    const file = join(NODES_DIR, f)
    const { data, body } = parseFrontmatter(readFileSync(file, 'utf8'), f)
    const { sections, summary } = parseBody(body)
    const pick = (name) => sections[name]?.entries ?? []
    nodes.push({
      file: relative(ROOT, file).replace(/\\/g, '/'),
      id: data.id,
      title: data.title,
      prefix: data.prefix,
      kind: data.kind,
      status: data.status,
      scope: data.scope ?? 'local',
      reviewed: data.reviewed,
      code: data.code ?? [],
      relations: (data.relations ?? []).map(parseRelation),
      summary,
      rules: pick('Rules'),
      decisions: pick('Decisions'),
      questions: pick('Open questions'),
      ideas: pick('Ideas'),
      sections,
    })
  }
  return nodes
}

// ---------------------------------------------------------------- helpers

let fileCache
function repoFiles() {
  if (!fileCache) {
    try {
      fileCache = execSync('git ls-files -co --exclude-standard', { cwd: ROOT, encoding: 'utf8' })
        .split(/\r?\n/)
        .filter(Boolean)
    } catch {
      fileCache = []
    }
  }
  return fileCache
}

function globToRegex(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*'
      i++
      if (glob[i + 1] === '/') i++
    } else if (c === '*') re += '[^/]*'
    else if (c === '?') re += '[^/]'
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${re}$`)
}

const globCache = new Map()
function matches(glob, path) {
  if (!globCache.has(glob)) globCache.set(glob, globToRegex(glob))
  return globCache.get(glob).test(path)
}

const norm = (p) => relative(ROOT, resolve(process.cwd(), p)).replace(/\\/g, '/')
const byId = (nodes) => Object.fromEntries(nodes.map((n) => [n.id, n]))
const status = (e) => e.meta.tokens[0] ?? ''

function edges(nodes) {
  return nodes.flatMap((n) => n.relations.filter((r) => !r.invalid).map((r) => ({ from: n.id, ...r })))
}

function printEntry(e, indent = '  ') {
  const meta = [...e.meta.tokens, e.meta.date, ...Object.entries(e.meta).filter(([k]) => !['tokens', 'date'].includes(k)).map(([k, v]) => `${k}:${v}`)]
    .filter(Boolean)
    .join(' · ')
  console.log(`${indent}${e.id}${meta ? ` [${meta}]` : ''} ${e.text}`)
  for (const m of e.more) console.log(`${indent}    ${m}`)
}

// ---------------------------------------------------------------- commands

export function check(nodes, { quiet = false } = {}) {
  const errors = []
  const warnings = []
  const ids = new Map()
  const index = byId(nodes)
  const files = repoFiles()

  for (const n of nodes) {
    const where = n.file
    for (const k of ['id', 'title', 'prefix', 'kind', 'status', 'reviewed']) if (!n[k]) errors.push(`${where}: missing "${k}"`)
    if (n.id && !n.file.endsWith(`/${n.id}.md`)) errors.push(`${where}: file name must be ${n.id}.md`)
    if (n.kind && !KINDS.includes(n.kind)) errors.push(`${where}: kind "${n.kind}" not in ${KINDS.join('|')}`)
    if (n.status && !STATUSES.includes(n.status)) errors.push(`${where}: status "${n.status}" not in ${STATUSES.join('|')}`)
    if (!n.summary) warnings.push(`${where}: no summary paragraph`)

    for (const r of n.relations) {
      if (r.invalid) errors.push(`${where}: bad relation "${r.invalid}" (use "<type> <node-id> — <why>")`)
      else if (!RELATION_TYPES[r.type]) errors.push(`${where}: unknown relation type "${r.type}"`)
      else if (!index[r.to]) errors.push(`${where}: relation to unknown node "${r.to}"`)
      else if (!r.note) warnings.push(`${where}: relation ${r.type} ${r.to} has no "why"`)
    }

    for (const g of n.code) {
      if (files.length && !files.some((f) => matches(g, f))) warnings.push(`${where}: code path "${g}" matches no file (renamed or deleted?)`)
    }

    for (const [section, letter] of Object.entries(SECTIONS)) {
      for (const e of n.sections[section]?.entries ?? []) {
        const [l, prefix] = e.id.split('-')
        if (l !== letter) errors.push(`${where}: ${e.id} is under "${section}" but should start with ${letter}-`)
        if (prefix !== n.prefix) errors.push(`${where}: ${e.id} must use this node's prefix ${n.prefix}`)
        if (ids.has(e.id)) errors.push(`${where}: duplicate id ${e.id} (also in ${ids.get(e.id)})`)
        ids.set(e.id, where)
      }
    }
    for (const e of n.rules) if (!['must', 'should'].includes(status(e))) errors.push(`${where}: ${e.id} needs [must] or [should]`)
    for (const e of n.decisions) {
      if (!['confirmed', 'proposed', 'superseded'].includes(status(e))) errors.push(`${where}: ${e.id} status must be confirmed|proposed|superseded`)
      if (!e.meta.date) errors.push(`${where}: ${e.id} needs a date`)
    }
    for (const e of n.questions) if (!['open', 'answered'].includes(status(e))) errors.push(`${where}: ${e.id} status must be open|answered`)
    for (const e of n.ideas) {
      if (!['new', 'planned', 'done', 'rejected'].includes(status(e))) errors.push(`${where}: ${e.id} status must be new|planned|done|rejected`)
      if (!IMPACT[e.meta.impact]) errors.push(`${where}: ${e.id} needs impact:high|med|low`)
      if (!EFFORT[e.meta.effort]) errors.push(`${where}: ${e.id} needs effort:S|M|L`)
    }
  }

  // Cross-references inside entry text (e.g. "see R-ORD-002") must resolve.
  for (const n of nodes) {
    for (const e of [...n.rules, ...n.decisions, ...n.questions, ...n.ideas]) {
      for (const ref of `${e.text} ${e.more.join(' ')} ${Object.values(e.meta).join(' ')}`.match(/\b[RDQI]-[A-Z0-9]+-\d{3}\b/g) ?? []) {
        if (ref !== e.id && !ids.has(ref)) errors.push(`${n.file}: ${e.id} references unknown ${ref}`)
      }
    }
  }

  const connected = new Set(edges(nodes).flatMap((e) => [e.from, e.to]))
  for (const n of nodes) if (!connected.has(n.id) && n.kind !== 'meta') warnings.push(`${n.file}: orphan node (no edges)`)

  if (!quiet) {
    for (const e of errors) console.log(`ERROR   ${e}`)
    for (const w of warnings) console.log(`warning ${w}`)
    console.log(`\n${nodes.length} nodes · ${edges(nodes).length} edges · ${ids.size} entries · ${errors.length} errors · ${warnings.length} warnings`)
  }
  return { errors, warnings }
}

function rulesFor(nodes, paths) {
  const targets = paths.map(norm)
  const hit = nodes.filter((n) => n.code.some((g) => targets.some((t) => matches(g, t))))
  const global = nodes.filter((n) => n.scope === 'global' && !hit.includes(n))
  const index = byId(nodes)
  if (!hit.length) console.log(`No node claims ${targets.join(', ')} — consider adding it to a node's "code" list.\n`)
  for (const n of hit) {
    console.log(`■ ${n.id} — ${n.title}  (${n.file})`)
    for (const r of n.rules) printEntry(r)
    const neigh = n.relations.filter((r) => ['depends-on', 'constrains'].includes(r.type) && index[r.to])
    const inbound = edges(nodes).filter((e) => e.to === n.id && e.type === 'constrains')
    if (neigh.length || inbound.length) {
      console.log('  also check:')
      for (const r of neigh) console.log(`    → ${r.type} ${r.to}: ${r.note}`)
      for (const e of inbound) console.log(`    ← ${e.from} constrains this: ${e.note}`)
    }
    const pending = [...n.decisions.filter((d) => status(d) === 'proposed'), ...n.questions.filter((q) => status(q) === 'open')]
    if (pending.length) {
      console.log('  ⚠ unresolved (ask the user before contradicting):')
      for (const p of pending) printEntry(p, '    ')
    }
    console.log()
  }
  console.log('Global rules (apply everywhere):')
  for (const n of global) for (const r of n.rules) printEntry(r)
}

function impact(nodes, id) {
  const index = byId(nodes)
  const n = index[id]
  if (!n) return console.log(`Unknown node "${id}". Known: ${nodes.map((x) => x.id).join(', ')}`)
  console.log(`■ ${n.id} — ${n.title} [${n.kind}, ${n.status}]\n${n.summary}\n`)
  console.log('Outgoing:')
  for (const r of n.relations) console.log(`  → ${r.type} ${r.to} — ${r.note}`)
  console.log('Incoming:')
  for (const e of edges(nodes).filter((e) => e.to === id)) console.log(`  ← ${e.from} ${e.type} — ${e.note}`)
  const neighbours = new Set([...n.relations.map((r) => r.to), ...edges(nodes).filter((e) => e.to === id).map((e) => e.from)])
  console.log('\nRules of this node:')
  for (const r of n.rules) printEntry(r)
  console.log('\nNeighbour [must] rules a change here could break:')
  for (const nid of neighbours) for (const r of index[nid]?.rules.filter((r) => status(r) === 'must') ?? []) printEntry(r)
}

function pendingItems(nodes) {
  return nodes.flatMap((n) => [
    ...n.questions.filter((q) => status(q) === 'open').map((e) => ({ n, e, kind: 'question' })),
    ...n.decisions.filter((d) => status(d) === 'proposed').map((e) => ({ n, e, kind: 'proposed decision' })),
  ])
}

function questions(nodes) {
  const items = pendingItems(nodes)
  if (!items.length) return console.log('Nothing waiting on the user.')
  for (const { n, e, kind } of items) {
    console.log(`[${kind}] ${n.id}`)
    printEntry(e)
  }
}

function rankedIdeas(nodes, all) {
  return nodes
    .flatMap((n) => n.ideas.map((e) => ({ n, e })))
    .filter(({ e }) => all || ['new', 'planned'].includes(status(e)))
    .sort((a, b) => IMPACT[b.e.meta.impact] * EFFORT[b.e.meta.effort] - IMPACT[a.e.meta.impact] * EFFORT[a.e.meta.effort])
}

function ideas(nodes, all) {
  for (const { n, e } of rankedIdeas(nodes, all)) printEntry({ ...e, text: `(${n.id}) ${e.text}` }, '')
}

function staleNodes(nodes) {
  const out = []
  for (const n of nodes) {
    if (!n.code.length || !n.reviewed) continue
    const files = repoFiles().filter((f) => n.code.some((g) => matches(g, f)))
    if (!files.length) continue
    let last = ''
    try {
      last = execSync(`git log -1 --format=%cs -- ${files.map((f) => `"${f}"`).join(' ')}`, { cwd: ROOT, encoding: 'utf8' }).trim()
    } catch {
      /* not a git checkout */
    }
    if (last && last > n.reviewed) out.push({ n, last })
  }
  return out
}

function suggest(nodes) {
  const all = edges(nodes)
  const degree = (id) => all.filter((e) => e.from === id || e.to === id).length
  const lines = []
  for (const n of nodes) {
    if (n.kind === 'meta') continue
    if (!n.ideas.some((i) => ['new', 'planned'].includes(status(i))))
      lines.push(`${n.id}: no open ideas — study its UX and add at least one I-${n.prefix}-xxx.`)
    if (degree(n.id) >= 6 && n.rules.length < 3) lines.push(`${n.id}: hub node (${degree(n.id)} edges) with only ${n.rules.length} rules — capture the invariants other features rely on.`)
    if (!n.decisions.length) lines.push(`${n.id}: no recorded decisions — why does it work the way it does?`)
  }
  for (const { n, last } of staleNodes(nodes)) lines.push(`${n.id}: code changed ${last}, last reviewed ${n.reviewed} — re-read the code, update rules, bump "reviewed".`)
  // Pairs of features that interact (2-hop through a shared neighbour) but have no direct edge.
  const linked = new Set(all.map((e) => [e.from, e.to].sort().join('|')))
  const viaShared = {}
  for (const a of all) for (const b of all) {
    if (a.to === b.to && a.from < b.from && a.type === 'triggers' && b.type === 'triggers' && !linked.has([a.from, b.from].join('|')))
      viaShared[`${a.from}|${b.from}`] = a.to
  }
  for (const [pair, via] of Object.entries(viaShared).slice(0, 5))
    lines.push(`${pair.replace('|', ' + ')} both trigger ${via} — is there a combined experience worth designing?`)
  if (!lines.length) lines.push('The graph looks healthy. Walk one customer journey end to end and record what felt slow.')
  for (const l of lines) console.log(`• ${l}`)
}

function brief(nodes) {
  const { errors } = check(nodes, { quiet: true })
  const pending = pendingItems(nodes)
  console.log(`KNOWLEDGE VAULT — ${nodes.length} features, ${edges(nodes).length} relations, ${nodes.reduce((s, n) => s + n.rules.length, 0)} rules.`)
  console.log('Before changing code: read vault/PROTOCOL.md, then run `node vault/tools/vault.mjs rules <files>`.')
  console.log('If a change contradicts a rule or an unresolved item below, STOP and ask the user; record the answer as a decision.')
  if (errors.length) console.log(`⚠ vault has ${errors.length} integrity errors — run \`node vault/tools/vault.mjs check\`.`)
  if (pending.length) {
    console.log(`\nWaiting on the user (${pending.length}):`)
    for (const { n, e, kind } of pending.slice(0, 8)) console.log(`  - ${e.id} (${n.id}, ${kind}): ${e.text.slice(0, 140)}`)
  }
  const stale = staleNodes(nodes)
  if (stale.length) console.log(`\nStale nodes (code changed since review): ${stale.map((s) => s.n.id).join(', ')}`)
  const top = rankedIdeas(nodes, false).slice(0, 3)
  if (top.length) {
    console.log('\nTop improvement ideas:')
    for (const { n, e } of top) console.log(`  - ${e.id} (${n.id}): ${e.text.slice(0, 120)}`)
  }
}

// ---------------------------------------------------------------- build

function build(nodes) {
  const { errors } = check(nodes, { quiet: true })
  if (errors.length) {
    check(nodes)
    console.log('\nFix the errors before building.')
    process.exit(1)
  }
  const graph = {
    generated: 'by vault/tools/vault.mjs build — do not edit by hand',
    relationTypes: RELATION_TYPES,
    nodes: nodes.map(({ sections, ...n }) => n),
    edges: edges(nodes),
  }
  writeFileSync(join(VAULT, 'graph.json'), JSON.stringify(graph, null, 2) + '\n')

  const md = []
  md.push('# Vault index', '', '> Generated by `node vault/tools/vault.mjs build`. Do not edit by hand; edit the node files.', '')
  md.push('## Nodes', '', '| Node | Kind | Status | Rules | Decisions | Open Qs | Ideas | Reviewed |', '|---|---|---|---|---|---|---|---|')
  for (const n of nodes)
    md.push(`| [${n.title}](nodes/${n.id}.md) \`${n.id}\` | ${n.kind} | ${n.status} | ${n.rules.length} | ${n.decisions.length} | ${n.questions.filter((q) => status(q) === 'open').length} | ${n.ideas.filter((i) => ['new', 'planned'].includes(status(i))).length} | ${n.reviewed} |`)
  md.push('', '## Relations', '', '```mermaid', 'graph LR')
  for (const e of edges(nodes)) md.push(`  ${e.from.replace(/-/g, '_')} -->|${e.type}| ${e.to.replace(/-/g, '_')}`)
  md.push('```', '')
  const pending = pendingItems(nodes)
  md.push('## Waiting on the user', '')
  if (!pending.length) md.push('_Nothing._')
  for (const { n, e, kind } of pending) md.push(`- **${e.id}** (${kind}, [${n.id}](nodes/${n.id}.md)) ${e.text}`)
  md.push('', '## Must-rules', '')
  for (const n of nodes) for (const r of n.rules.filter((r) => status(r) === 'must')) md.push(`- **${r.id}** ([${n.id}](nodes/${n.id}.md)) ${r.text}`)
  md.push('', '## Idea backlog (best value first)', '')
  for (const { n, e } of rankedIdeas(nodes, false)) md.push(`- **${e.id}** · impact:${e.meta.impact} · effort:${e.meta.effort} · [${n.id}](nodes/${n.id}.md) — ${e.text}`)
  writeFileSync(join(VAULT, 'INDEX.md'), md.join('\n') + '\n')

  const template = readFileSync(join(VAULT, 'tools', 'graph.template.html'), 'utf8')
  writeFileSync(join(VAULT, 'graph.html'), template.replace('/*__GRAPH__*/null', JSON.stringify(graph).replace(/</g, '\\u003c')))
  console.log(`Built INDEX.md, graph.json, graph.html — ${nodes.length} nodes, ${graph.edges.length} edges.`)
}

function nextId(nodes, nodeId, letter) {
  const n = byId(nodes)[nodeId]
  if (!n || !SECTIONS[Object.keys(SECTIONS).find((k) => SECTIONS[k] === letter)]) return console.log('usage: next-id <node-id> <R|D|Q|I>')
  const used = nodes.flatMap((x) => [...x.rules, ...x.decisions, ...x.questions, ...x.ideas]).map((e) => e.id).filter((id) => id.startsWith(`${letter}-${n.prefix}-`))
  const max = Math.max(0, ...used.map((id) => Number(id.split('-')[2])))
  console.log(`${letter}-${n.prefix}-${String(max + 1).padStart(3, '0')}`)
}

// ---------------------------------------------------------------- main

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd = 'brief', ...args] = process.argv.slice(2)
  if (!existsSync(NODES_DIR)) {
    console.error(`No nodes directory at ${NODES_DIR}`)
    process.exit(1)
  }
  const nodes = loadVault()
  switch (cmd) {
    case 'brief': brief(nodes); break
    case 'check': process.exitCode = check(nodes).errors.length ? 1 : 0; break
    case 'build': build(nodes); break
    case 'rules': rulesFor(nodes, args); break
    case 'impact': impact(nodes, args[0]); break
    case 'questions': questions(nodes); break
    case 'ideas': ideas(nodes, args.includes('--all')); break
    case 'stale': for (const { n, last } of staleNodes(nodes)) console.log(`${n.id}: code ${last} > reviewed ${n.reviewed}`); break
    case 'suggest': suggest(nodes); break
    case 'next-id': nextId(nodes, args[0], args[1]); break
    default: console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 20).join('\n'))
  }
}
