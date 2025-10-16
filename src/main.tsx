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
  // Register only the Firebase messaging service worker
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(() => console.log("Firebase Messaging Service Worker registrado"))
    .catch(err => console.log("Error al registrar SW:", err));
}
