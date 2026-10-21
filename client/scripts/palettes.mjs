#!/usr/bin/env node
// Palette source of truth for the Glossy Glass design system (see /design.md §3).
//
//   node scripts/palettes.mjs          verify contrast, then write the generated files
//   node scripts/palettes.mjs --check  verify contrast only (exit 1 on failure)
//
// Generates:
//   src/styles/palettes.css   light/dark token blocks per palette (selector order matters, §3.1)
//   src/lib/palettes.gen.ts   ids, bilingual names and swatch stops for the palette picker
//   index.html                the palette id list used by the no-flash <head> script
//
// Never edit the generated files by hand. Change the data below and re-run.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// The default palette (no data-palette attribute) is the brand palette, Ember.
export const DEFAULT_PALETTE = 'ember'

// Each palette: light + dark. grad/hgrad = 3 stops, btn = 2 stops, aur = 4 rgba blobs.
// `text`/`muted` are optional per-palette overrides of the shared neutrals.
export const PALETTES = [
  {
    id: 'ember',
    bn: 'অঙ্গার ও সোনা',
    en: 'Ember & Gold',
    light: {
      canvas: '#FAF5EF', canvas2: '#FFFBF7', accent: '#C8302A', accentInk: '#A3261F',
      grad: ['#C8302A', '#E0612A', '#E5A21F'], hgrad: ['#B3261F', '#A0410F', '#855A06'],
      btn: ['#C62C26', '#9E2A1A'], onAccent: '#FFFFFF',
      aur: ['rgba(200,48,42,.20)', 'rgba(224,97,42,.16)', 'rgba(229,162,31,.16)', 'rgba(255,214,170,.34)'],
      text: '#1D1512', muted: '#5C5049',
    },
    dark: {
      canvas: '#0B0908', canvas2: '#141010', glassSolid: '#1B1514', accent: '#FF6B5E', accentInk: '#F5C04A',
      grad: ['#E4322B', '#F27A1A', '#F5B300'], hgrad: ['#FF6B5E', '#FF9A3D', '#F5B300'],
      btn: ['#D62D26', '#A9241D'], onAccent: '#FFFFFF',
      aur: ['rgba(228,50,43,.24)', 'rgba(242,122,26,.12)', 'rgba(245,179,0,.08)', 'rgba(122,28,23,.30)'],
      text: '#F5F1E7', muted: '#B9AFA5',
    },
  },
  {
    id: 'sapphire',
    bn: 'নীলকান্ত লেগুন',
    en: 'Sapphire Lagoon',
    light: {
      canvas: '#F1F5FB', canvas2: '#F9FBFE', accent: '#3966CF', accentInk: '#2F5BC2',
      grad: ['#3966CF', '#1E9CB6', '#26AC86'], hgrad: ['#3966CF', '#17798E', '#1C7D62'],
      btn: ['#3966CF', '#187C91'], onAccent: '#FFFFFF',
      aur: ['rgba(57,102,207,.22)', 'rgba(30,156,182,.18)', 'rgba(38,172,134,.15)', 'rgba(255,211,189,.34)'],
    },
    dark: {
      canvas: '#070B18', canvas2: '#0C1226', glassSolid: '#10172E', accent: '#83B0F6', accentInk: '#83B0F6',
      grad: ['#83B0F6', '#5ACBDB', '#63D4AD'], hgrad: ['#83B0F6', '#5ACBDB', '#63D4AD'],
      btn: ['#83B0F6', '#5ACBDB'], onAccent: '#06101F',
      aur: ['rgba(55,101,209,.26)', 'rgba(29,157,183,.15)', 'rgba(37,173,135,.10)', 'rgba(29,45,83,.30)'],
    },
  },
  {
    id: 'emerald',
    bn: 'পান্না বাগান',
    en: 'Emerald Garden',
    light: {
      canvas: '#F0F6F2', canvas2: '#F8FCF9', accent: '#158360', accentInk: '#126E51',
      grad: ['#158360', '#2BA77B', '#7CB742'], hgrad: ['#147C5B', '#207D5C', '#51782B'],
      btn: ['#15815F', '#21805E'], onAccent: '#FFFFFF',
      aur: ['rgba(21,131,96,.22)', 'rgba(43,167,123,.18)', 'rgba(124,183,66,.15)', 'rgba(246,227,180,.34)'],
    },
    dark: {
      canvas: '#06110C', canvas2: '#0A1A13', glassSolid: '#0F231A', accent: '#56CE9E', accentInk: '#56CE9E',
      grad: ['#56CE9E', '#86DCBA', '#B5DC81'], hgrad: ['#56CE9E', '#86DCBA', '#B5DC81'],
      btn: ['#56CE9E', '#86DCBA'], onAccent: '#06101F',
      aur: ['rgba(20,132,97,.26)', 'rgba(41,169,123,.15)', 'rgba(124,184,65,.10)', 'rgba(24,88,68,.30)'],
    },
  },
  {
    id: 'coral',
    bn: 'প্রবাল সন্ধ্যা',
    en: 'Coral Sunset',
    light: {
      canvas: '#FAF3F0', canvas2: '#FFF9F6', accent: '#C85780', accentInk: '#A93760',
      grad: ['#C85780', '#E17D67', '#E59E60'], hgrad: ['#BE3E6D', '#C24226', '#A55C1B'],
      btn: ['#C14371', '#C94528'], onAccent: '#FFFFFF',
      aur: ['rgba(200,87,128,.22)', 'rgba(225,125,103,.18)', 'rgba(229,158,96,.15)', 'rgba(255,214,196,.34)'],
    },
    dark: {
      canvas: '#12080B', canvas2: '#1B0E12', glassSolid: '#24141A', accent: '#ED9EB6', accentInk: '#ED9EB6',
      grad: ['#ED9EB6', '#F0B994', '#EECD85'], hgrad: ['#ED9EB6', '#F0B994', '#EECD85'],
      btn: ['#ED9EB6', '#F0B994'], onAccent: '#06101F',
      aur: ['rgba(202,85,128,.26)', 'rgba(226,124,102,.15)', 'rgba(230,158,95,.10)', 'rgba(79,33,50,.30)'],
    },
  },
  {
    id: 'orchid',
    bn: 'রাজকীয় অর্কিড',
    en: 'Royal Orchid',
    light: {
      canvas: '#F5F2FA', canvas2: '#FBF9FD', accent: '#774DCD', accentInk: '#7043CA',
      grad: ['#774DCD', '#AC44BC', '#D56298'], hgrad: ['#774DCD', '#A741B6', '#C33478'],
      btn: ['#774DCD', '#AC44BC'], onAccent: '#FFFFFF',
      aur: ['rgba(119,77,205,.22)', 'rgba(172,68,188,.18)', 'rgba(213,98,152,.15)', 'rgba(227,214,251,.34)'],
    },
    dark: {
      canvas: '#0C0817', canvas2: '#140E22', glassSolid: '#1B142D', accent: '#B7A2F8', accentInk: '#B7A2F8',
      grad: ['#B7A2F8', '#DB93EB', '#EFB4D2'], hgrad: ['#B7A2F8', '#DB93EB', '#EFB4D2'],
      btn: ['#B7A2F8', '#DB93EB'], onAccent: '#06101F',
      aur: ['rgba(118,75,207,.26)', 'rgba(173,67,189,.15)', 'rgba(214,97,151,.10)', 'rgba(47,31,81,.30)'],
    },
  },
  {
    id: 'amber',
    bn: 'সোনালি বিকেল',
    en: 'Golden Hour',
    light: {
      canvas: '#FAF6EE', canvas2: '#FFFCF6', accent: '#AE6519', accentInk: '#905315',
      grad: ['#AE6519', '#CC8823', '#CDA334'], hgrad: ['#A35F17', '#98651A', '#886C21'],
      btn: ['#A76118', '#9B671B'], onAccent: '#FFFFFF',
      aur: ['rgba(174,101,25,.22)', 'rgba(204,136,35,.18)', 'rgba(205,163,52,.15)', 'rgba(251,226,190,.34)'],
    },
    dark: {
      canvas: '#100B05', canvas2: '#19130A', glassSolid: '#22190E', accent: '#EBBD56', accentInk: '#EBBD56',
      grad: ['#EBBD56', '#ECCC78', '#ECD99B'], hgrad: ['#EBBD56', '#ECCC78', '#ECD99B'],
      btn: ['#EBBD56', '#ECCC78'], onAccent: '#06101F',
      aur: ['rgba(176,101,23,.26)', 'rgba(206,136,33,.15)', 'rgba(206,164,51,.10)', 'rgba(89,57,23,.30)'],
    },
  },
  {
    id: 'teal',
    bn: 'তাজা পুদিনা',
    en: 'Fresh Mint',
    light: {
      canvas: '#EFF6F5', canvas2: '#F8FBFB', accent: '#198E83', accentInk: '#136D65',
      grad: ['#198E83', '#24A581', '#44BFAE'], hgrad: ['#167B71', '#1B7D62', '#2A7B70'],
      btn: ['#167E75', '#1C8064'], onAccent: '#FFFFFF',
      aur: ['rgba(25,142,131,.22)', 'rgba(36,165,129,.18)', 'rgba(68,191,174,.15)', 'rgba(205,239,233,.34)'],
    },
    dark: {
      canvas: '#051110', canvas2: '#091A18', glassSolid: '#0D2320', accent: '#47C6B5', accentInk: '#47C6B5',
      grad: ['#47C6B5', '#59CDA0', '#7FDCCE'], hgrad: ['#47C6B5', '#59CDA0', '#7FDCCE'],
      btn: ['#47C6B5', '#59CDA0'], onAccent: '#06101F',
      aur: ['rgba(24,143,133,.26)', 'rgba(34,167,130,.15)', 'rgba(67,192,175,.10)', 'rgba(25,87,82,.30)'],
    },
  },
]

