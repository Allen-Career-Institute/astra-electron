import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <div>Hello World</div>
  </React.StrictMode>
);

// Add global error handler to catch any undefined variable errors
window.addEventListener('error', event => {
  console.warn('Global error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });

  // Log additional details for dragEvent errors
  if (event.message.includes('dragEvent')) {
    console.warn(
      'dragEvent error detected - likely from browser extension or third-party library'
    );
  }
});
