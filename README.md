# Astra Electron Console

A modern Electron application for Allen Digital's Astra console with webview integration and video streaming capabilities.

## Build Migration: NSIS → APPX + MSIX

This project has been migrated from NSIS installer builds to APPX package builds for Windows, with additional MSIX packaging support. This change provides several benefits:

### Benefits of APPX over NSIS:

- **Windows Store Ready**: APPX packages can be directly submitted to the Microsoft Store
- **Enterprise Distribution**: Better support for enterprise deployment and management
- **Modern Windows Integration**: Enhanced integration with Windows 10/11 features
- **Automatic Updates**: Better support for automatic updates through Windows Store
- **Security**: Improved security model with Windows Store signing

### Benefits of MSIX:

- **Modern Packaging**: Latest Windows packaging format with better security
- **App Isolation**: Enhanced security through containerization
- **Enterprise Deployment**: Better support for enterprise distribution
- **Automatic Updates**: Native Windows update mechanism
- **Windows 10/11 Compatibility**: Full support for modern Windows features

### Build Artifacts:

- **Before**: Windows installer (.exe) using NSIS
- **After**:
  - Windows APPX package (.appx) ready for store submission
  - Windows MSIX package (.msix) for modern deployment

### Build Commands:

```bash
# Build all platforms
bun run build:all

# Build only Windows Appx
bun run build:win-appx

# Build only Windows NSIS
bun run build:win-nsis

# Package MSIX only (requires AppX build first)
bun run package:msix
```

### Migration Notes:

- **Removed**: NSIS installer configuration and scripts
- **Kept**: PowerShell and batch scripts in `assets/installer/` for process management
- **New**: Enhanced APPX configuration with proper tile assets and capabilities
- **New**: MSIX packaging using electron-windows-msix library
- **Output**: APPX and MSIX packages are generated in `dist-electron-builder/` directory

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
- **Bun**: 1.x or later
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
   bun install
   ```

3. **Set up development environment**:

   ```
     Create a .env.local file with following details

     APP_VERSION=0.0.1
     ENV=development
     NODE_ENV=development
     CUSTOM_URL=https://console.allen-stage.in/ can be your local host or vercel url
     AUTH_TOKEN=Your teacher user's console token

   ```

4. **Start development**:

   ```bash
   bun run dev:full
   ```

## 🔧 **Configuration**

### **Environment Variables**

Create a `.env` file in the root directory:

```env
# Environment
NODE_ENV=development
APP_VERSION=1.0.0

# URLs
STAGE_URL=https://console.allen-stage.in
PROD_URL=https://astra.allen.in
CUSTOM_URL=http://localhost:3000

# Sentry Configuration
SENTRY_DSN=your-sentry-dsn

# GitHub Secrets (for CI/CD)
GITHUB_TOKEN=your-github-token

```

## 🚀 **GitHub Actions & CI/CD**

This project includes automated build and release workflows using GitHub Actions.

### **Workflows**

1. **PR Build** (`.github/workflows/pr-build.yml`)
   - Triggers on pull requests to `main` and `develop`
   - Builds for all platforms (macOS, Windows, Linux)
   - Creates artifacts for testing (no GitHub release)
   - Artifacts retained for 30 days

2. **Release** (`.github/workflows/release.yml`)
   - Triggers on pushes to `main` branch
   - Builds for all platforms with code signing
   - Creates GitHub release with downloadable assets
   - Can be manually triggered with custom version

### **Quick Setup**

1. **Set up development environment**:

   ```bash
   ./scripts/setup-dev.sh
   ```

2. **Generate local certificates** (optional):

   ```bash
   ./scripts/generate-dev-cert.sh
   ```

3. **Set up production certificates**:

   ```bash
   ./scripts/setup-secrets.sh
   ```

4. **Add secrets to GitHub**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the secrets provided by the setup script

5. **Push to trigger builds**:
   - PR builds: Create a pull request (uses stage environment)
   - Releases: Push to main branch (uses production environment)

### **Supported Platforms**

- **Windows**: 64-bit (x64) and 32-bit (ia32)

### **Code Signing**

The release workflow supports code signing for secure distribution:

- **Windows**: Code signing certificate (optional)

### **Environment Configuration**

- **PR Builds**: Use stage environment (`NODE_ENV=stage`)
- **Release Builds**: Use production environment (`NODE_ENV=production`)
- **Local Development**: Use development environment (`NODE_ENV=development`)

### **Certificate Management**

- **Production**: Base64-encoded Windows certificates stored in GitHub Secrets
- **Development**: Self-signed Windows certificates generated locally
- **Stage**: No code signing (for testing)

### **Version Management**

The project uses automatic version incrementing with Semantic Versioning:

- **Automatic**: Push to main triggers patch version increment
- **Manual**: Workflow dispatch allows custom version or increment type
- **Local Tools**: Version manager script for development

```bash
# Show current version
bun run version:current

