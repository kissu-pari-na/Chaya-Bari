import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

// Minimal typings for the Google Identity Services (GIS) client we use. The
// script is loaded on demand; only the pieces we call are declared here.
interface GoogleCredentialResponse {
  credential: string
}
interface GoogleIdApi {
  initialize(config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }): void
  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon'
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      logo_alignment?: 'left' | 'center'
      width?: number
    },
  ): void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } }
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/// Whether Google sign-in is configured. Pages use this to decide whether to
/// show the "or" divider alongside the button.
export const isGoogleEnabled = !!CLIENT_ID

/// Loads the GIS script once and resolves when window.google is available.
function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')))
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
}

interface Props {
  /// Called with the Google ID token (credential) once the user picks an account.
  onCredential: (credential: string) => void
  /// Called if the credential exchange with our server fails, so the parent can
  /// show a message. The GIS button handles its own UI otherwise.
  onError?: (message: string) => void
  /// Wording on the button.
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

/// "Continue with Google" button. Renders nothing when no client ID is
/// configured (VITE_GOOGLE_CLIENT_ID unset), so the app works without Google.
export function GoogleSignInButton({ onCredential, onError, text = 'continue_with' }: Props) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  // Keep the latest callback without re-initializing the button on each render.
  const cbRef = useRef(onCredential)
  cbRef.current = onCredential

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false
    // Track the width we last drew at so a resize only re-renders on change.
    let lastWidth = 0

    // Draw the GIS button sized to the container. GIS renders a fixed-width
    // button and the filled themes can render a touch wider than requested, so
    // we leave a small inset on each side and clamp to GIS's own 200–400 range.
    // This keeps the button (including the personalized "Sign in as …" variant)
    // centered within the card instead of reaching its rounded edges.
    function draw() {
      const el = containerRef.current
      if (cancelled || !el || !window.google) return
      const inset = 24
      const width = Math.max(200, Math.min((el.clientWidth || 320) - inset, 400))
      lastWidth = el.clientWidth
      el.innerHTML = ''
      window.google.accounts.id.renderButton(el, {
        type: 'standard',
        theme: theme === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        text,
        shape: 'pill',
        logo_alignment: 'center',
        width,
      })
    }

    let observer: ResizeObserver | undefined
    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (res) => cbRef.current(res.credential),
        })
        draw()
        // Keep the button in step with the card as it responds to viewport
        // changes, so it never renders wider than its container.
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => {
            const el = containerRef.current
            if (el && el.clientWidth !== lastWidth) draw()
          })
          observer.observe(containerRef.current)
        }
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
        onError?.('Could not load Google sign-in.')
      })

    return () => {
      cancelled = true
      observer?.disconnect()
    }
    // Re-render the button when the theme changes so it matches light/dark.
  }, [theme, text, onError])

  if (!CLIENT_ID || failed) return null

  return <div ref={containerRef} className="google-signin" />
}
