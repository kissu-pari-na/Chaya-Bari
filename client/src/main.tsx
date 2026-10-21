import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { registerServiceWorker } from './lib/push'
import { installMotion } from './lib/motion'
import './fonts.css'
// Design system (see /design.md): tokens → generated palettes → base → glass components.
import './styles/tokens.css'
import './styles/palettes.css'
import './index.css'
import './styles/glass.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Delegated, app-wide motion: cursor spotlight, below-the-fold reveal, nav compress.
installMotion()

// Register the service worker so Web Push can deliver OS-level notifications.
void registerServiceWorker()
