import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Cleanup PWA remnants
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister().then(function(boolean) {
        console.log('Service worker unregistered:', boolean);
      });
    }
  }).catch(error => {
    console.warn('Error unregistering service workers:', error);
  });
}

createRoot(document.getElementById('root')).render(
  <App />
)
