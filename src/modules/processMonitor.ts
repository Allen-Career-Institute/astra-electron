const { exec } = require('child_process');
import { ProcessMetric, app, dialog } from 'electron';
import { getStreamWindowPid } from './streamWindow';
import { getWhiteboardWindowPid } from './whiteboard-window';
import { getMainWindowPid, getMainWindow } from './windowManager';
import * as Sentry from '@sentry/electron/main';
import { getCurrentUrl } from './config';
let monitorInterval: NodeJS.Timeout;
// Send metrics to main window
const sendMetricsToMainWindow = (metrics: ProcessMetric[]): void => {
  const mainWindow = getMainWindow();
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    getCurrentUrl()?.includes('teacher-liveclass')
  ) {
    const streamWindowPid = getStreamWindowPid();
    const mainWindowPid = getMainWindowPid();
    const whiteboardWindowPid = getWhiteboardWindowPid();
    mainWindow.webContents.send('app-metrics', {
      metrics,
      streamWindowPid,
      mainWindowPid,
      whiteboardWindowPid,
    });
  }
};

// Process priority levels for Windows
const PROCESS_PRIORITY = {
  REALTIME: 256,
  HIGH: 128,
} as const;

// Set process priority on Windows
const setProcessPriority = (
  pid: number,
  priority: number,
  processType: string
): void => {
  if (process.platform !== 'win32') {
    return;
  }
  exec(
    `wmic process where "ProcessId=${pid}" CALL setpriority ${priority}`,
    (error: any, stdout: any, stderr: any) => {
      if (error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(
          `${processType} process priority set to ${priority} on Windows`,
          'info'
        );
      }
    }
  );
};

// Get all app metrics to identify Electron processes
const monitorProcesses = () => {
  try {
    const metrics = app.getAppMetrics();
    const streamWindowPid = getStreamWindowPid();
    const whiteboardWindowPid = getWhiteboardWindowPid();
    const mainWindowPid = getMainWindowPid();

    // Early return if no metrics available
    if (!metrics || metrics.length === 0) {
      console.warn('No process metrics available');
      return;
    }

    // Process priority setting with reduced duplication
    const processPidMap = new Map([
      [
        streamWindowPid,
        { priority: PROCESS_PRIORITY.REALTIME, type: 'Stream window' },
      ],
      [mainWindowPid, { priority: PROCESS_PRIORITY.HIGH, type: 'Main window' }],
      [
        whiteboardWindowPid,
        { priority: PROCESS_PRIORITY.HIGH, type: 'Whiteboard window' },
      ],
    ]);

    // Set priorities for tracked processes
    metrics.forEach((metric: ProcessMetric) => {
      const pid = metric.pid;
      const processConfig = processPidMap.get(pid);

      if (processConfig) {
        setProcessPriority(pid, processConfig.priority, processConfig.type);
      }
    });

    // Send metrics to main window
    sendMetricsToMainWindow(metrics);

    // Set main process name for OS task manager visibility
    process.title = 'Astra-Main';
  } catch (error) {
    console.error('Error monitoring processes:', error);
    Sentry.captureException(error);
  }
};

// Function to automatically detect and name Electron processes
export function setupAutomaticProcessNaming(): void {
  // Monitor processes periodically
  monitorInterval = setInterval(monitorProcesses, 30000);

  // Initial check
  monitorProcesses();
}

export function stopProcessMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
}
