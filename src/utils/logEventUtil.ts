const { ipcRenderer } = window.require('electron');

// This utility can be used from both main process and renderer process
const sendLogEvent = (eventName: string, eventData: any) => {
  try {
    console.log('Sending log event via IPC:', eventName);
    ipcRenderer
      .invoke('send-log-event', eventName, eventData)
      .catch((error: any) => {
        console.error('Error invoking send-log-event:', error);
      });
  } catch (error) {
    console.error('Error sending log event:', error);
  }
};

export { sendLogEvent };
