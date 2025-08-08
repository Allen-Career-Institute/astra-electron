import React, { useState, useEffect } from 'react';
import './ThirdWindow.css';

interface ThirdWindowProps {
  url?: string;
}

const ThirdWindow: React.FC<ThirdWindowProps> = ({ url }) => {
  const [currentUrl, setCurrentUrl] = useState<string>(url || '');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusText, setStatusText] = useState<string>('Ready');
  const [isRecording, setIsRecording] = useState<boolean>(false);

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

  const handleStartRecording = () => {
    setIsRecording(true);
    setStatusText('Recording...');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setStatusText('Recording saved');
  };

  return (
    <div className='third-window'>
      <div className='header'>
        <h1>Allen UI Console</h1>
        <div className='header-info'>
          <div className='window-type'>Video Stream</div>
          <div className='controls'>
            <button
              className={`btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? handleStopRecording : handleStartRecording}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button className='btn'>Settings</button>
          </div>
        </div>
      </div>

      <div className='main-content'>
        <div className='video-section'>
          <div className='video-container'>
            {isLoading && (
              <div className='loading'>Loading video stream...</div>
            )}
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

          <div className='video-controls'>
            <button className='control-btn'>Mute Audio</button>
            <button className='control-btn'>Mute Video</button>
            <button className='control-btn'>Screen Share</button>
          </div>
        </div>
      </div>

      <div className='status-bar'>
        <div className='status-text'>{statusText}</div>
        {isRecording && (
          <div className='recording-indicator'>
            <div className='recording-dot'></div>
            <span>Recording...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThirdWindow;
