import React from 'react';
import ReactDOM from 'react-dom/client';
import ThirdWindow from './components/ThirdWindow';
import './styles/global.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ThirdWindow />
  </React.StrictMode>
);
