import React, { useEffect, useRef, useState } from 'react';
import './WebViewContainer.css';

interface WebViewContainerProps {
  url: string;
  isLoading: boolean;
  onMessage: (channel: string, data: any) => void;
  onLoadStart: () => void;
  onLoadFinish: () => void;
  onLoadFail: (event: any) => void;
}

const WebViewContainer: React.FC<WebViewContainerProps> = ({
  url,
  isLoading,
  onMessage,
  onLoadStart,
  onLoadFinish,
  onLoadFail,
}) => {
  const webviewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);

  useEffect(() => {
    if (webviewRef.current) {
      const webview = webviewRef.current;
      console.log('WebViewContainer: Webview element found', webview);

      // Handle ipc-message events
      webview.addEventListener('ipc-message', (event: any) => {
        console.log('WebViewContainer: ipc-message triggered', event);
        onMessage(event.channel, event.args[0]);
      });

      webview.addEventListener('did-start-loading', onLoadStart);
      webview.addEventListener('did-finish-load', onLoadFinish);
      webview.addEventListener('did-fail-load', onLoadFail);

      // Add navigation event listeners
      webview.addEventListener('did-navigate', () => {
        updateNavigationState();
      });

      webview.addEventListener('did-navigate-in-page', () => {
        updateNavigationState();
      });

      return () => {
        webview.removeEventListener('ipc-message', onMessage);
        webview.removeEventListener('did-navigate', updateNavigationState);
        webview.removeEventListener(
          'did-navigate-in-page',
          updateNavigationState
        );
      };
    }
  }, [onMessage]);

  const updateNavigationState = () => {
    if (webviewRef.current) {
      const canGoBackState = webviewRef.current.canGoBack();
      setCanGoBack(canGoBackState);
    }
  };

  const handleGoBack = () => {
    if (webviewRef.current && canGoBack) {
      webviewRef.current.goBack();
    }
  };

  useEffect(() => {
    if (webviewRef.current && url) {
      console.log('WebViewContainer: Setting src to', url);
      // Just set the src attribute, don't call loadURL
      webviewRef.current.src = url;
    }
  }, [url]);

  console.log(
    'WebViewContainer: Rendering with url:',
    url,
    'isLoading:',
    isLoading
  );
  return (
    <div className='webview-container'>
      {isLoading && <div className='loading'>Loading application...</div>}
      {canGoBack && (
        <button
          className='go-back-btn'
          onClick={handleGoBack}
          disabled={isLoading}
        >
          ← Back
        </button>
      )}
      <webview
        ref={webviewRef}
        id='webview'
        src={url}
        nodeintegration={true}
        webpreferences='contextIsolation=false, nodeIntegration=true, enableRemoteModule=true'
        className={isLoading ? 'hidden' : ''}
        {...({
          onDidStartLoading: onLoadStart,
          onDidFinishLoad: onLoadFinish,
          onDidFailLoad: onLoadFail,
        } as any)}
      />
    </div>
  );
};

export default WebViewContainer;
