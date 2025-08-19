# Allen Console Installer Fixes

## Problem

Users were encountering the error "Allen Console cannot be closed, please close it manually and click retry to continue" during installation on Windows.

## Solution

The installer has been enhanced with multiple layers of application closure handling:

### 1. NSIS Configuration Updates

- Added `allowElevation: true` to handle permission issues
- Enhanced installer icons and branding
- Added proper error handling and user feedback

### 2. Application Closure Scripts

#### PowerShell Script (`assets/installer/close-app.ps1`)

- Gracefully closes the application using `CloseMainWindow()`
- Falls back to force termination if needed
- Uses WMI for comprehensive process cleanup
- Handles multiple process name variations

#### Batch File (`assets/installer/close-app.bat`)

- Alternative approach for environments with PowerShell restrictions
- Uses `taskkill` and `wmic` commands
- Provides fallback cleanup methods

### 3. NSIS Integration (`assets/installer/installer.nsh`)

- Automatically copies closure scripts to temp directory
- Tries PowerShell first, falls back to batch file
- Provides user-friendly dialog if application is running
- Handles both installation and uninstallation scenarios

## How It Works

1. **Pre-Installation Check**: The installer checks if Allen Console is running
2. **User Notification**: If running, shows a dialog asking user to close or continue
3. **Automatic Closure**: Uses PowerShell script to gracefully close the application
4. **Fallback Methods**: If PowerShell fails, uses batch file and direct taskkill commands
5. **Verification**: Waits for processes to close before proceeding

## Files Modified

- `electron-builder.json` - Enhanced NSIS configuration
- `assets/installer/installer.nsh` - NSIS script for application closure
- `assets/installer/close-app.ps1` - PowerShell closure script
- `assets/installer/close-app.bat` - Batch file closure script

## Benefits

- **User-Friendly**: Clear messaging and options for users
- **Robust**: Multiple fallback methods ensure application closure
- **Compatible**: Works with different Windows configurations
- **Safe**: Graceful closure before force termination
- **Comprehensive**: Handles various process name variations
- **Build-Ready**: Scripts are located in `assets/installer/` to ensure they're included in the build

## Testing

To test the installer:

1. Run Allen Console
2. Start the installer
3. The installer should automatically detect and close the running application
4. Installation should proceed without manual intervention

## File Structure

The installer scripts are located in `assets/installer/` to ensure they're included in the build:

```
assets/
└── installer/
    ├── installer.nsh      # Main NSIS script
    ├── close-app.ps1      # PowerShell closure script
    └── close-app.bat      # Batch file closure script
```

## Troubleshooting

If issues persist:

1. Check Windows Event Viewer for installer logs
2. Verify PowerShell execution policy allows script execution
3. Ensure user has sufficient permissions for process termination
4. Check if antivirus software is blocking the installer
5. Verify that `assets/installer/` files are included in the build
