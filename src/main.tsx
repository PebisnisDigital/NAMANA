import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// The public home page has a resilient HTML intro for browsers that cannot load React.
// All Studio, client, and administrative routes retain their existing React application.
if (window.location.pathname !== '/') {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
