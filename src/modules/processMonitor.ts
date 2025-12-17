const { exec } = require('child_process');
import { ProcessMetric, app, dialog } from 'electron';
import { getStreamWindowPid } from './streamWindow';
import { getWhiteboardWindowPid } from './whiteboard-window';
import { getMainWindowPid, getMainWindow } from './windowManager';
import * as Sentry from '@sentry/electron/main';
import { getCurrentUrl } from './config';
import { getScreenShareWindowPid } from './screenShareWindow';
const si = require('systeminformation');

let monitorInterval: NodeJS.Timeout;
// Send metrics to main window
const sendMetricsToMainWindow = (
  metrics: ProcessMetric[],
  systemMetrics: { cpuUsage: any; networkUsage: any }
): void => {
  const mainWindow = getMainWindow();
  if (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    getCurrentUrl()?.includes('teacher-liveclass')
  ) {
    const streamWindowPid = getStreamWindowPid();
    const mainWindowPid = getMainWindowPid();
    const whiteboardWindowPid = getWhiteboardWindowPid();
    const screenShareWindowPid = getScreenShareWindowPid();
    try {
      mainWindow.webContents.send('app-metrics', {
        metrics,
        streamWindowPid,
        mainWindowPid,
        systemMetrics,
        whiteboardWindowPid,
        screenShareWindowPid,
      });
    } catch (error) {
      Sentry.captureException(error);
    }
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
  try {
    exec(
      `wmic process where "ProcessId=${pid}" CALL setpriority ${priority}`,
      (error: any, stdout: any, stderr: any) => {
        if (error) {
          Sentry.addBreadcrumb({
            message: `Error setting process priority for ${processType}: ${error}`,
            level: 'warning',
          });
        } else {
          Sentry.addBreadcrumb({
            message: `${processType} process priority set to ${priority} on Windows`,
            level: 'info',
          });
        }
      }
    );
  } catch (error) {
    Sentry.captureException(error);
  }
};

// Get all app metrics to identify Electron processes
const monitorProcesses = async () => {
  try {
    const metrics = app.getAppMetrics();
    const streamWindowPid = getStreamWindowPid();
    const whiteboardWindowPid = getWhiteboardWindowPid();
    const mainWindowPid = getMainWindowPid();
    const screenShareWindowPid = getScreenShareWindowPid();

    const netWorkMetric = metrics?.find?.((metric: ProcessMetric) =>
      metric?.name?.includes('Network')
    );

    // Process priority setting with reduced duplication
    const processPidMap = new Map([
      [
        streamWindowPid,
        { priority: PROCESS_PRIORITY.REALTIME, type: 'Stream window' },
      ],
      // [mainWindowPid, { priority: PROCESS_PRIORITY.HIGH, type: 'Main window' }],
      // [
      //   whiteboardWindowPid,
      //   { priority: PROCESS_PRIORITY.HIGH, type: 'Whiteboard window' },
      // ],
      [
        screenShareWindowPid,
        { priority: PROCESS_PRIORITY.REALTIME, type: 'Screen share window' },
      ],
    ]);

    if (netWorkMetric && netWorkMetric.pid) {
      processPidMap.set(netWorkMetric.pid, {
        priority: PROCESS_PRIORITY.REALTIME,
        type: 'Network',
      });
    }

    // Set priorities for tracked processes
    metrics.forEach((metric: ProcessMetric) => {
      const pid = metric.pid;
      const processConfig = processPidMap.get(pid);

      if (processConfig) {
        setProcessPriority(pid, processConfig.priority, processConfig.type);
      }
    });

    let cpuUsage: any;
    let networkUsage: any;
    try {
      const originalCpuUsage = await si.currentLoad();

      if (originalCpuUsage && originalCpuUsage?.cpus?.length > 0) {
        cpuUsage = {
          avgLoad: originalCpuUsage.avgLoad,
          currentLoad: originalCpuUsage.currentLoad,
          currentLoadUser: originalCpuUsage.currentLoadUser,
          currentLoadSystem: originalCpuUsage.currentLoadSystem,
          cpus:
            originalCpuUsage?.cpus?.map((cpu: any) => ({
              load: cpu.load,
              loadUser: cpu.loadUser,
              loadSystem: cpu.loadSystem,
            })) || [],
        };
      }
    } catch (error) {
      Sentry.captureException(error);
    }

    try {
      const networkIb =
        (await si.networkInterfaces())?.filter(
          (iface: any) => iface.speed !== null
        ) || [];
      networkUsage =
        networkIb?.length > 0 && networkIb?.[0]?.iface
          ? await si.networkStats(networkIb[0].iface)
          : null;
    } catch (ex) {
      console.error('Error getting network stats:', ex);
      Sentry.captureException(ex);
    }

    const finalMetrics = metrics.filter(
      (metric: ProcessMetric) =>
        metric.type !== 'Utility' && metric.type !== 'GPU'
    );
    // Send metrics to main window
    sendMetricsToMainWindow(finalMetrics, {
      cpuUsage: null,
      networkUsage: null,
    });
    sendMetricsToMainWindow([], {
      cpuUsage,
      networkUsage,
    });

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
  monitorInterval = setInterval(monitorProcesses, 15000);

  // Initial check
  monitorProcesses();
}

export function stopProcessMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
  }
}
