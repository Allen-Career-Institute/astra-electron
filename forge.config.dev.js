module.exports = {
  packagerConfig: {
    icon: './assets/icon',
    asar: true,
    extraResource: ['./assets/'],
    ignore: [
      /^\/(?!src|assets|package\.json)/,
      /node_modules\/(?!agora-rtc-sdk-ng)/,
      /\.git/,
      /\.github/,
      /\.vscode/,
      /\.idea/,
      /\.DS_Store/,
      /\.env/,
      /\.log/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'allen_ui_console_dev',
        authors: 'Allen Digital',
        description: 'Allen UI Console Electron App (Development)',
        // Use local development certificate if available
        certificateFile: process.env.LOCAL_CERTIFICATE_PATH || null,
        certificatePassword: process.env.LOCAL_CERTIFICATE_PASSWORD || null,
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-updater',
      config: {
        repository: {
          owner: 'dinesh-kumar-allen',
          name: 'allen-ui-console-electron',
        },
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'dinesh-kumar-allen',
          name: 'allen-ui-console-electron',
        },
        prerelease: true, // Mark as pre-release for development builds
        draft: true, // Create as draft for development builds
      },
    },
  ],
};
