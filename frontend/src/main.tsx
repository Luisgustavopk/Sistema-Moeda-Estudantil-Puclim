import { StrictMode } from 'react'
import '@fontsource/bricolage-grotesque/400.css'
import '@fontsource/bricolage-grotesque/500.css'
import '@fontsource/bricolage-grotesque/600.css'
import '@fontsource/bricolage-grotesque/700.css'
import '@fontsource/bricolage-grotesque/800.css'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { AppProviders } from './app/providers'
import './styles/globals.css'
import './styles/profile-layout.css'
import './styles/form-controls.css'
import './styles/refinements.css'
import './styles/workspace.css'
import './styles/gamification-rewards.css'
import './styles/profile-titles.css'
import './styles/reward-unlocks.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
