import React, { useEffect, useRef } from 'react';
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

      return () => {
        webview.removeEventListener('ipc-message', onMessage);
      };
    }
  }, [onMessage]);

  useEffect(() => {
    if (webviewRef.current && url) {
      console.log('WebViewContainer: Setting src to', url);
      webviewRef.current.src = url;
      webviewRef.current.loadURL(url);
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
      <webview
        ref={webviewRef}
        id='webview'
        src={url}
        nodeintegration={true}
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
