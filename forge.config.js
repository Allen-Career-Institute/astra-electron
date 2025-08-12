module.exports = {
  packagerConfig: {
    icon: './assets/icon',
    asar: true,
    // Only include essential assets
    extraResource: ['./assets/icon.ico', './assets/icon.png'],
    // Better ignore patterns to reduce size
    ignore: [
      /^\/(?!src|assets\/icon\.(ico|png)|package\.json)/,
      // Exclude heavy node_modules
      /node_modules\/(?!agora-rtc-sdk-ng|@electron|electron-store|electron-updater)/,
      // Exclude development files
      /\.git/,
      /\.github/,
      /\.vscode/,
      /\.idea/,
      /\.DS_Store/,
      /\.env/,
      /\.log/,
      /\.md$/,
      /\.ts$/,
      /\.map$/,
      /test/,
      /tests/,
      /__tests__/,
      /coverage/,
      /\.nyc_output/,
      /\.nyc_output/,
      /docs/,
      /examples/,
      /scripts\/(?!setup|generate-dev-cert)/
    ],
    // Enable compression
    compression: 'maximum',
    // Prune dependencies
    prune: true,
    // Overwrite existing files
    overwrite: true
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: process.env.NODE_ENV === 'production' ? 'Allen Console' : 'Allen Console (Stage)',
        authors: 'Allen Digital',
        description: process.env.NODE_ENV === 'production' ? 'Allen UI Console Electron App' : 'Allen UI Console Electron App (Stage)',
        iconUrl: 'https://raw.githubusercontent.com/your-username/allen-ui-console-electron/main/assets/icon.ico',
        setupIcon: './assets/icon.ico',
        // Windows code signing configuration
        certificateFile: process.env.NODE_ENV === 'production' ? process.env.CSC_LINK : null,
        certificatePassword: process.env.NODE_ENV === 'production' ? process.env.CSC_KEY_PASSWORD : null
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32'],
      config: {
        name: process.env.NODE_ENV === 'production' ? 'Allen Console Portable' : 'Allen Console Portable (Stage)'
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
