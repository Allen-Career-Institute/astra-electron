import { getMainWindow } from '../modules/windowManager';

const sendLogEvent = (eventName: string, eventData: any) => {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('electron-log-event', eventName, eventData);
  }
};

export { sendLogEvent };