# Bump version
bun run version:bump patch    # 1.0.0 → 1.0.1
bun run version:bump minor    # 1.0.0 → 1.1.0
bun run version:bump major    # 1.0.0 → 2.0.0
```

For detailed setup instructions, see [GITHUB_ACTIONS_SETUP.md](GITHUB_ACTIONS_SETUP.md). For version
management details, see [VERSION_MANAGEMENT.md](VERSION_MANAGEMENT.md).

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
# 🚀 Development Commands
bun run dev             # Build TypeScript and start Electron app (one-time)
bun run dev:watch       # Continuous development with auto-restart on file changes
bun run dev:full        # Full-stack development (renderer + main process)

# 🏗️ Building Commands
bun run build:ts        # Compile TypeScript to JavaScript
bun run build           # Build TypeScript and create distributables
bun run dist:all        # Build for all platforms (macOS, Windows, Linux)
bun run dist:win-only   # Build for Windows only
bun run dist:mac-only   # Build for macOS only
bun run dist:linux-only # Build for Linux only
bun run dist:win        # Build Windows package (requires previous build steps)
bun run dist:mac        # Build macOS package (requires previous build steps)
bun run dist:linux      # Build Linux package (requires previous build steps)

# 🧹 Cleanup Commands
bun run clean           # Remove all build artifacts and dependencies
bun run clean:dist      # Remove only compiled JavaScript files
bun run rebuild         # Clean and rebuild TypeScript

# 🎨 Renderer Development
bun run renderer:dev    # Watch and rebuild renderer process (React)
bun run renderer:build  # Build renderer for production
bun run renderer:start  # Start webpack dev server for renderer

# 🔍 Code Quality
bun run lint            # Run Oxlint for code linting
bun run lint:fix        # Fix linting issues automatically
bun run format          # Format code with Prettier
bun run format:check    # Check code formatting without changes
bun run typecheck       # Run TypeScript type checking (no compilation)

# 📦 Publishing
bun run publish         # Publish to GitHub Releases
```

### **When to Use Each Command**

#### **🚀 Development Workflow**

- **`bun run dev`** - Use when you want to test your changes once. It compiles TypeScript and starts
  the app.
- **`bun run dev:watch`** - **Recommended for active development**. Automatically restarts the app when
  you save TypeScript files.
- **`bun run dev:full`** - Use when developing both the main process (Electron) and renderer process
  (React) simultaneously.

#### **🏗️ Building for Production**

- **`bun run build:ts`** - Use to compile TypeScript without starting the app (useful for CI/CD or
  checking compilation).
- **`bun run build`** - Use to create distributable packages for testing or distribution.
- **`bun run make`** - Use to create platform-specific installers (DMG, EXE, etc.).
- **`bun run package`** - Use to package the app for distribution without creating installers.

#### **🧹 Maintenance and Troubleshooting**

- **`bun run clean:dist`** - Use when TypeScript compilation seems stuck or you want a fresh build.
- **`bun run rebuild`** - Use when you encounter build issues or want to ensure a completely clean
  build.
- **`bun run clean`** - Use when you want to remove everything and start fresh (dependencies + build
  artifacts).

#### **🎨 Frontend Development**

- **`bun run renderer:dev`** - Use when working on React components and want hot reloading.
- **`bun run renderer:build`** - Use to build the React app for production.
- **`bun run renderer:start`** - Use to test the React app in a browser without Electron.

#### **🔍 Code Quality Checks**

- **`bun run typecheck`** - Use before committing to ensure TypeScript types are correct.
- **`bun run lint`** - Use to check for code quality issues.
- **`bun run lint:fix`** - Use to automatically fix linting issues.
- **`bun run format:check`** - Use in CI/CD to ensure code formatting is consistent.
- **`bun run format`** - Use to automatically format your code.

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
