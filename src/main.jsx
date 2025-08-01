// src/main.jsx - Protected version
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { setupConsoleProtection, addSourceProtectionWarning } from './utils/consoleProtection';

// Set up protection before React app loads
if (process.env.NODE_ENV === 'production') {
  setupConsoleProtection();
  addSourceProtectionWarning();
  
  // Additional early protection
  window.addEventListener('keydown', function(e) {
    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
        (e.ctrlKey && e.keyCode === 85)) {
      e.preventDefault();
      window.location.href = '/unauthorized';
      return false;
    }
  });
  
  // Disable right-click
  window.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });
  
  // Clear any existing console content
  console.clear();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);