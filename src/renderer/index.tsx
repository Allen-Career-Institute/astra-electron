import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';

// Interface for app metrics
interface AppMetrics {
  timestamp: number;
  processes: any[];
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  windows: {
    main: boolean;
    stream: boolean;
    whiteboard: boolean;
  };
  uptime: number;
}

const App: React.FC = () => {
  const [metrics, setMetrics] = useState<AppMetrics | null>(null);

  useEffect(() => {
    // Check if we're running in Electron
    if (window.electronAPI) {
      // Listen for metrics from the main process
      window.electronAPI.onMetrics(
        (event: any, receivedMetrics: AppMetrics) => {
          setMetrics(receivedMetrics);
          console.log('Received metrics:', receivedMetrics);
        }
      );

      // Cleanup listener on unmount
      return () => {
        window.electronAPI.removeAllListeners('app-metrics');
      };
    }
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Astra Console - Metrics Dashboard</h1>

      {metrics ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          <div
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              borderRadius: '8px',
            }}
          >
            <h2>System Metrics</h2>
            <p>
              <strong>Timestamp:</strong>{' '}
              {new Date(metrics.timestamp).toLocaleString()}
            </p>
            <p>
              <strong>Uptime:</strong> {formatUptime(metrics.uptime)}
            </p>
          </div>

          <div
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              borderRadius: '8px',
            }}
          >
            <h2>Memory Usage</h2>
            <p>
              <strong>Used:</strong> {formatBytes(metrics.memory.used)}
            </p>
            <p>
              <strong>Total:</strong> {formatBytes(metrics.memory.total)}
            </p>
            <p>
              <strong>Percentage:</strong>{' '}
              {metrics.memory.percentage.toFixed(2)}%
            </p>
            <div
              style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#f0f0f0',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(metrics.memory.percentage, 100)}%`,
                  height: '100%',
                  backgroundColor:
                    metrics.memory.percentage > 80 ? '#ff4444' : '#44ff44',
                  transition: 'width 0.3s ease',
                }}
              ></div>
            </div>
          </div>

          <div
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              borderRadius: '8px',
            }}
          >
            <h2>CPU Usage</h2>
            <p>
              <strong>Usage:</strong> {metrics.cpu.usage.toFixed(2)} seconds
            </p>
          </div>

          <div
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              borderRadius: '8px',
            }}
          >
            <h2>Window Status</h2>
            <p>
              <strong>Main Window:</strong>{' '}
              {metrics.windows.main ? '✅ Active' : '❌ Inactive'}
            </p>
            <p>
              <strong>Stream Window:</strong>{' '}
              {metrics.windows.stream ? '✅ Active' : '❌ Inactive'}
            </p>
            <p>
              <strong>Whiteboard Window:</strong>{' '}
              {metrics.windows.whiteboard ? '✅ Active' : '❌ Inactive'}
            </p>
          </div>

          <div
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              borderRadius: '8px',
            }}
          >
            <h2>Processes ({metrics.processes.length})</h2>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {metrics.processes.map((process, index) => (
                <div
                  key={index}
                  style={{
                    padding: '5px',
                    borderBottom: '1px solid #eee',
                    fontSize: '12px',
                  }}
                >
                  <strong>PID:</strong> {process.pid} |<strong> Type:</strong>{' '}
                  {process.type} |<strong> Memory:</strong>{' '}
                  {formatBytes(process.memory?.workingSetSize || 0)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p>Waiting for metrics...</p>
          <p>Make sure you're running in Electron environment.</p>
        </div>
      )}
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
