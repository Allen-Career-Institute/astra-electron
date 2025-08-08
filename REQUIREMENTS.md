# Allen UI Console Electron App - Requirements & Specifications

## 📱 **App Icon Requirements**

### **macOS Icon Specifications**

- **File Format**: `.icns` (Icon Container)
- **Dimensions**: Multiple sizes in single file
  - 16x16 px
  - 32x32 px
  - 64x64 px
  - 128x128 px
  - 256x256 px
  - 512x512 px
  - 1024x1024 px
- **Location**: `assets/icon.icns`
- **Background**: Transparent or solid color
- **Design**: Must be recognizable at small sizes

### **Windows Icon Specifications**

- **File Format**: `.ico` (Icon File)
- **Dimensions**: Multiple sizes in single file
  - 16x16 px
  - 32x32 px
  - 48x48 px
  - 64x64 px
  - 128x128 px
  - 256x256 px
- **Location**: `assets/icon.ico`
- **Background**: Transparent or solid color

### **Linux Icon Specifications**

- **File Format**: `.png` (Portable Network Graphics)
- **Dimensions**:
  - 16x16 px
  - 32x32 px
  - 48x48 px
  - 64x64 px
  - 128x128 px
  - 256x256 px
  - 512x512 px
- **Location**: `assets/icon.png`
- **Background**: Transparent preferred

## 🖼️ **Splash Screen & Loading Screen**

### **Splash Screen Requirements**

- **File Format**: `.png` or `.jpg`
- **Dimensions**:
  - **macOS**: 1280x720 px (16:9 ratio)
  - **Windows**: 1280x720 px (16:9 ratio)
  - **Linux**: 1280x720 px (16:9 ratio)
- **Location**: `assets/splash.png`
- **Content**: App logo, loading indicator, version info
- **Background**: Brand colors or gradient
- **Text**: App name, version, loading status

### **Loading Screen Specifications**

- **Animation**: CSS-based or GIF
- **Duration**: 2-5 seconds
- **Progress Indicator**: Percentage or spinner
- **Branding**: Company logo and colors
- **Responsive**: Adapt to window size

## 📐 **Window Dimensions & Layout**

### **Main Window**

- **Default Size**: 1200x800 px
- **Minimum Size**: 800x600 px
- **Maximum Size**: 1920x1080 px
- **Resizable**: Yes
- **Fullscreen**: Supported
- **Title Bar**: Custom (hidden in fullscreen)

### **Secondary Window**

- **Default Size**: 1000x700 px
- **Minimum Size**: 600x400 px
- **Maximum Size**: 1600x900 px
- **Resizable**: Yes
- **Always on Top**: Optional

### **Video Window (Third Window)**

- **Default Size**: 1280x720 px (16:9)
- **Minimum Size**: 640x360 px
- **Maximum Size**: 1920x1080 px
- **Resizable**: Yes
- **Aspect Ratio**: 16:9 maintained
- **Always on Top**: Yes (for video calls)

### **Advanced Recording Window**

- **Default Size**: 1400x900 px
- **Minimum Size**: 1000x700 px
- **Maximum Size**: 1920x1080 px
- **Split Layout**: WebView (left) + Controls (right)
- **Resizable**: Yes

## 🎥 **Video & Audio Specifications**

### **Video Recording**

- **Codec**: H.264 (libx264)
- **Container**: MP4
- **Resolution**:
  - **Standard**: 1280x720 (720p)
  - **High**: 1920x1080 (1080p)
  - **Ultra**: 2560x1440 (2K)
- **Frame Rate**: 24, 30, or 60 fps
- **Bitrate**:
  - **Low**: 1000k
  - **Medium**: 2500k
  - **High**: 5000k
- **Quality**: Configurable (low/medium/high)

### **Audio Recording**

- **Codec**: AAC (audio) / PCM (raw)
- **Sample Rate**: 44.1kHz or 48kHz
- **Channels**: Stereo (2 channels)
- **Bitrate**:
  - **Low**: 64k
  - **Medium**: 128k
  - **High**: 256k
