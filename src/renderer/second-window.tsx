import React from 'react';
import ReactDOM from 'react-dom/client';
import SecondWindow from './components/SecondWindow';
import './styles/global.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <SecondWindow />
  </React.StrictMode>
);
