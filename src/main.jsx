import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

const container = document.getElementById('root')
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// Prerendered pages arrive with HTML already in #root → hydrate it.
// App-shell routes (cart, checkout, account…) arrive empty → render.
if (container.hasChildNodes()) hydrateRoot(container, app)
else createRoot(container).render(app)
