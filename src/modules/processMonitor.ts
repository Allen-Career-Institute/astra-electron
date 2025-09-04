const { exec } = require('child_process');
import { ProcessMetric, app, BrowserWindow } from 'electron';
import { getStreamWindowPid } from './streamWindow';
import { getWhiteboardWindowPid } from './whiteboard-window';
import { getMainWindowPid, getMainWindow } from './windowManager';
import Sentry from '@sentry/electron/main';
import { ipcMain } from 'electron/main';

// Interface for comprehensive app metrics
interface AppMetrics {
  timestamp: number;
  processes: ProcessMetric[];
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

// Send metrics to main window
const sendMetricsToMainWindow = (metrics: ProcessMetric[]): void => {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-metrics', metrics);
  }
};

// Get all app metrics to identify Electron processes
const monitorProcesses = (initial: boolean = false) => {
  try {
    const metrics = app.getAppMetrics();
    const streamWindowPid = getStreamWindowPid();
    const whiteboardWindowPid = getWhiteboardWindowPid();
    const mainWindowPid = getMainWindowPid();

    metrics.forEach((metric: ProcessMetric) => {
      const pid = metric.pid;
      if (initial) {
        if (pid === streamWindowPid) {
          // Set high priority for stream window process
          try {
            if (process.platform === 'win32') {
              // Windows: Use wmic to set priority (256 = HIGH_PRIORITY_CLASS)
              exec(
                `wmic process where "ProcessId=${pid}" CALL setpriority 256`,
                (error: any, stdout: any, stderr: any) => {
                  if (error) {
                    console.warn(
                      'Failed to set Windows process priority:',
                      error
                    );
                    Sentry.captureException(error);
                  } else {
                    Sentry.captureMessage(
                      'Stream window process priority set to HIGH on Windows'
                    );
                  }
                }
              );
            }
          } catch (error) {
            Sentry.captureException(error);
          }
        }
      }
    });

    try {
      sendMetricsToMainWindow(metrics);
    } catch (error) {
      console.error('Error collecting or sending metrics:', error);
      Sentry.captureException(error);
    }

    // Set main process name for OS task manager visibility
    process.title = 'Astra-Main';
  } catch (error) {
    console.log('Error monitoring processes:', error);
  }
};

// Function to automatically detect and name Electron processes
export function setupAutomaticProcessNaming(): void {
  // Monitor processes periodically
  setInterval(monitorProcesses, 15000);

  // Initial check
  monitorProcesses(true);
}
