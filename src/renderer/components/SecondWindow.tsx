import React, { useState, useEffect } from 'react';
import './SecondWindow.css';

interface SecondWindowProps {
  url?: string;
}

const SecondWindow: React.FC<SecondWindowProps> = ({ url }) => {
  const [currentUrl, setCurrentUrl] = useState<string>(url || '');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusText, setStatusText] = useState<string>('Ready');

  useEffect(() => {
    if (url) {
      setCurrentUrl(url);
    }
  }, [url]);

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
    <div className='second-window'>
      <div className='header'>
        <h1>Allen UI Console</h1>
        <div className='header-info'>
          <div className='window-type'>Second Window</div>
          <div className='controls'>
            <button className='btn'>Refresh</button>
            <button className='btn'>Settings</button>
          </div>
        </div>
      </div>

      <div className='webview-container'>
        {isLoading && <div className='loading'>Loading application...</div>}
        <webview
          id='webview'
          src={currentUrl}
          nodeintegration
          className={isLoading ? 'hidden' : ''}
          onDidStartLoading={handleWebViewLoadStart}
          onDidFinishLoad={handleWebViewLoadFinish}
          onDidFailLoad={handleWebViewLoadFail}
        />
      </div>

      <div className='status-bar'>
        <div className='status-text'>{statusText}</div>
      </div>
    </div>
  );
};

export default SecondWindow;
