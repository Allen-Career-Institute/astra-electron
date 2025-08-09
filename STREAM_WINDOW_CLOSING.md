# Stream Window Closing Behavior

## Overview

The stream window is designed to close automatically in various scenarios to ensure proper cleanup
and prevent orphaned windows. This document outlines all the conditions under which the stream
window will close.

## Closing Scenarios

### 1. Main Window Events

#### Main Window Close

- **Trigger**: Main window `close` event
- **Action**: Stream window closes immediately
- **Logging**: "Main window closing, closing stream window"

#### Main Window Closed

- **Trigger**: Main window `closed` event
- **Action**: Main window reference cleanup
- **Logging**: "Main window closed"

#### Main Window Minimize

- **Trigger**: Main window `minimize` event
- **Action**: Stream window closes
- **Logging**: "Main window minimized, closing stream window"

#### Main Window Reload

- **Trigger**: Main window `did-start-loading` event
- **Conditions**:
  - Main window has already loaded content (actual reload)
  - Stream window is not currently being set up
  - Stream window exists and is not destroyed
- **Action**: Stream window closes
- **Logging**: "Main window reloading, closing stream window"

### 2. Application Events

#### App Quit

- **Trigger**: App `before-quit` event
- **Action**: Stream window closes before app cleanup
- **Logging**: "Closing stream window before app quit"

#### All Windows Closed

- **Trigger**: App `window-all-closed` event
- **Action**: App quits (on non-macOS platforms)

### 3. Stream Window Events

#### Stream Window Closed

- **Trigger**: Stream window `closed` event
- **Action**:
  - Stream window reference cleanup
  - Setup flag reset
- **Logging**: "Stream window closed"

### 4. Error Scenarios

#### Stream Window Creation Error

- **Trigger**: Error during stream window creation
- **Action**:
  - Close any partially created window
  - Reset setup flag
  - Show error dialog in development
- **Logging**: "Error in createStreamWindow"

#### IPC Close Request

- **Trigger**: `close-stream-window-from-main` IPC call
- **Action**: Stream window closes
- **Logging**: "Stream window closed from main window"

## Implementation Details

### Event Handler Setup

```javascript
// Main window close event
mainWindow.on('close', () => {
  if (streamWindow && !streamWindow.isDestroyed()) {
    streamWindow.close();
    streamWindow = null;
  }
});

// Main window reload event
mainWindow.webContents.on('did-start-loading', () => {
  if (
    mainWindowHasLoaded &&
    streamWindow &&
    !streamWindow.isDestroyed() &&
    !streamWindowSettingUp
  ) {
    streamWindow.close();
    streamWindow = null;
  }
});

// App quit event
app.on('before-quit', () => {
  if (streamWindow && !streamWindow.isDestroyed()) {
    streamWindow.close();
    streamWindow = null;
  }
});
```

### Safety Checks

- **Window Existence**: Check if `streamWindow` exists
- **Window State**: Check if window is not destroyed
- **Setup State**: Check if window is not being set up
- **Error Handling**: Try-catch blocks around all close operations

### Cleanup Process

1. **Close Window**: Call `streamWindow.close()`
2. **Reset Reference**: Set `streamWindow = null`
3. **Reset Flags**: Set `streamWindowSettingUp = false`
4. **Log Action**: Console logging for debugging

## Benefits

### User Experience

- **No Orphaned Windows**: Stream window always closes with main window
- **Clean Reloads**: Stream window closes on main window reload
- **Proper Cleanup**: No lingering windows after app quit

### System Resources

- **Memory Management**: Proper cleanup prevents memory leaks
- **Process Cleanup**: Stream window processes are terminated
- **Resource Release**: Camera/microphone access is released

### Development

- **Debugging**: Comprehensive logging for troubleshooting
- **Error Handling**: Graceful error recovery
- **State Management**: Proper state tracking and cleanup

## Testing Scenarios

### Manual Testing

1. **Close Main Window**: Verify stream window closes
2. **Reload Main Window**: Verify stream window closes
3. **Minimize Main Window**: Verify stream window closes
4. **Quit Application**: Verify stream window closes
5. **Error Conditions**: Test with invalid configurations

### Edge Cases

1. **Rapid Reloads**: Multiple reloads in quick succession
2. **Window Focus**: Stream window focus during main window events
3. **Error Recovery**: Behavior after stream window creation errors
4. **IPC Failures**: Behavior when IPC communication fails

## Troubleshooting

### Common Issues

1. **Stream Window Not Closing**: Check event handler registration
2. **Multiple Stream Windows**: Check for proper cleanup
3. **Memory Leaks**: Verify all references are cleared
4. **Permission Issues**: Check camera/microphone access cleanup

### Debug Information

- **Console Logs**: All closing events are logged
- **Error Messages**: Detailed error information
- **State Tracking**: Window and setup state monitoring
- **Event Timing**: Order of event execution

## Future Enhancements

### Advanced Features

- **Graceful Shutdown**: Allow time for cleanup operations
- **State Persistence**: Remember window position for next session
- **Auto-Recovery**: Automatic stream window recreation
- **User Preferences**: Configurable closing behavior

### Monitoring

- **Performance Metrics**: Track window lifecycle events
- **Error Analytics**: Monitor closing failure rates
- **User Behavior**: Track common closing scenarios
- **System Impact**: Monitor resource usage patterns
