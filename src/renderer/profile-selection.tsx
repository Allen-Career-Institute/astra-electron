import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import { isDev } from '../modules/config';
import ProfileSelectionWindow from './components/ProfileSelection';

const ProfileSelectionApp: React.FC = () => {
  return <ProfileSelectionWindow />;
};

// @ts-ignore
const root = ReactDOM.createRoot(
  document.getElementById('profile-selection-root') as HTMLElement
);

if (!isDev()) {
  root.render(
    <React.StrictMode>
      <ProfileSelectionApp />
    </React.StrictMode>
  );
} else {
  root.render(<ProfileSelectionApp />);
}
