import React, { useState, useEffect, useCallback } from 'react';
import { ScreenSource } from '../../types/electron';
import { ScreenShareElectronAPI } from '../../types/preload';
import { ScreenShareWindowConfig } from '../../modules/screenShareWindow';
import RtcSurfaceView from './RtcSurfaceView';
import { agoraScreenShareService } from '../../modules/agoraScreenShareService';

// Define the necessary types locally since we can't import from agora-electron-sdk in renderer
const VideoSourceType = {
  VideoSourceScreen: 1,
} as const;

const RenderModeType = {
  RenderModeHidden: 1,
  RenderModeFit: 2,
} as const;
interface ScreenShareWindowProps {
  config: ScreenShareWindowConfig;
}

interface ScreenShareWindowState {
  sources: ScreenSource[];
  selectedSourceId: string | null;
  loading: boolean;
  error: string | null;
  status: string | null;
  agoraState: {
    status:
      | 'inprogress'
      | 'initialized'
      | 'joined'
      | 'publishing'
      | 'published'
      | 'error';
  };
  rtcStats: any | null;
}

declare global {
  interface Window {
    screenShareElectronAPI: ScreenShareElectronAPI;
  }
}

const ScreenShareWindow: React.FC<ScreenShareWindowProps> = (
  props: ScreenShareWindowProps
) => {
  const { config } = props;
  const [state, setState] = useState<ScreenShareWindowState>({
    sources: [],
    selectedSourceId: null,
    loading: true,
    error: null,
    status: null,
    agoraState: {
      status: 'inprogress',
    },
    rtcStats: null,
  });

  const updateState = useCallback(
    (updates: Partial<ScreenShareWindowState>) => {
      setState(prev => ({ ...prev, ...updates }));
    },
    []
  );

  const getFilteredSources = (sources: ScreenSource[]) => {
    if (!config.isWhiteboard) {
      return sources.filter(
        source =>
          !source.name.includes('Electron') && !source?.title?.includes('Astra')
      );
    }
    return sources.filter(source =>
      source?.title?.includes('Astra - Whiteboard')
    );
  };

  const refreshSources = async () => {
    let sources = getFilteredSources(
      await agoraScreenShareService.getScreenSources()
    );

    if (sources) {
      updateState({ sources, loading: false });
    } else {
      updateState({
        error: 'Failed to load sources',
        loading: false,
      });
    }
  };

  const loadSources = async () => {
    try {
      updateState({ loading: true, error: null });

      // Use Agora service directly since contextIsolation is false
      await agoraScreenShareService.initialize(config);
      let sources = getFilteredSources(
        await agoraScreenShareService.getScreenSources()
      );

      while (config.isWhiteboard && sources.length < 1) {
        sources = getFilteredSources(
          await agoraScreenShareService.getScreenSources()
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (sources) {
        updateState({ sources, loading: false });
        if (config.isWhiteboard) {
          await selectAgoraSource(sources[0]?.id || '');
        }
      } else {
        updateState({
          error: 'Failed to load sources',
          loading: false,
        });
      }
    } catch (err) {
      console.error(err);
      updateState({
        error: 'Failed to load sources: ' + (err as Error).message,
        loading: false,
      });
    }
  };

  const joinAgoraChannel = async () => {
    try {
      updateState({ status: 'Joining Agora channel...' });

      await agoraScreenShareService.joinChannel();

      updateState({
        agoraState: { ...state.agoraState, status: 'joined' },
        status: 'Joined Agora channel successfully',
      });
    } catch (err) {
      updateState({
        error: 'Failed to join Agora channel: ' + (err as Error).message,
        status: null,
      });
    }
  };

  const selectAgoraSource = async (sourceId: string) => {
    try {
      await agoraScreenShareService.selectScreenSource(sourceId);
      updateState({ selectedSourceId: sourceId });
    } catch (err) {
      updateState({
        error: 'Failed to select source: ' + (err as Error).message,
      });
    }
  };

  const publishAgoraScreenShare = async () => {
    try {
      updateState({ status: 'Publishing screen share...', sources: [] });
      await agoraScreenShareService.publishScreenShare();
      updateState({
        agoraState: { ...state.agoraState, status: 'published' },
        status: 'Screen share published successfully!',
      });
      (window as any)?.screenShareElectronAPI?.shareScreenPublished?.();
      setTimeout(() => {
        updateState({
          status: '',
        });
      }, 2000);
    } catch (err) {
      updateState({
        error: 'Failed to publish screen share: ' + (err as Error).message,
        status: null,
      });
    }
  };

  const startScreenSharing = async () => {
    console.log('startScreenSharing', state);
    if (!state.selectedSourceId) return;

    try {
      if (state.agoraState.status === 'published') {
        return;
      }

      updateState({
        agoraState: { ...state.agoraState },
        status: 'Screen share publishing ...',
      });

      await selectAgoraSource(state.selectedSourceId);

      // Step 2: Publish screen share after joining
      await publishAgoraScreenShare();
      // Step 3: Join the channel
      await joinAgoraChannel();

      updateState({
        agoraState: {
          ...state.agoraState,
          status: 'published',
        },
        status: 'Screen share published successfully!',
      });
    } catch (err) {
      updateState({
        error: 'Failed to start screen sharing: ' + (err as Error).message,
        status: null,
      });
    }
  };

  const handleCancel = useCallback(() => {
    agoraScreenShareService.cleanup();
    (window as any).screenShareElectronAPI.closeScreenShareWindow();
  }, []);

  useEffect(() => {
    (window as any).screenShareElectronAPI.onCleanupResources(() => {
      agoraScreenShareService.cleanup();
    });
  }, []);

  const handleSourceSelect = useCallback(
    async (sourceId: string) => {
      try {
        updateState({
          selectedSourceId: sourceId,
        });

        // Automatically start preview after source selection
        if (state.agoraState.status !== 'published') {
          // First select the source in Agora
          await selectAgoraSource(sourceId);
          // Then start the preview
        }
      } catch (err) {
        updateState({
          error: 'Failed to start preview: ' + (err as Error).message,
          status: null,
        });
      }
    },
    [updateState, state.agoraState.status, selectAgoraSource]
  );

  // RTC Stats monitoring
  const startRTCStatsMonitoring = useCallback(() => {
    if (!config) return;

    const interval = setInterval(async () => {
      try {
        const stats = agoraScreenShareService.getRTCStats();
        if (stats) {
          updateState({ rtcStats: stats });
        }
      } catch (err) {
        console.error('Failed to get RTC stats:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config, updateState]);

  const getModeDescription = () => {
    if (config.isWhiteboard) {
      return 'Select a window to screen share. Preview will start automatically. The whiteboard will continue streaming camera video and audio.';
    }
    return 'Select a window to screen share. Preview will start automatically. Only selected screen will be streamed.';
  };

  useEffect(() => {
    loadSources();
    return () => {
      agoraScreenShareService.cleanup();
    };
  }, []);

  useEffect(() => {
    const startScreenSharingAsync = async () => {
      if (state.selectedSourceId && config.isWhiteboard) {
        await startScreenSharing();
      }
    };
    startScreenSharingAsync();
  }, [state.selectedSourceId]);

  // Start RTC stats monitoring when publishing
  useEffect(() => {
    if (state.agoraState.status === 'published') {
      const cleanup = startRTCStatsMonitoring();
      return cleanup;
    }
  }, [state.agoraState.status, startRTCStatsMonitoring]);

  return (
    <div className="screen-share-window">
      <div className="content">
        {state.agoraState.status !== 'published' && (
          <div className="description">{getModeDescription()}</div>
        )}

        {state.status && <div className="status show">{state.status}</div>}

        {state.error && <div className="error">{state.error}</div>}

        {state.agoraState.status !== 'published' && (
          <button className="btn btn-secondary" onClick={refreshSources}>
            Refresh Sources
          </button>
        )}

        {config && state.rtcStats && (
          <div className="rtc-stats">
            <h3>RTC Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Video Bitrate:</span>
                <span className="stat-value">
                  {state.rtcStats.videoBitrate} kbps
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Audio Bitrate:</span>
                <span className="stat-value">
                  {state.rtcStats.audioBitrate} kbps
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Frame Rate:</span>
                <span className="stat-value">
                  {state.rtcStats.frameRate} fps
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Resolution:</span>
                <span className="stat-value">
                  {state.rtcStats.videoResolution.width}x
                  {state.rtcStats.videoResolution.height}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">CPU Usage:</span>
                <span className="stat-value">{state.rtcStats.cpuUsage}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Memory:</span>
                <span className="stat-value">
                  {Math.round(state.rtcStats.memoryUsage / 1024 / 1024)} MB
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        {state.agoraState.status === 'published' && (
          <div className="preview-section">
            <h3>Screen Share Preview</h3>
            <div className="preview-container">
              <RtcSurfaceView
                canvas={{
                  uid: 0,
                  sourceType: VideoSourceType.VideoSourceScreen,
                  renderMode: RenderModeType.RenderModeHidden,
                  mirrorMode: 0,
                }}
                containerClass="preview-video-container"
                videoClass="preview-video-element"
              />
            </div>
          </div>
        )}

        {state.loading && (
          <div className="loading">Loading available sources...</div>
        )}

        {!state.loading &&
          state.agoraState.status !== 'published' &&
          state.sources.length > 0 && (
            <div className="sources-grid">
              {state.sources.map(source => (
                <div
                  key={source.id}
                  className={`source-card ${
                    state.selectedSourceId === source.id ? 'selected' : ''
                  }`}
                  onClick={() => handleSourceSelect(source.id)}
                >
                  <img
                    src={source.thumbnail}
                    alt={source.name}
                    className="source-thumbnail"
                  />
                  <div className="source-name">{source.name}</div>
                  <div className="source-type">
                    {`${source.title} - ${source.name.includes('Screen') ? 'Screen' : 'Window'}`}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {state.agoraState.status !== 'published' && (
        <div className="footer">
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={startScreenSharing}
            disabled={!state.selectedSourceId}
          >
            {'Start Sharing'}
          </button>
        </div>
      )}

      <style>{`
        .screen-share-window {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          color: #333;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .header {
          background: #fff;
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .header h1 {
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .mode-indicator {
          background: #e3f2fd;
          color: #1976d2;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
        }

        .agora-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f44336;
        }

        .status-dot.connected {
          background: #4caf50;
        }

        .content {
          flex: 1;
          padding: 0;
          overflow-y: auto;
        }

        .description {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 20px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #856404;
        }

        .sources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin: 0 20px 20px 20px;
        }

        .source-card {
          background: #fff;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .source-card:hover {
          border-color: #1976d2;
          box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
        }

        .source-card.selected {
          border-color: #1976d2;
          background: #e3f2fd;
        }

        .source-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .source-name {
          font-size: 12px;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
          word-break: break-word;
        }

        .source-type {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .footer {
          background: #fff;
          padding: 16px 20px;
          border-top: 1px solid #e0e0e0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #666;
          border: 1px solid #ddd;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .btn-primary {
          background: #1976d2;
          color: #fff;
        }

        .btn-primary:hover {
          background: #1565c0;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .btn-outline {
          background: transparent;
          color: #1976d2;
          border: 1px solid #1976d2;
        }

        .btn-outline:hover {
          background: #e3f2fd;
        }

        .btn-outline:disabled {
          background: transparent;
          color: #ccc;
          border-color: #ccc;
          cursor: not-allowed;
        }

        .loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
          font-size: 14px;
          color: #666;
          margin: 0 20px;
        }

        .error {
          background: #ffebee;
          border: 1px solid #ffcdd2;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 0 20px 20px 20px;
          color: #c62828;
          font-size: 14px;
        }

        .status {
          background: #e8f5e8;
          border: 1px solid #c8e6c9;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 0 20px 20px 20px;
          color: #2e7d32;
          font-size: 14px;
          display: none;
        }

        .status.show {
          display: block;
        }

        .rtc-stats {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 16px;
          margin: 0 20px 20px 20px;
        }

        .rtc-stats h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #fff;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .stat-value {
          font-size: 12px;
          color: #333;
          font-weight: 600;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .preview-section {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 16px;
          margin: 0 20px 20px 20px;
        }

        .preview-section h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .preview-container {
          width: 100%;
          height: 300px;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .preview-video-container {
          width: 100%;
          height: 100%;
        }

        .preview-video-element {
          width: 100%;
          height: 100%;
        }

        .preview-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .preview-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }

        .preview-status {
          color: #4caf50;
          font-weight: 600;
        }

        .preview-source {
          color: #666;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default ScreenShareWindow;
