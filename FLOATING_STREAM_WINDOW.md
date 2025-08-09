# Floating Stream Window Implementation

## Overview

The stream window has been updated to be a truly floating, resizable, and draggable window that
loads content from the allen-ui-live web application via URL instead of using native Agora SDK.

## Key Features

### 1. Floating Window Behavior

- **Independent Window**: Removed parent window dependency for true floating behavior
- **Always on Top**: Window stays above other applications
- **Draggable**: Custom title bar allows dragging the window
- **Resizable**: Window can be resized with visual resize handle
- **Focusable**: Window can receive focus and keyboard input

### 2. Window Configuration

```javascript
{
  frame: false,           // Custom window frame
  resizable: true,        // Allow resizing
  movable: true,          // Allow moving
  alwaysOnTop: true,      // Stay on top
  skipTaskbar: true,      // Don't show in taskbar
  parent: null,           // No parent window
  minimizable: true,      // Allow minimizing
  maximizable: false,     // Prevent maximizing
  fullscreenable: false,  // Prevent fullscreen
  minWidth: 240,          // Minimum width
  minHeight: 135,         // Minimum height
  maxWidth: 800,          // Maximum width
  maxHeight: 450,         // Maximum height
  hasShadow: true,        // Window shadow
  titleBarStyle: 'hidden' // Hidden title bar
}
```

### 3. Custom Title Bar

- **Draggable Header**: Uses `-webkit-app-region: drag` for dragging
- **Window Controls**: Minimize and close buttons
- **Status Display**: Shows connection status
- **Non-draggable Buttons**: Uses `-webkit-app-region: no-drag` for clickable controls

### 4. Visual Enhancements

- **Rounded Corners**: Modern appearance with border-radius
- **Window Shadow**: Subtle shadow for depth
- **Resize Handle**: Visual indicator for resizing
- **Hover Effects**: Interactive feedback on controls
- **Responsive Design**: Adapts to different window sizes

## Implementation Details

### Electron Main Process

- **Window Creation**: Updated `createStreamWindow()` function
- **Event Handlers**: Added focus, blur, move, resize event handlers
- **IPC Handlers**: Minimize and close window controls
- **Floating Behavior**: Removed dependency on main window position

### Web Application

- **Custom Title Bar**: HTML structure with window controls
- **Draggable Header**: CSS with `-webkit-app-region: drag`
- **Window Controls**: Buttons for minimize and close
- **Resize Handle**: Visual indicator for resizing
- **Responsive Layout**: Adapts to window size changes

### CSS Features

```css
/* Draggable header */
.stream-header {
  -webkit-app-region: drag;
  user-select: none;
}

/* Clickable controls */
.stream-controls {
  -webkit-app-region: no-drag;
}

/* Resize handle */
.resize-handle {
  cursor: se-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(255, 255, 255, 0.3) 50%);
}
```

## User Experience

### Window Management

1. **Opening**: Stream window opens when `CONFIG_UPDATE` is received
2. **Dragging**: Click and drag the title bar to move the window
3. **Resizing**: Drag the bottom-right corner or edges to resize
4. **Minimizing**: Click the minimize button or use window controls
5. **Closing**: Click the close button or use window controls

### Visual Feedback

- **Hover Effects**: Controls highlight on hover
- **Status Indicators**: Connection status in title bar
- **Resize Cursor**: Visual feedback when hovering over resize areas
- **Window Focus**: Visual indication when window is active

### Responsive Behavior

- **Minimum Size**: 240x135 pixels (16:9 aspect ratio)
- **Maximum Size**: 800x450 pixels
- **Mobile Adaptation**: Smaller controls on smaller windows
- **Aspect Ratio**: Maintains video aspect ratio during resize

## Benefits

### User Experience

- **Floating**: Window can be positioned anywhere on screen
- **Independent**: Not tied to main window position
- **Flexible**: Can be resized to user preference
- **Modern**: Clean, modern appearance

### Technical Benefits

- **Web-Based**: Easier to maintain and update
- **Secure**: Proper context isolation
- **Performance**: Reduced native dependencies
- **Compatibility**: Better cross-platform support

## Future Enhancements

- **Window Position Memory**: Remember window position between sessions
- **Multiple Stream Windows**: Support for multiple floating windows
- **Advanced Controls**: More window management options
- **Themes**: Customizable window appearance
- **Animations**: Smooth transitions and animations
