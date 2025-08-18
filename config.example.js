// Configuration file for Allen UI Console Electron App
// Copy this to config.js and update with your values

module.exports = {
  // Environment Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Agora Configuration
  AGORA_APP_ID: process.env.AGORA_APP_ID || 'your_agora_app_id_here',

  // GitHub Configuration for Auto-Updates
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || 'your_github_token_here',
  GITHUB_REPOSITORY:
    process.env.GITHUB_REPOSITORY || 'your-username/allen-ui-console-electron',

  // Code Signing (macOS)
  CSC_LINK: process.env.CSC_LINK || 'path_to_macos_certificate',
  CSC_KEY_PASSWORD: process.env.CSC_KEY_PASSWORD || 'your_certificate_password',
  APPLE_ID: process.env.APPLE_ID || 'your_apple_id',
  APPLE_APP_SPECIFIC_PASSWORD:
    process.env.APPLE_APP_SPECIFIC_PASSWORD || 'your_app_specific_password',

  // Code Signing (Windows)
  WINDOWS_CERT_FILE:
    process.env.WINDOWS_CERT_FILE || 'path_to_windows_certificate',
  WINDOWS_CERT_PASSWORD:
    process.env.WINDOWS_CERT_PASSWORD || 'your_windows_certificate_password',

  // Recording Configuration
  RECORDING_RETENTION_HOURS:
    parseInt(process.env.RECORDING_RETENTION_HOURS) || 24,
  RECORDING_FORMAT: process.env.RECORDING_FORMAT || 'webm',
  RECORDING_QUALITY: process.env.RECORDING_QUALITY || 'high',

  // URLs for different environments
  URLS: {
    development:
      process.env.DEVELOPMENT_URL || 'https://stage.allen-digital.com',
    stage: process.env.STAGE_URL || 'https://stage.allen-digital.com',
    production: process.env.PRODUCTION_URL || 'https://app.allen-digital.com',
  },

  // App Configuration
  APP_NAME: 'Allen UI Console',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION:
    'Allen UI Console Electron App with WebView and Video Streaming',

  // Window Configuration
  WINDOWS: {
    main: {
      width: 1200,
      height: 800,
      title: 'Allen UI Console',
    },
    second: {
      width: 1000,
      height: 700,
      title: 'Allen UI Console - Second Window',
    },
    third: {
      width: 1200,
      height: 800,
      title: 'Allen UI Console - Video Stream',
    },
  },

  // Video Configuration
  VIDEO: {
    width: 640,
    height: 480,
    fps: 30,
    codec: 'vp8',
    greenScreenThreshold: 1.2,
  },
};