- **Format**: MP3, WAV, or AAC

### **Combined Recording**

- **Output Format**: MP4 (H.264 + AAC)
- **Synchronization**: Audio-video sync maintained
- **Metadata**: Recording date, duration, device info
- **File Naming**: `recording_YYYY-MM-DD_HH-MM-SS.mp4`

## 🎯 **Device Support**

### **Audio Devices**

- **Input**: Microphones, audio interfaces
- **Output**: Speakers, headphones
- **Formats**: WAV, MP3, AAC, FLAC
- **Channels**: Mono, Stereo, 5.1, 7.1
- **Sample Rates**: 44.1kHz, 48kHz, 96kHz

### **Video Devices**

- **Input**: Webcams, USB cameras, capture cards
- **Output**: Displays, projectors
- **Resolutions**: Up to 4K (3840x2160)
- **Frame Rates**: 24, 30, 60 fps
- **Formats**: MJPEG, H.264, H.265

### **Screen Recording**

- **Full Screen**: Entire desktop
- **Window**: Specific application window
- **Region**: Custom rectangular area
- **Audio**: System audio + microphone
- **Quality**: Configurable bitrate and resolution

## 📁 **File Format Support**

### **Video Formats**

- **Input**: MP4, AVI, MOV, MKV, WebM
- **Output**: MP4 (H.264), WebM (VP9)
- **Codecs**: H.264, H.265, VP8, VP9
- **Containers**: MP4, AVI, MOV, MKV, WebM

### **Audio Formats**

- **Input**: MP3, WAV, AAC, FLAC, OGG
- **Output**: MP3, WAV, AAC
- **Codecs**: AAC, MP3, PCM, FLAC
- **Quality**: 64k - 320k bitrate

### **Image Formats**

- **Icons**: ICO, ICNS, PNG
- **Splash**: PNG, JPG, GIF
- **Screenshots**: PNG, JPG
- **Thumbnails**: PNG, JPG

### **Document Formats**

- **Configuration**: JSON, YAML, INI
- **Logs**: TXT, JSON
- **Metadata**: JSON, XML

## 🔧 **Technical Requirements**

### **Operating System Support**

- **macOS**: 10.14+ (Mojave and later)
- **Windows**: 10+ (64-bit)
- **Linux**: Ubuntu 18.04+, CentOS 7+, Fedora 30+

### **Hardware Requirements**

- **CPU**: Intel i3/AMD Ryzen 3 or better
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Graphics**: Integrated graphics sufficient
- **Network**: Broadband internet connection

### **Software Dependencies**

- **Node.js**: 16.x or later
- **Electron**: 28.x or later
- **FFmpeg**: Bundled with app
- **WebRTC**: Built into Electron
- **Sentry**: Error tracking integration

## 🎨 **UI/UX Requirements**

### **Color Scheme**

- **Primary**: Brand colors (configurable)
- **Secondary**: Complementary colors
- **Accent**: Highlight colors for actions
- **Background**: Dark theme preferred
- **Text**: High contrast, readable fonts

### **Typography**

- **Primary Font**: System default (San Francisco, Segoe UI, Ubuntu)
- **Fallback**: Arial, Helvetica, sans-serif
- **Sizes**: 12px (small), 14px (normal), 16px (large), 18px (heading)
- **Weights**: Regular (400), Medium (500), Bold (700)

### **Icons & Graphics**

- **Style**: Material Design or custom brand
- **Size**: 16px, 24px, 32px, 48px
- **Format**: SVG preferred, PNG fallback
- **Color**: Monochrome or brand colors

### **Animations**

- **Duration**: 200-300ms for interactions
- **Easing**: Ease-in-out for smooth transitions
- **Loading**: Spinner or progress bar
- **Feedback**: Hover effects, click animations

## 🔒 **Security Requirements**

### **Code Signing**

- **macOS**: Developer ID Application certificate
- **Windows**: Code signing certificate
- **Linux**: GPG signing (optional)

### **Notarization (macOS)**

- **Required**: For distribution outside App Store
- **Process**: Apple notarization service
- **Timeline**: 24-48 hours for approval

