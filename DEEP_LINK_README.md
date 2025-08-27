# Deep Linking in Astra Console Electron App

This document explains how deep linking is implemented in the Astra Console Electron application, allowing external applications and web browsers to open specific content within the app.

## Overview

Deep linking allows users to click on URLs like `astra-console://open-stream/stream-123` and have the Astra Console app open directly to that specific content. This is useful for:

- Sharing specific streams or whiteboards via links
- Opening the app from web applications
- Integration with other desktop applications
- Quick navigation to specific features

## Protocol Scheme

The app uses the custom protocol scheme: `astra-console://`

## Implementation Details

### 1. Protocol Registration

The app registers itself as the default handler for the `astra-console://` protocol with the operating system. This is handled in the `DeepLinkHandler` class in `src/modules/deepLinkHandler.ts`.

### 2. Cross-Platform Support

The implementation handles deep links differently based on the operating system:

- **macOS**: Uses the `open-url` event
- **Windows/Linux**: Uses the `second-instance` event with single instance lock
- **All platforms**: Handles deep links when the app starts from a protocol request

### 3. Deep Link Format

Deep links support two formats:

#### Query Parameter Format

```
astra-console://?action=open-stream&id=stream-123&quality=high
```

#### Path Segment Format

```
astra-console://open-stream/stream-123?quality=high
```

## Supported Actions

### 1. Open Stream

```
astra-console://open-stream/stream-123
astra-console://?action=open-stream&id=stream-123
```

### 2. Open Whiteboard

```
astra-console://open-whiteboard/wb-456
astra-console://?action=open-whiteboard&id=wb-456
```

### 3. Navigation

```
astra-console://navigate/dashboard
astra-console://?action=navigate&id=dashboard
```

### 4. Custom Actions

```
astra-console://?action=custom-action&param1=value1&param2=value2
```

## Usage Examples

### Creating Deep Links

```typescript
import {
  DeepLinkUtils,
  createStreamLink,
  createWhiteboardLink,
} from './utils/deepLinkUtils';

// Create a stream deep link
const streamLink = createStreamLink('stream-123', { quality: 'high' });
// Result: astra-console://open-stream/stream-123?quality=high

// Create a whiteboard deep link
const whiteboardLink = createWhiteboardLink('wb-456', { theme: 'dark' });
// Result: astra-console://open-whiteboard/wb-456?theme=dark

// Create a custom deep link
const customLink = DeepLinkUtils.createDeepLink('custom-action', {
  param1: 'value1',
  param2: 'value2',
});
// Result: astra-console://?action=custom-action&param1=value1&param2=value2
```

### Handling Deep Links in Renderer

```typescript
import { DeepLinkData } from '../types/preload';

// Listen for deep links from main process
if (window.electronAPI?.onDeepLink) {
  window.electronAPI.onDeepLink((event, deepLinkData: DeepLinkData) => {
    console.log('Deep link received:', deepLinkData);

    // Handle the deep link based on action
    switch (deepLinkData.action) {
      case 'open-stream':
        if (deepLinkData.id) {
          openStream(deepLinkData.id);
        }
        break;
      case 'open-whiteboard':
        if (deepLinkData.id) {
          openWhiteboard(deepLinkData.id);
        }
        break;
      case 'navigate':
        if (deepLinkData.id) {
          navigateTo(deepLinkData.id);
        }
        break;
    }
  });
}
```

### Parsing Deep Links

```typescript
import { DeepLinkUtils } from './utils/deepLinkUtils';

const url = 'astra-console://open-stream/stream-123?quality=high';
const deepLinkData = DeepLinkUtils.parseDeepLink(url);

if (deepLinkData) {
  console.log('Action:', deepLinkData.action); // 'open-stream'
  console.log('ID:', deepLinkData.id); // 'stream-123'
  console.log('Quality:', deepLinkData.quality); // 'high'
}
```

## Testing Deep Links

### During Development

1. Build and run the app: `yarn dev`
2. Use the demo interface to generate example deep links
3. Copy a deep link to clipboard
4. Paste it in your browser's address bar
5. Press Enter to test (note: may not work in development mode)

### After Packaging

1. Build the app: `yarn electron:build`
2. Install the packaged application
3. Test deep links by pasting them in browser address bars
4. The app should open and handle the deep link appropriately

## Configuration

### Electron Builder Configuration

The deep linking protocol is configured in `electron-builder.json`:

```json
{
  "protocols": {
    "name": "astra-console-protocol",
    "schemes": ["astra-console"]
  }
}
```

### Platform-Specific Notes

- **macOS**: Deep links work automatically after packaging
- **Windows**: Deep links work after packaging and installation
- **Linux**: Deep links work after packaging and installation

## Security Considerations

1. **URL Validation**: Always validate deep link URLs before processing
2. **Parameter Sanitization**: Sanitize all parameters to prevent injection attacks
3. **Action Whitelisting**: Only allow specific, predefined actions
4. **Rate Limiting**: Consider implementing rate limiting for deep link requests

## Troubleshooting

### Common Issues

1. **Deep links not working in development**: This is expected behavior. Deep links only work with packaged applications.

2. **App not opening from deep link**: Ensure the app is properly installed and registered as the default protocol handler.

3. **Deep link parameters not received**: Check that the renderer process is properly listening for deep link events.

4. **Protocol not registered**: Verify that the `protocols` section is correctly configured in `electron-builder.json`.

### Debug Steps

1. Check console logs for deep link events
2. Verify protocol registration in system settings
3. Test with simple deep links first
4. Ensure the app is running as a single instance

## Future Enhancements

Potential improvements to consider:

1. **Deep Link Analytics**: Track deep link usage and success rates
2. **Fallback Handling**: Handle cases where deep links fail
3. **Rich Preview**: Show preview information when sharing deep links
4. **Batch Processing**: Handle multiple deep links in sequence
5. **Custom Protocol Extensions**: Support for additional protocol schemes

## References

- [BigBinary Blog - Deep Links in Electron](https://www.bigbinary.com/blog/deep-link-electron-app)
- [Electron Protocol Handler Documentation](https://www.electronjs.org/docs/latest/api/protocol)
- [Electron Builder Protocols Configuration](https://www.electron.build/configuration/configuration#protocols)
