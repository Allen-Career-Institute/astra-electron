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
      /\.log/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: process.env.NODE_ENV === 'production' ? 'allen_ui_console' : 'allen_ui_console_stage',
        authors: 'Allen Digital',
        description: process.env.NODE_ENV === 'production' ? 'Allen UI Console Electron App' : 'Allen UI Console Electron App (Stage)',
        iconUrl: 'https://raw.githubusercontent.com/your-username/allen-ui-console-electron/main/assets/icon.ico',
        setupIcon: './assets/icon.ico',
        // Windows code signing configuration
        certificateFile: process.env.NODE_ENV === 'production' ? process.env.CSC_LINK : null,
        certificatePassword: process.env.NODE_ENV === 'production' ? process.env.CSC_KEY_PASSWORD : null
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-updater',
      config: {
        repository: {
          owner: 'dinesh-kumar-allen',
          name: 'allen-ui-console-electron'
        }
      }
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'dinesh-kumar-allen',
          name: 'allen-ui-console-electron'
        },
        prerelease: false,
        draft: false
      }
    }
  ]
};