// Shared neutrals (design.md §3.2). Palettes may override text/muted.
export const NEUTRAL = {
  light: { text: '#0B1530', muted: '#45526B' },
  dark: { text: '#E8EDF7', muted: '#A3AEC6' },
}

// Minimum ratios (design.md §3.4). `muted` is our addition for secondary copy.
const MIN = {
  light: { text: 14, muted: 4.5, accentInk: 5.6, hgrad: 4.6, onAccent: 4.8, accent: 3.5 },
  dark: { text: 14, muted: 4.5, accentInk: 7.8, hgrad: 4.6, onAccent: 4.8, accent: 3.5 },
}

// ---------------------------------------------------------------- contrast

function lum(hex) {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

function verify() {
  const failures = []
  const rows = []
  for (const p of PALETTES) {
    for (const mode of ['light', 'dark']) {
      const t = p[mode]
      const text = t.text ?? NEUTRAL[mode].text
      const muted = t.muted ?? NEUTRAL[mode].muted
      const checks = [
        ['text', text, t.canvas],
        ['muted', muted, t.canvas],
        ['accentInk', t.accentInk, t.canvas],
        ['accent', t.accent, t.canvas],
        ...t.hgrad.map((s, i) => [`hgrad`, s, t.canvas, i]),
        ...t.btn.map((s, i) => [`onAccent`, t.onAccent, s, i]),
      ]
      for (const [key, fg, bg, i] of checks) {
        const r = ratio(fg, bg)
        const need = MIN[mode][key]
        const label = `${p.id}/${mode} ${key}${i != null ? `[${i}]` : ''}`
        rows.push(`${r >= need ? 'ok  ' : 'FAIL'} ${label.padEnd(30)} ${r.toFixed(2)} (min ${need})`)
        if (r < need) failures.push(label)
      }
    }
  }
  return { failures, rows }
}

// ---------------------------------------------------------------- generate

const hexA = (hex, a) => {
  const n = hex.replace('#', '')
  return `rgba(${parseInt(n.slice(0, 2), 16)},${parseInt(n.slice(2, 4), 16)},${parseInt(n.slice(4, 6), 16)},${a})`
}

function block(t, mode, withText) {
  const soft = mode === 'light' ? 0.1 : 0.14
  const lines = [
    `--canvas: ${t.canvas};`,
    `--canvas-2: ${t.canvas2};`,
    `--accent: ${t.accent};`,
    `--accent-ink: ${t.accentInk};`,
    `--accent-soft: ${hexA(t.accent, soft)};`,
    `--accent-soft-2: ${hexA(t.accent, soft * 2)};`,
    `--grad: linear-gradient(120deg, ${t.grad[0]} 0%, ${t.grad[1]} 55%, ${t.grad[2]} 100%);`,
    `--h-grad: linear-gradient(110deg, ${t.hgrad[0]}, ${t.hgrad[1]}, ${t.hgrad[2]}, ${t.hgrad[1]}, ${t.hgrad[0]});`,
    `--btn-grad: linear-gradient(120deg, ${t.btn[0]} 0%, ${t.btn[1]} 100%);`,
    `--btn-solid: ${t.btn[0]};`,
    `--on-accent: ${t.onAccent};`,
    `--btn-glow: ${hexA(t.btn[0], mode === 'light' ? 0.32 : 0.3)};`,
    `--spot: ${hexA(t.accent, mode === 'light' ? 0.1 : 0.12)};`,
    ...t.aur.map((a, i) => `--aur-${i + 1}: ${a};`),
  ]
  if (t.glassSolid) lines.push(`--glass-solid: ${t.glassSolid};`)
  if (withText) {
    lines.push(`--text: ${t.text ?? NEUTRAL[mode].text};`, `--muted: ${t.muted ?? NEUTRAL[mode].muted};`)
  }
  return lines.map((l) => `  ${l}`).join('\n')
}

function sel(p, prefix) {
  // The default palette also matches when no data-palette attribute is set.
  return p.id === DEFAULT_PALETTE
    ? `${prefix}:not([data-palette]),\n${prefix}[data-palette='${p.id}']`
    : `${prefix}[data-palette='${p.id}']`
}

function css() {
  const out = [
    '/* GENERATED by client/scripts/palettes.mjs. Do not edit; change the data and re-run.',
    '   Cascade (design.md §3.1): neutral light tokens on :root (0,1,0) and the neutral dark',
    '   base (0,2,0) live in tokens.css. Light palette blocks here are (0,2,0); dark palette',
    '   blocks are (0,3,0), so they always win over the dark base. A palette that overrides',
    '   --text in light mode must override it in dark mode too (Ember does). */',
    '',
    '/* ---------- Light palettes (specificity 0,2,0) ---------- */',
  ]
  for (const p of PALETTES) out.push(`${sel(p, ':root')} {\n${block(p.light, 'light', !!p.light.text)}\n}`, '')
  out.push('/* ---------- Dark palettes (specificity 0,3,0, beats the dark base) ---------- */')
  out.push('@media (prefers-color-scheme: dark) {')
  for (const p of PALETTES) {
    out.push(
      `  ${sel(p, ":root:not([data-theme='light'])").replace(/\n/g, '\n  ')} {\n${block(p.dark, 'dark', !!p.dark.text).replace(/^/gm, '  ')}\n  }`,
    )
  }
  out.push('}', '')
  for (const p of PALETTES) out.push(`${sel(p, ":root[data-theme='dark']")} {\n${block(p.dark, 'dark', !!p.dark.text)}\n}`, '')
  return out.join('\n')
}

function ts() {
  const items = PALETTES.map(
    (p) =>
      `  { id: '${p.id}', bn: '${p.bn}', en: '${p.en}', light: ${JSON.stringify(p.light.grad)}, dark: ${JSON.stringify(p.dark.grad)} },`,
  )
  return [
    '// GENERATED by client/scripts/palettes.mjs. Do not edit; change the data and re-run.',
    '',
    `export type PaletteId = ${PALETTES.map((p) => `'${p.id}'`).join(' | ')}`,
    '',
    'export interface PaletteInfo {',
    '  id: PaletteId',
    '  bn: string',
    '  en: string',
    '  /** The three --grad stops, for swatch orbs. */',
    '  light: string[]',
    '  dark: string[]',
    '}',
    '',
    `export const DEFAULT_PALETTE: PaletteId = '${DEFAULT_PALETTE}'`,
    '',
    'export const PALETTES: PaletteInfo[] = [',
    ...items,
    ']',
    '',
  ].join('\n')
}

const { failures, rows } = verify()
if (process.argv.includes('--verbose') || failures.length) console.log(rows.join('\n'))
if (failures.length) {
  console.error(`\n${failures.length} contrast failures. Adjust the stops and re-run.`)
  process.exit(1)
}
console.log(`Contrast: all ${rows.length} checks pass across ${PALETTES.length} palettes × light/dark.`)
if (!process.argv.includes('--check')) {
  writeFileSync(join(ROOT, 'src/styles/palettes.css'), css())
  writeFileSync(join(ROOT, 'src/lib/palettes.gen.ts'), ts())
  // Default palette first: the head script treats ids[0] as "no attribute".
  const ids = [DEFAULT_PALETTE, ...PALETTES.map((p) => p.id).filter((id) => id !== DEFAULT_PALETTE)]
  const htmlPath = join(ROOT, 'index.html')
  const html = readFileSync(htmlPath, 'utf8')
  const marker = /\/\*PALETTE_IDS\*\/.*?\/\*END_PALETTE_IDS\*\//
  if (!marker.test(html)) throw new Error('index.html is missing the /*PALETTE_IDS*/ marker')
  writeFileSync(htmlPath, html.replace(marker, `/*PALETTE_IDS*/${JSON.stringify(ids)}/*END_PALETTE_IDS*/`))
  console.log('Wrote src/styles/palettes.css, src/lib/palettes.gen.ts and the id list in index.html')
}
