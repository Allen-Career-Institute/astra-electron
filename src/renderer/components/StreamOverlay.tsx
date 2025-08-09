import React, { useEffect, useRef, useState } from 'react';
import './StreamOverlay.css';

interface StreamOverlayProps {
  isVisible: boolean;
  config: {
    url: string;
    appId: string;
    channel: string;
    token: string;
    uid: string;
    meetingId: string;
  } | null;
  onClose: () => void;
}

const StreamOverlay: React.FC<StreamOverlayProps> = ({
  isVisible,
  config,
  onClose,
}) => {
  const webviewRef = useRef<any>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 20,
    y: 20,
  });

  useEffect(() => {
    if (webviewRef.current && config && isVisible) {
      const webview = webviewRef.current;
      console.log('StreamOverlay: Loading stream with config', config);

      // Load the URL
      webview.loadURL(config.url);

      // Inject Agora config after window loads
      webview.addEventListener('did-finish-load', () => {
        webview.send('load-agora', {
          appId: config.appId,
          channel: config.channel,
          token: config.token,
          uid: config.uid,
          meetingId: config.meetingId,
        });
        setIsLoading(false);
      });

      webview.addEventListener('did-start-loading', () => {
        setIsLoading(true);
      });

      webview.addEventListener('did-fail-load', () => {
        setIsLoading(false);
        console.error('StreamOverlay: Failed to load stream');
      });
    }
  }, [config, isVisible]);

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (
      e.target === overlayRef.current ||
      (e.target as HTMLElement).closest('.stream-overlay-header')
    ) {
      setIsDragging(true);
      const rect = overlayRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && overlayRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Constrain to viewport
      const maxX = window.innerWidth - (overlayRef.current.offsetWidth || 320);
      const maxY =
        window.innerHeight - (overlayRef.current.offsetHeight || 180);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!isVisible || !config) {
    return null;
  }

  return (
    <div
      className='stream-overlay'
      ref={overlayRef}
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className='stream-overlay-header'>
        <div className='stream-overlay-title'>Live Stream</div>
        <button className='stream-overlay-close' onClick={onClose}>
          ×
        </button>
      </div>
      <div className='stream-overlay-content'>
        {isLoading && (
          <div className='stream-overlay-loading'>Loading stream...</div>
        )}
        <webview
          ref={webviewRef}
          className={`stream-webview ${isLoading ? 'hidden' : ''}`}
          nodeintegration={true}
        />
      </div>
    </div>
  );
};

export default StreamOverlay;
