import { app, BrowserWindow } from 'electron';
import * as path from 'path';

export interface DeepLinkData {
  action?: string;
  id?: string;
  type?: string;
  [key: string]: string | undefined;
}

export class DeepLinkHandler {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.setupProtocolRegistration();
    this.setupEventHandlers();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupProtocolRegistration() {
    // Register custom protocol for deep linking
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('astra-console', process.execPath, [
          path.resolve(process.argv[1]),
        ]);
      }
    } else {
      app.setAsDefaultProtocolClient('astra-console');
    }
  }

  private setupEventHandlers() {
    // Handle deep links on macOS
    app.on('open-url', (event, url) => {
      event.preventDefault();
      this.handleDeepLink(url);
    });

    // Handle deep links on Windows and Linux
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      app.quit();
    } else {
      app.on('second-instance', (event, commands, workingDir) => {
        // Focus the main window if it exists
        if (this.mainWindow) {
          if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
          }
          this.mainWindow.focus();
        }

        // Handle deep link from second instance
        const deepLinkUrl = commands.pop();
        if (deepLinkUrl && deepLinkUrl.startsWith('astra-console://')) {
          this.handleDeepLink(deepLinkUrl);
        }
      });
    }

    // Handle deep links when app starts from protocol
    app.whenReady().then(() => {
      const customUrl = process.argv.find(item =>
        item.startsWith('astra-console://')
      );
      if (customUrl) {
        this.handleDeepLink(customUrl);
      }
    });
  }

  private handleDeepLink(url: string) {
    try {
      console.log('Handling deep link:', url);

      // Parse the deep link URL
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      const queryParams = new URLSearchParams(urlObj.search);

      // Extract action and parameters
      const action = pathSegments[0] || queryParams.get('action');
      const id = pathSegments[1] || queryParams.get('id');
      const type = queryParams.get('type');

      const deepLinkData: DeepLinkData = {
        action,
        id,
        type,
      };

      // Add any additional query parameters
      queryParams.forEach((value, key) => {
        if (!['action', 'id', 'type'].includes(key)) {
          deepLinkData[key] = value;
        }
      });

      // Send deep link data to renderer process
      this.sendDeepLinkToRenderer(deepLinkData);

      // Handle specific actions if needed
      this.handleSpecificActions(deepLinkData);
    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }

  private sendDeepLinkToRenderer(deepLinkData: DeepLinkData) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      // Send to renderer process via IPC
      this.mainWindow.webContents.send('deep-link-received', deepLinkData);

      // Also try to send via postMessage if the page is loaded
      if (this.mainWindow.webContents.isLoading()) {
        this.mainWindow.webContents.once('did-finish-load', () => {
          this.mainWindow?.webContents.send('deep-link-received', deepLinkData);
        });
      }
    }
  }

  private handleSpecificActions(deepLinkData: DeepLinkData) {
    const { action, id, type } = deepLinkData;

    switch (action) {
      case 'open-stream':
        // Handle opening stream with specific ID
        if (id) {
          console.log(`Opening stream with ID: ${id}`);
          // You can add specific logic here to open stream windows
        }
        break;

      case 'open-whiteboard':
        // Handle opening whiteboard with specific ID
        if (id) {
          console.log(`Opening whiteboard with ID: ${id}`);
          // You can add specific logic here to open whiteboard windows
        }
        break;

      case 'navigate':
        // Handle navigation to specific route
        if (id) {
          console.log(`Navigating to: ${id}`);
          // You can add specific logic here for navigation
        }
        break;

      default:
        console.log('Unknown deep link action:', action);
        break;
    }
  }

  // Method to create deep link URLs
  static createDeepLink(
    action: string,
    params: Record<string, string> = {}
  ): string {
    const baseUrl = 'astra-console://';
    const queryString = new URLSearchParams({ action, ...params }).toString();
    return `${baseUrl}?${queryString}`;
  }

  // Method to create deep link URLs with path segments
  static createDeepLinkWithPath(
    action: string,
    id?: string,
    params: Record<string, string> = {}
  ): string {
    const baseUrl = 'astra-console://';
    const path = id ? `/${action}/${id}` : `/${action}`;
    const queryString = new URLSearchParams(params).toString();
    return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
  }
}

// Export singleton instance
export const deepLinkHandler = new DeepLinkHandler();
