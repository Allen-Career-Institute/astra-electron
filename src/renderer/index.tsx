import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import {
  DeepLinkUtils,
  createStreamLink,
  createWhiteboardLink,
  createNavigationLink,
} from './utils/deepLinkUtils';
import { DeepLinkData } from '../types/preload';

const App: React.FC = () => {
  const [lastDeepLink, setLastDeepLink] = useState<DeepLinkData | null>(null);
  const [deepLinks, setDeepLinks] = useState<string[]>([]);

  useEffect(() => {
    // Listen for deep links from main process
    if (window.electronAPI?.onDeepLink) {
      window.electronAPI.onDeepLink((event, deepLinkData: DeepLinkData) => {
        console.log('Deep link received:', deepLinkData);
        setLastDeepLink(deepLinkData);
      });
    }

    // Generate some example deep links
    const examples = [
      createStreamLink('stream-123', { quality: 'high' }),
      createWhiteboardLink('wb-456', { theme: 'dark' }),
      createNavigationLink('dashboard', { tab: 'analytics' }),
      DeepLinkUtils.createDeepLink('custom-action', {
        param1: 'value1',
        param2: 'value2',
      }),
    ];
    setDeepLinks(examples);
  }, []);

  const handleCopyLink = async (link: string) => {
    try {
      await DeepLinkUtils.copyToClipboard(link);
      alert('Deep link copied to clipboard!');
    } catch (error) {
      alert('Failed to copy deep link');
    }
  };

  const handleTestLink = (link: string) => {
    DeepLinkUtils.openDeepLink(link);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Astra Console - Deep Link Demo</h1>

      {lastDeepLink && (
        <div
          style={{
            background: '#e3f2fd',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #2196f3',
          }}
        >
          <h3>Last Deep Link Received:</h3>
          <pre
            style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
            }}
          >
            {JSON.stringify(lastDeepLink, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Example Deep Links:</h3>
        <p>
          These are example deep links you can test. Copy them to clipboard or
          click to test:
        </p>

        {deepLinks.map((link, index) => (
          <div
            key={index}
            style={{
              background: '#f9f9f9',
              padding: '10px',
              margin: '10px 0',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
          >
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                wordBreak: 'break-all',
              }}
            >
              {link}
            </div>
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => handleCopyLink(link)}
                style={{
                  marginRight: '10px',
                  padding: '5px 10px',
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Copy
              </button>
              <button
                onClick={() => handleTestLink(link)}
                style={{
                  padding: '5px 10px',
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Test
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: '#fff3e0',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #ff9800',
        }}
      >
        <h3>How to Test Deep Links:</h3>
        <ol>
          <li>Copy any of the deep links above</li>
          <li>Paste it in your browser's address bar</li>
          <li>Press Enter - it should open your Astra Console app</li>
          <li>Or use the "Test" button to simulate opening the link</li>
        </ol>
        <p>
          <strong>Note:</strong> Deep links only work when the app is packaged
          and installed, not during development.
        </p>
      </div>
    </div>
  );
};

// @ts-ignore
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
