import { getMainWindow } from '../modules/windowManager';

const sendLogEvent = (eventName: string, eventData: any) => {
  try {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('electron-log-event', eventName, eventData);
    }
  } catch (error) {
    console.error('Error sending log event:', error);
  }
};

export { sendLogEvent };
