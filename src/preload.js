const { contextBridge, ipcRenderer } = require('electron');

// Initialize Sentry for renderer process
// const Sentry = require('@sentry/electron');

// Initialize Sentry with environment-based configuration

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Environment and URL management
  getEnvironment: () => ipcRenderer.invoke('get-environment'),
  getDefaultUrl: () => ipcRenderer.invoke('get-default-url'),

  // Window management
  openSecondWindow: () => ipcRenderer.invoke('open-second-window'),
  openThirdWindow: () => ipcRenderer.invoke('open-third-window'),

  // Inter-window communication
  sendToSecondWindow: data => ipcRenderer.invoke('send-to-second-window', data),
  sendToThirdWindow: data => ipcRenderer.invoke('send-to-third-window', data),
  sendToMainWindow: data => ipcRenderer.invoke('send-to-main-window', data),

  // Event listeners
  onUrlChanged: callback => ipcRenderer.on('url-changed', callback),
  onMessageFromMain: callback => ipcRenderer.on('message-from-main', callback),
  onMessageFromOther: callback =>
    ipcRenderer.on('message-from-other', callback),

  // Remove listeners
  removeAllListeners: channel => ipcRenderer.removeAllListeners(channel),

  // Video recording
  startRecording: options => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),

  // File system
  saveVideoFile: (data, filename) =>
    ipcRenderer.invoke('save-video-file', data, filename),
  deleteVideoFile: filename =>
    ipcRenderer.invoke('delete-video-file', filename),

  // Agora integration
  initializeAgora: config => ipcRenderer.invoke('initialize-agora', config),
  joinChannel: (channelName, uid) =>
    ipcRenderer.invoke('join-channel', channelName, uid),
  leaveChannel: () => ipcRenderer.invoke('leave-channel'),
  publishStream: stream => ipcRenderer.invoke('publish-stream', stream),
  unpublishStream: () => ipcRenderer.invoke('unpublish-stream'),

  // Audio/Video controls
  muteAudio: mute => ipcRenderer.invoke('mute-audio', mute),
  muteVideo: mute => ipcRenderer.invoke('mute-video', mute),
  stopAudio: () => ipcRenderer.invoke('stop-audio'),
  stopVideo: () => ipcRenderer.invoke('stop-video'),

  // Window URL management
  setSecondWindowUrl: url => ipcRenderer.invoke('set-second-window-url', url),
  setThirdWindowUrl: url => ipcRenderer.invoke('set-third-window-url', url),
  getWindowStatus: () => ipcRenderer.invoke('get-window-status'),

  // Event listeners for audio/video controls
  onAudioControl: callback => ipcRenderer.on('audio-control', callback),
  onVideoControl: callback => ipcRenderer.on('video-control', callback),
  onLoadUrl: callback => ipcRenderer.on('load-url', callback),

  // Recording process APIs
  startVideoRecording: (streamData, options) =>
    ipcRenderer.invoke('start-video-recording', streamData, options),
  stopVideoRecording: () => ipcRenderer.invoke('stop-video-recording'),
  startAudioRecording: (streamData, options) =>
    ipcRenderer.invoke('start-audio-recording', streamData, options),
  stopAudioRecording: () => ipcRenderer.invoke('stop-audio-recording'),

  // Recording process event listeners
  onRecordingProcessMessage: callback =>
    ipcRenderer.on('recording-process-message', callback),

  // Device management APIs
  getDevices: () => ipcRenderer.invoke('get-devices'),

  // Advanced recording APIs
  initializeDevices: deviceIds =>
    ipcRenderer.invoke('initialize-devices', deviceIds),
  startAdvancedRecording: options =>
    ipcRenderer.invoke('start-advanced-recording', options),
  pauseRecording: () => ipcRenderer.invoke('pause-recording'),
  resumeRecording: () => ipcRenderer.invoke('resume-recording'),
  toggleMute: () => ipcRenderer.invoke('toggle-mute'),
  stopAdvancedRecording: () => ipcRenderer.invoke('stop-advanced-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),

  // Advanced recording event listeners
  onAdvancedRecordingMessage: callback =>
    ipcRenderer.on('advanced-recording-message', callback),

  // Sentry API
  captureException: (error, context) => Sentry.captureException(error, context),
  captureMessage: (message, level) => Sentry.captureMessage(message, level),
});
