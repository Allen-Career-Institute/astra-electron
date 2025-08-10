import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';

// @ts-ignore
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <div>Hello World</div>
  </React.StrictMode>
);
