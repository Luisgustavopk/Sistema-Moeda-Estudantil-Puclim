import { StrictMode } from 'react'
import '@fontsource/bricolage-grotesque/400.css'
import '@fontsource/bricolage-grotesque/600.css'
import '@fontsource/bricolage-grotesque/800.css'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { AppProviders } from './app/providers'
import './styles/globals.css'
import './styles/profile-layout.css'
import './styles/form-controls.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
