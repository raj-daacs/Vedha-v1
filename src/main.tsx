import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Order matters: tokens define the custom properties everything else consumes.
import './styles/tokens.css'
import './styles/global.css'
import './styles/shell.css'
import './styles/entry.css'
import './styles/build.css'
import './styles/plan.css'
import './styles/view.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