### **Permissions**

- **Camera**: Required for video recording
- **Microphone**: Required for audio recording
- **Screen Recording**: Required for screen capture
- **File System**: Required for saving recordings
- **Network**: Required for web content and updates

## 📊 **Performance Requirements**

### **Startup Time**

- **Cold Start**: < 3 seconds
- **Warm Start**: < 1 second
- **Background**: < 500ms

### **Memory Usage**

- **Idle**: < 100MB
- **Recording**: < 500MB
- **Multiple Windows**: < 1GB

### **CPU Usage**

- **Idle**: < 5%
- **Recording**: < 30%
- **Video Processing**: < 50%

### **Disk I/O**

- **Recording**: 10-50 MB/s
- **File Operations**: < 100ms response time
- **Storage**: Efficient compression and cleanup

## 🔄 **Update Requirements**

### **Auto-Update**

- **Platform**: GitHub Releases
- **Frequency**: Weekly or as needed
- **Channel**: Stable, Beta, Alpha
- **Rollback**: Support for previous versions

### **Update Process**

- **Download**: Background download
- **Install**: Automatic installation
- **Restart**: Graceful application restart
- **Notification**: User-friendly update prompts

## 📝 **Documentation Requirements**

### **User Documentation**

- **Getting Started**: Installation and setup
- **User Guide**: Feature explanations
- **Troubleshooting**: Common issues and solutions
- **FAQ**: Frequently asked questions

### **Developer Documentation**

- **API Reference**: Function documentation
- **Architecture**: System design and flow
- **Contributing**: Development guidelines
- **Deployment**: Build and release process

## 🧪 **Testing Requirements**

### **Unit Testing**

- **Coverage**: > 80% code coverage
- **Framework**: Jest or Mocha
- **Mocking**: Electron APIs and external services

### **Integration Testing**

- **End-to-End**: Playwright or Spectron
- **API Testing**: Recording and device functions
- **UI Testing**: Window management and controls

### **Performance Testing**

- **Load Testing**: Multiple recording sessions
- **Memory Testing**: Long-running operations
- **Stress Testing**: High-resolution recording

## 📦 **Packaging Requirements**

### **macOS**

- **Format**: DMG, PKG, or ZIP
- **Architecture**: Intel (x64) and Apple Silicon (arm64)
- **Distribution**: App Store or direct download

### **Windows**

- **Format**: EXE installer or portable ZIP
- **Architecture**: x64 (64-bit)
- **Distribution**: Direct download or Microsoft Store

### **Linux**

- **Format**: AppImage, DEB, or RPM
- **Architecture**: x64 (64-bit)
- **Distribution**: Direct download or package managers

## 🔧 **Development Environment**

### **Required Tools**

- **Node.js**: 16.x or later
- **npm**: 8.x or later
- **Git**: 2.x or later
- **Code Editor**: VS Code recommended

### **Optional Tools**

- **FFmpeg**: For video processing
- **ImageMagick**: For icon generation
- **Inkscape**: For SVG editing
- **Audacity**: For audio editing

### **Development Scripts**

```bash
# Install dependencies
yarn install

# Start development
yarn run dev

# Build for production
yarn run build

# Run tests
yarn test

# Lint code
yarn run lint

# Format code
yarn run format

# Type checking
yarn run typecheck
```

## 📋 **Checklist for Release**

### **Pre-Release**

- [ ] All tests passing
- [ ] Code linted and formatted
- [ ] TypeScript compilation successful
- [ ] Icons generated for all platforms
- [ ] Splash screen created
- [ ] Documentation updated

### **Build Process**

- [ ] Code signing certificates ready
- [ ] Notarization process configured
- [ ] Auto-update system tested
- [ ] Installer packages created
- [ ] Release notes prepared

### **Post-Release**

- [ ] GitHub release created
- [ ] Auto-update pushed
- [ ] Documentation published
- [ ] User feedback collected
- [ ] Bug reports monitored

---

_This document should be updated as requirements evolve and new features are added._
