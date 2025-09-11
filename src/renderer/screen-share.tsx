import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import ScreenShareWindow from './components/ScreenShareWindow';
import './styles/global.css';
import { ScreenShareElectronAPI } from '../types/preload';
import { ScreenShareWindowConfig } from '../modules/screenShareWindow';
import { isDev } from '../modules/config';

interface ScreenShareConfig {
  mode: 'NORMAL' | 'STREAMLITE';
  isWhiteboardActive: boolean;
  meetingId: string;
}

declare global {
  interface Window {
    screenShareElectronAPI: ScreenShareElectronAPI;
  }
}

const ScreenShareApp: React.FC = () => {
  const [config, setConfig] = useState<ScreenShareWindowConfig | null>(null);

  useEffect(() => {
    // Listen for config from main process
    const handleConfig = async () => {
      const config =
        (await window?.screenShareElectronAPI?.getScreenShareConfig()) as {
          type: 'SUCCESS' | 'ERROR';
          error?: string;
          payload?: ScreenShareWindowConfig;
        };
      if (config.type === 'SUCCESS') {
        setConfig(config.payload as ScreenShareWindowConfig);
      } else {
        setConfig(null);
      }
    };
    handleConfig();
  }, []);

  if (!config) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Loading...
      </div>
    );
  }

  return config ? <ScreenShareWindow config={config} /> : null;
};

// @ts-ignore
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

if (!isDev()) {
  root.render(
    <React.StrictMode>
      <ScreenShareApp />
    </React.StrictMode>
  );
} else {
  root.render(<ScreenShareApp />);
}
