# Astra Electron Console

A modern Electron application for Allen Digital's Astra console with webview integration and video streaming capabilities.

### Build Commands:

```bash
# Build only Windows NSIS
yarn build:win-nsis
```

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
   yarn dev:full
   ```

### **Workflows**

1. **PR Build** (`.github/workflows/pr-build.yml`)
   - Triggers on pull requests to `main`
   - Builds for all platforms (macOS, Windows, Linux)
   - Creates artifacts for testing (no GitHub release)
   - Artifacts retained for 1 days

2. **Release** (`.github/workflows/release.yml`)
   - Triggers on release tag with latest `main` branch code
   - Builds for all platforms with code signing
   - Creates GitHub release with downloadable assets
   - Can be manually triggered with custom version

### **Quick Setup**

1. **Add secrets to GitHub**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add the secrets provided by the setup script

2. **Push to trigger builds**:
   - PR builds: Create a pull request (uses stage environment) and generated build
   - Releases: Push to main branch (uses production environment) & create a release tag it will auto create a build and send update to users

### **Supported Platforms**

- **Windows**: 64-bit (x64) and 32-bit (ia32)

### **Environment Configuration**

- **PR Builds**: Use stage environment (`NODE_ENV=stage`)
- **Release Builds**: Use production environment (`NODE_ENV=production`)
- **Local Development**: Use development environment (`NODE_ENV=development`)

### **When to Use Each Command**

#### **🚀 Development Workflow**

- **`yarn dev`** - Use when you want to test your changes once. It compiles TypeScript and starts
  the app.
- **`yarn dev:watch`** - **Recommended for active development**. Automatically restarts the app when
  you save TypeScript files.
- **`yarn dev:full`** - Use when developing both the main process (Electron) and renderer process
  (React) simultaneously.

#### **🏗️ Building for Production**

- **`yarn build:ts`** - Use to compile TypeScript without starting the app (useful for CI/CD or
  checking compilation).
- **`yarn build`** - Use to create distributable packages for testing or distribution.
- **`yarn make`** - Use to create platform-specific installers (DMG, EXE, etc.).
- **`yarn package`** - Use to package the app for distribution without creating installers.

#### **🧹 Maintenance and Troubleshooting**

- **`yarn clean:dist`** - Use when TypeScript compilation seems stuck or you want a fresh build.
- **`yarn rebuild`** - Use when you encounter build issues or want to ensure a completely clean
  build.
- **`yarn clean`** - Use when you want to remove everything and start fresh (dependencies + build
  artifacts).

#### **🎨 Frontend Development**

- **`yarn renderer:dev`** - Use when working on React components and want hot reloading.
- **`yarn renderer:build`** - Use to build the React app for production.
- **`yarn renderer:start`** - Use to test the React app in a browser without Electron.

#### **🔍 Code Quality Checks**

- **`yarn typecheck`** - Use before committing to ensure TypeScript types are correct.
- **`yarn lint`** - Use to check for code quality issues.
- **`yarn lint:fix`** - Use to automatically fix linting issues.
- **`yarn format:check`** - Use in CI/CD to ensure code formatting is consistent.
- **`yarn format`** - Use to automatically format your code.
