# Allen UI Console Electron App

A powerful Electron application for web content display, video streaming, and advanced recording
capabilities with Agora integration.

## 🚀 **Features**

### **Core Features**

- 🌐 **WebView Integration**: Load and display web content with environment-based URLs
- 🎥 **Advanced Recording**: Professional audio/video recording with FFmpeg
- 🎯 **Device Management**: Comprehensive audio/video device control
- 📱 **Multi-Window Support**: Main, secondary, video, and advanced recording windows
- 🔄 **Auto-Updates**: Seamless updates via GitHub Releases
- 🛡️ **Code Signing**: Secure distribution for macOS and Windows
- 📊 **Error Tracking**: Sentry integration for comprehensive monitoring

### **Recording Capabilities**

- **Audio Recording**: High-quality audio capture with device selection
- **Video Recording**: Professional video recording with configurable quality
- **Combined Recording**: Synchronized audio-video with automatic combination
- **Screen Recording**: Full screen, window, or region capture
- **Real-time Controls**: Pause, resume, mute, and stop functionality
- **Background Processing**: Isolated child processes for stability

### **Video Streaming**

- **Agora Integration**: Real-time video streaming capabilities
- **Green Screen Removal**: Advanced video processing with canvas
- **Multi-party Support**: Multiple participants in video calls
- **Quality Control**: Configurable bitrates and resolutions

## 📋 **Requirements**

### **System Requirements**

- **OS**: macOS 10.14+, Windows 10+, Ubuntu 18.04+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Broadband internet connection

### **Development Requirements**

- **Node.js**: 16.x or later
- **Yarn**: 4.x or later
- **Git**: 2.x or later

## 🛠️ **Installation**

### **For Users**

