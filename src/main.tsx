import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  // Register custom sw which imports the generated sw and adds fallbacks
  navigator.serviceWorker.register('/sw-custom.js')
    .then(() => console.log("Service Worker registrado"))
    .catch(err => console.log("Error al registrar SW:", err));
}
