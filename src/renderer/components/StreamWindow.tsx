import React, { useEffect, useRef, useState } from 'react';
import { useElectronAPI } from '../hooks/useElectronAPI';
import AgoraStream from './AgoraStream';
import './StreamWindow.css';

interface StreamWindowProps {
  isVisible: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

const StreamWindow: React.FC<StreamWindowProps> = ({
  isVisible,
  onClose,
  onMinimize,
}) => {
  const [agoraConfig, setAgoraConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Global error handler to catch dragEvent and other errors
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      console.error('Error message:', event.message);
      console.error('Error filename:', event.filename);
      console.error('Error lineno:', event.lineno);
      console.error('Error colno:', event.colno);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, [isVisible]);

  // Handle IPC messages from main process
  const handleLoadAgora = (event: any, config: any) => {
    console.log('=== AGORA CONFIG RECEIVED ===');
    console.log('Received Agora config from main process:', config);
    console.log('Event details:', event);

    try {
      if (config && config.appId && config.channel) {
        console.log('Setting Agora config:', config);
        setAgoraConfig(config);
        setError(null);
      } else {
        console.error('Invalid Agora config provided:', config);
        setError('Invalid Agora configuration provided');
      }
    } catch (error) {
      console.error('Error setting Agora config:', error);
      setError(`Error setting Agora config: ${error}`);
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('Agora stream error:', errorMessage);
    setError(errorMessage);
  };

  // Set up IPC event listeners
  useEffect(() => {
    if (!isVisible) return;

    console.log('Setting up IPC event listeners');

    // Since we have nodeIntegration: true, we can use ipcRenderer directly
    const { ipcRenderer } = require('electron');

    console.log('Setting up ipcRenderer listener for load-agora');
    ipcRenderer.on('load-agora', handleLoadAgora);

    return () => {
      console.log('Cleaning up IPC event listeners');
      ipcRenderer.removeAllListeners('load-agora');
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className='stream-window'>
      <div className='title-bar'>
        <div className='title-bar-title'>Live Stream</div>
        <div className='title-bar-controls'>
          <button
            className='title-bar-btn minimize'
            onClick={onMinimize}
            title='Minimize'
          >
            −
          </button>
          <button
            className='title-bar-btn close'
            onClick={onClose}
            title='Close'
          >
            ×
          </button>
        </div>
      </div>
      <div className='stream-content'>
        {error && <div className='error-message'>{error}</div>}
        <AgoraStream config={agoraConfig} onError={handleError} />
        <div className='resize-handle'></div>
      </div>
    </div>
  );
};

export default StreamWindow;
