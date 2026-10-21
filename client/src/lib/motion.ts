import { prefersReducedMotion } from './appearance'

/// Surfaces that reveal on scroll when they start below the fold.
const REVEAL = '.card, .paper, .pcard, .review, .trust__tile, .promo, .section-head, .stat'
/// Surfaces that carry the cursor spotlight (--mx/--my).
const SPOT = '.glass, .card, .pcard'

let installed = false

/// Installs the app-wide, delegated motion layer once:
///  - cursor spotlight on glass cards (pointer devices only)
///  - below-the-fold entrance reveal (once per element, 80ms stagger)
///  - header compress on scroll
///  - pointer tilt + glare on [data-tilt] elements
/// Everything is transform/opacity only and is skipped under reduced motion.
export function installMotion() {
  if (installed || typeof window === 'undefined') return
  installed = true
  const root = document.documentElement

  // Low-motion devices: stop decorative loops and use solid glass.
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } }
  if ((nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) || nav.connection?.saveData) {
    root.classList.add('low-motion')
  }

  // ---- Header compress on scroll
  let ticking = false
  const onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      root.classList.toggle('scrolled', window.scrollY > 8)
      ticking = false
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches

  // ---- Spotlight + tilt (one delegated listener)
  if (fine) {
    let tilted: HTMLElement | null = null
    document.addEventListener(
      'pointermove',
      (e) => {
        const target = e.target as Element | null
        const card = target?.closest?.(SPOT) as HTMLElement | null
        if (card) {
          const r = card.getBoundingClientRect()
          card.style.setProperty('--mx', `${e.clientX - r.left}px`)
          card.style.setProperty('--my', `${e.clientY - r.top}px`)
        }
        if (prefersReducedMotion() || root.classList.contains('low-motion')) return
        const tilt = target?.closest?.('[data-tilt]') as HTMLElement | null
        if (tilted && tilted !== tilt) resetTilt(tilted)
        tilted = tilt
        if (tilt) {
          const r = tilt.getBoundingClientRect()
          const px = (e.clientX - r.left) / r.width - 0.5
          const py = (e.clientY - r.top) / r.height - 0.5
          tilt.style.setProperty('--rx', `${(-py * 18).toFixed(2)}deg`)
          tilt.style.setProperty('--ry', `${(px * 22).toFixed(2)}deg`)
          tilt.style.setProperty('--gx', `${e.clientX - r.left}px`)
          tilt.style.setProperty('--gy', `${e.clientY - r.top}px`)
          tilt.dataset.tilting = 'true'
        }
      },
      { passive: true },
    )
    document.addEventListener('pointerleave', () => tilted && resetTilt(tilted))
  }

  // ---- Below-the-fold reveal
  if (!('IntersectionObserver' in window)) return
  const seen = new WeakSet<Element>()
  const io = new IntersectionObserver(
    (entries) => {
      let i = 0
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        io.unobserve(el)
        el.style.transitionDelay = `${Math.min(i++, 6) * 80}ms`
        el.classList.add('reveal-in')
        el.classList.remove('reveal-pending')
        const done = () => {
          el.classList.remove('reveal-in')
          el.style.transitionDelay = ''
        }
        el.addEventListener('transitionend', done, { once: true })
        window.setTimeout(done, 1600)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  )

  const consider = (el: Element) => {
    if (seen.has(el)) return
    seen.add(el)
    if (prefersReducedMotion()) return
    // Only elements that start below the fold get the hidden state; first-paint
    // content is never left at opacity 0.
    if (el.getBoundingClientRect().top > window.innerHeight) {
      el.classList.add('reveal-pending')
      io.observe(el)
    }
  }
  const scan = (node: ParentNode) => {
    if (node instanceof Element && node.matches(REVEAL)) consider(node)
    node.querySelectorAll?.(REVEAL).forEach(consider)
  }

  new MutationObserver((records) => {
    for (const rec of records) rec.addedNodes.forEach((n) => n instanceof Element && scan(n))
  }).observe(document.body, { childList: true, subtree: true })
  scan(document.body)
}

function resetTilt(el: HTMLElement) {
  el.style.setProperty('--rx', '0deg')
  el.style.setProperty('--ry', '0deg')
  delete el.dataset.tilting
}
