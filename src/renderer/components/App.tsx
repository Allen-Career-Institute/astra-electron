import React, { useState, useEffect } from 'react';
import Header from './Header';
import StatusBar from './StatusBar';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { useRecording } from '../hooks/useRecording';

const App: React.FC = () => {
  const [environment, setEnvironment] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('Ready');

  const { getEnvironment, closeStreamWindowFromMain } = useElectronAPI();

  const { isRecording } = useRecording();

  useEffect(() => {
    initializeApp();

    // Close stream window when page is about to unload (reload/exit)
    const handleBeforeUnload = () => {
      closeStreamWindowFromMain().catch(console.error);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [closeStreamWindowFromMain]);

  const initializeApp = async () => {
    try {
      const env = await getEnvironment();
      setEnvironment(env);
      setStatusText('Ready');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setStatusText('Initialization failed');
    }
  };

  return (
    <div className='app'>
      <Header environment={environment} />
      <div className='content'>
        <p>Allen UI Console Electron App</p>
        <p>Loading allen-ui-live teacher interface...</p>
      </div>
      <StatusBar isRecording={isRecording} statusText={statusText} />
    </div>
  );
};

export default App;
