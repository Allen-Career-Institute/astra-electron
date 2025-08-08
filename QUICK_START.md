# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Setup

```bash
# Clone the repository
git clone https://github.com/your-username/allen-ui-console-electron.git
cd allen-ui-console-electron

# Run setup script
node setup.js

# Install dependencies
npm install
```

### 2. Configuration

Edit `config.js` with your settings:

```javascript
module.exports = {
  NODE_ENV: 'development', // or 'stage', 'production'
  AGORA_APP_ID: 'your_agora_app_id',
  // ... other settings
};
```

### 3. Add Icons

Add your app icons to the `assets/` directory:

- `icon.png` (512x512)
- `icon.ico` (Windows)
- `icon.icns` (macOS)

### 4. Run Development Mode

```bash
npm run dev
```

## 🎯 Key Features

### Multi-Window Support

- **Main Window**: Loads URL based on environment
- **Second Window**: Message logging and communication
- **Third Window**: Video streaming with green screen removal

### Environment Support

- **Development**: `http://localhost:3000`
- **Stage**: `https://stage.allen-digital.com` (with custom URL option)
- **Production**: `https://app.allen-digital.com`

### Video Features

- Agora Web SDK integration
- Green screen removal
- Screen recording with configurable retention
- Combined video and audio streams

## 🔧 Development Commands

```bash
# Start development
npm run dev

# Build for distribution
npm run make

# Package without distribution
npm run package

# Publish to GitHub releases
npm run publish
```

## 📱 Building for Production

### macOS

```bash
NODE_ENV=production npm run make
```

### Windows

```bash
NODE_ENV=production npm run make
```

### Linux

```bash
NODE_ENV=production npm run make
```

## 🔐 Code Signing Setup

### macOS

1. Get Apple Developer Certificate
2. Set environment variables:
   ```bash
   export CSC_LINK="path/to/certificate"
   export CSC_KEY_PASSWORD="your_password"
   export APPLE_ID="your_apple_id"
   export APPLE_APP_SPECIFIC_PASSWORD="your_app_password"
   ```

### Windows

1. Get Code Signing Certificate
2. Set environment variables:
   ```bash
   export WINDOWS_CERT_FILE="path/to/certificate"
   export WINDOWS_CERT_PASSWORD="your_password"
   ```

## 🚀 Auto-Updates

The app automatically checks for updates from GitHub releases:

1. Create a new release on GitHub
2. Tag it (e.g., `v1.0.1`)
3. The app will download and install automatically

## 🎥 Video Streaming Setup

1. Get Agora App ID from [Agora Console](https://console.agora.io/)
2. Add to config.js:
   ```javascript
   AGORA_APP_ID: 'your_agora_app_id';
   ```
3. Open third window and configure:
   - Agora App ID
   - Channel Name
   - User ID

## 📝 IPC Communication

Send messages between windows:

```javascript
// Send to second window
window.electronAPI.sendToSecondWindow(data);

// Send to third window
window.electronAPI.sendToThirdWindow(data);

// Send to main window
window.electronAPI.sendToMainWindow(data);
```

## 🎬 Recording Features

- **Start Recording**: Click "Start Recording" in third window
- **Stop Recording**: Click "Stop Recording"
- **Auto Deletion**: Files are automatically deleted after 24 hours (configurable)
- **Formats**: WebM with VP9 codec

## 🔧 Troubleshooting

### Common Issues

1. **WebView not loading**
   - Check URL configuration
   - Verify network connectivity
   - Check console for errors

2. **Video streaming issues**
   - Verify Agora credentials
   - Check camera/microphone permissions
   - Ensure stable internet connection

3. **Auto-update failures**
   - Check GitHub token
   - Verify release configuration
   - Check network connectivity

### Debug Mode

```bash
NODE_ENV=development npm run dev
```

This opens DevTools for all windows.

## 📚 Next Steps

1. Read the full [README.md](README.md)
2. Check [GitHub Actions workflow](.github/workflows/build.yml)
3. Configure your deployment pipeline
4. Set up code signing certificates
5. Test all features thoroughly

## 🆘 Need Help?

- Check the [README.md](README.md) for detailed documentation
- Create an issue on GitHub
- Contact the development team
