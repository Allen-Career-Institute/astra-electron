import { dialog } from 'electron';
import { getCurrentUrl, isDev, setUpdateAvailable } from './config';
import * as Sentry from '@sentry/electron/main';
import { getMainWindow } from './windowManager';
import { ProgressInfo, autoUpdater } from 'electron-updater';

function getAutoUpdater() {
  return autoUpdater;
}

function setupAutoUpdater(): void {
  try {
    // Check if autoUpdater is available
    if (!autoUpdater) {
      console.warn('electron-updater module not found, auto-updater disabled');
      return;
    }

    // Check if running in development mode
    if (isDev()) {
      console.log('Auto-updater disabled in development mode');
      return;
    }

    // Configure auto-updater
    autoUpdater.autoRunAppAfterInstall = true;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check for updates
    autoUpdater.checkForUpdatesAndNotify().catch(error => {
      Sentry.captureException(error);
    });

    setInterval(
      () => {
        autoUpdater.checkForUpdatesAndNotify().catch(error => {
          Sentry.captureException(error);
        });
      },
      1000 * 60 * 60 * 1 // 0.5 hours
    );
  } catch (error) {
    Sentry.captureException(error);
  }

  if (!autoUpdater) return;

  autoUpdater.on('update-available', () => {
    if (getCurrentUrl()?.includes('liveclass')) {
      setUpdateAvailable(true);
      return;
    }
    try {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message:
          'A new version is available. The app will update automatically.',
      });
    } catch (error) {
      Sentry.captureException(error);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    if (getCurrentUrl()?.includes('liveclass')) {
      setUpdateAvailable(true);
      return;
    }
    try {
      const dialogOpts = {
        type: 'info' as const,
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message:
          'Update downloaded. The app will restart to install the update.',
        detail:
          'A new version has been downloaded. Restart the application to apply the updates.',
      };

      dialog.showMessageBox(dialogOpts).then(returnValue => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
      });
    } catch (error) {
      Sentry.captureException(error);
    }
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    if (getCurrentUrl()?.includes('liveclass')) {
      return;
    }
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(progress.percent / 100);
    }
  });

  autoUpdater.on('error', (error: any, message?: string) => {
    Sentry.captureException(error, {
      extra: {
        message,
      },
    });
  });
}

export { setupAutoUpdater, getAutoUpdater };
