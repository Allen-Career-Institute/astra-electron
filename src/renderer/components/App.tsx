import React, { useState, useEffect } from 'react';
import Header from './Header';
import WebViewContainer from './WebViewContainer';
import StatusBar from './StatusBar';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { useRecording } from '../hooks/useRecording';

const App: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusText, setStatusText] = useState<string>('Ready');

  const {
    getEnvironment,
    getDefaultUrl,
    openSecondWindow,
    openThirdWindow,
    onUrlChanged,
    onMessageFromOther,
  } = useElectronAPI();

  const { isRecording, startRecording, stopRecording } = useRecording();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const env = await getEnvironment();
      const url = await getDefaultUrl();

      setEnvironment(env);
      setCurrentUrl(url);

      // Set up event listeners
      onUrlChanged((event: any, newUrl: string) => {
        setCurrentUrl(newUrl);
      });
      console.log(url);
      console.log('onMessageFromOther', onMessageFromOther);
      console.log('onUrlChanged', onUrlChanged);

      onMessageFromOther((event: any, data: any) => {
        console.log('Message from other window:', data);
      });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setStatusText('Initialization failed');
    }
  };

  const handleWebViewMessage = (channel: string, data: any) => {
    console.log('Message from webview:', channel, data);

    switch (channel) {
      case 'open-second-window':
        openSecondWindow();
        break;

      case 'open-third-window':
        openThirdWindow();
        break;

      case 'start-recording':
        startRecording(data);
        break;

      case 'stop-recording':
        stopRecording();
        break;

      default:
        console.log('Unknown channel:', channel);
    }
  };

  const handleWebViewLoadStart = () => {
    setIsLoading(true);
    setStatusText('Loading...');
  };

  const handleWebViewLoadFinish = () => {
    setIsLoading(false);
    setStatusText('Ready');
  };

  const handleWebViewLoadFail = (event: any) => {
    setIsLoading(false);
    setStatusText('Failed to load');
    console.error('WebView failed to load:', event);
  };

  return (
    <div className='app'>
      <Header
        environment={environment}
        onOpenSecondWindow={openSecondWindow}
        onOpenThirdWindow={openThirdWindow}
      />

      <WebViewContainer
        url={currentUrl}
        isLoading={isLoading}
        onMessage={handleWebViewMessage}
        onLoadStart={handleWebViewLoadStart}
        onLoadFinish={handleWebViewLoadFinish}
        onLoadFail={handleWebViewLoadFail}
      />

      <StatusBar isRecording={isRecording} statusText={statusText} />
    </div>
  );
};

export default App;
