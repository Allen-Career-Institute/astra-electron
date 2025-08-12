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
        name: 'allen_ui_console',
        authors: 'Allen Digital',
        description: 'Allen UI Console Electron App',
        iconUrl: 'https://raw.githubusercontent.com/your-username/allen-ui-console-electron/main/assets/icon.ico',
        setupIcon: './assets/icon.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Allen Digital',
          homepage: 'https://github.com/your-username/allen-ui-console-electron'
        }
      }
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Allen Digital',
          homepage: 'https://github.com/your-username/allen-ui-console-electron'
        }
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