1. **Download the latest release** from
   [GitHub Releases](https://github.com/your-username/allen-ui-console-electron/releases)

2. **Install the application**:
   - **macOS**: Open the `.dmg` file and drag to Applications
   - **Windows**: Run the `.exe` installer
   - **Linux**: Use the `.AppImage` or package manager

3. **Launch the application** and grant necessary permissions

### **For Developers**

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/allen-ui-console-electron.git
   cd allen-ui-console-electron
   ```

2. **Install dependencies**:

   ```bash
   yarn install
   ```

3. **Start development**:
   ```bash
   yarn dev
   ```

## 🔧 **Configuration**

### **Environment Variables**

Create a `.env` file in the root directory:

```env
# Environment
NODE_ENV=development
APP_VERSION=1.0.0

# URLs
STAGE_URL=https://stage.allen.com
PROD_URL=https://app.allen.com
CUSTOM_URL=https://custom.allen.com

# Sentry Configuration
SENTRY_DSN=your-sentry-dsn
SENTRY_DSN_DEV=your-sentry-dev-dsn

# GitHub Secrets (for CI/CD)
GITHUB_TOKEN=your-github-token
SENTRY_AUTH_TOKEN=your-sentry-auth-token
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
```

### **App Configuration**

Edit `src/config.js` to customize app behavior:

```javascript
module.exports = {
  // Window configurations
  windows: {
    main: {
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
    },
    secondary: {
      width: 1000,
      height: 700,
      minWidth: 600,
      minHeight: 400,
    },
    video: {
      width: 1280,
      height: 720,
      minWidth: 640,
      minHeight: 360,
    },
  },

  // Recording settings
  recording: {
    defaultQuality: 'medium',
    retentionHours: 24,
    maxFileSize: '1GB',
  },

  // Auto-update settings
  autoUpdate: {
    enabled: true,
    checkInterval: 3600000, // 1 hour
  },
};
```

## 🎯 **Usage**

### **Basic Usage**

1. **Launch the application**
2. **Select environment** (Stage/Production/Custom)
3. **Load web content** in the main window
4. **Open additional windows** as needed
5. **Start recording** with device selection

### **Advanced Recording**

1. **Open Advanced Recording Window**
2. **Select audio/video devices**
3. **Configure recording options**
4. **Start recording** with real-time controls
5. **Monitor progress** and status
6. **Stop recording** to combine files

### **Video Streaming**

1. **Initialize Agora** with app ID
2. **Join channel** for video calls
3. **Publish stream** to share video
4. **Process video** with green screen removal
5. **Record streams** for later use

## 🧪 **Development**

### **Available Scripts**

```bash
# Development
yarn dev             # Start development server
yarn start           # Start Electron app

# Building
yarn build           # Build for production
yarn make            # Create distributables
yarn package         # Package the application

# Code Quality
yarn lint            # Run ESLint
yarn lint:fix        # Fix linting issues
yarn format          # Format code with Prettier
yarn typecheck      # Run TypeScript type checking

# Testing
yarn test            # Run tests
yarn test:watch      # Run tests in watch mode

# Publishing
yarn publish         # Publish to GitHub Releases
```

### **Project Structure**

```
allen-ui-console-electron/
├── src/
│   ├── main.js                     # Main Electron process
│   ├── preload.js                  # Preload script
│   ├── config.js                   # App configuration
│   ├── advanced-recording-process.js # FFmpeg recording process
│   ├── recording-process.js        # Basic recording process
│   ├── types/
│   │   └── index.d.ts             # TypeScript definitions
│   └── renderer/
│       ├── index.html              # Main window
│       ├── window.html             # Unified secondary/video window
│       ├── advanced-window.html    # Advanced recording window
│       ├── sentry-init.js          # Sentry initialization
│       └── styles/
│           └── main.css            # Main styles
├── assets/
│   ├── icon.icns                   # macOS icon
│   ├── icon.ico                    # Windows icon
│   ├── icon.png                    # Linux icon
│   └── splash.png                  # Splash screen
├── .github/
│   └── workflows/
│       └── build.yml               # CI/CD pipeline
├── .husky/                         # Git hooks
├── .eslintrc.js                    # ESLint configuration
├── .prettierrc                     # Prettier configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies and scripts
```

### **Code Style**

This project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Husky** for Git hooks
- **Conventional Commits** for commit messages

### **Contributing**

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the coding standards
4. **Run tests**: `npm test`
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

## 🔒 **Security**

### **Code Signing**

The application is code-signed for secure distribution:

- **macOS**: Developer ID Application certificate
- **Windows**: Code signing certificate
- **Linux**: GPG signing (optional)

### **Notarization**

macOS builds are notarized for distribution outside the App Store.

### **Permissions**

The app requires the following permissions:

- **Camera**: For video recording
- **Microphone**: For audio recording
- **Screen Recording**: For screen capture
- **File System**: For saving recordings
- **Network**: For web content and updates

## 📊 **Monitoring**

### **Sentry Integration**

Error tracking and performance monitoring:

- **Error Reporting**: Automatic error capture
- **Performance Monitoring**: App performance metrics
- **Source Maps**: Debug production errors
- **Release Tracking**: Version-specific error tracking

### **Logging**

Comprehensive logging for debugging:

- **Main Process**: Electron main process logs
- **Renderer Process**: Window-specific logs
- **Recording Process**: FFmpeg and recording logs
- **User Actions**: User interaction tracking

## 🚀 **Deployment**

### **CI/CD Pipeline**

Automated build and release process:

1. **Code Push**: Triggers GitHub Actions
2. **Build**: Cross-platform compilation
3. **Code Signing**: Secure signing process
4. **Notarization**: macOS notarization
5. **Release**: GitHub release creation
6. **Auto-Update**: Update notification to users

### **Release Process**

1. **Version Update**: Update version in `package.json`
2. **Changelog**: Update `CHANGELOG.md`
3. **Tag Release**: Create Git tag
4. **Automated Build**: GitHub Actions builds
5. **Manual Review**: Review and approve release
6. **Distribution**: Release to users

## 🐛 **Troubleshooting**

### **Common Issues**

**App won't start:**

- Check Node.js version (16.x+)
- Verify all dependencies installed
- Check system permissions

**Recording not working:**

- Verify device permissions
- Check FFmpeg installation
- Ensure sufficient disk space

**Auto-update fails:**

- Check internet connection
- Verify GitHub token permissions
- Check Sentry configuration

### **Debug Mode**

Enable debug logging:

```bash
npm run dev -- --debug
```

### **Logs Location**

- **macOS**: `~/Library/Logs/allen-ui-console-electron/`
- **Windows**: `%APPDATA%/allen-ui-console-electron/logs/`
- **Linux**: `~/.config/allen-ui-console-electron/logs/`

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 **Support**

- **Issues**: [GitHub Issues](https://github.com/your-username/allen-ui-console-electron/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/your-username/allen-ui-console-electron/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/allen-ui-console-electron/wiki)

## 🙏 **Acknowledgments**

- **Electron**: Cross-platform desktop app framework
- **FFmpeg**: Video and audio processing
- **Agora**: Real-time communication
- **Sentry**: Error tracking and monitoring
- **Electron Forge**: App packaging and distribution

---

**Built with ❤️ by Allen Digital Team**
