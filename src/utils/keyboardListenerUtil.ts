import { BrowserWindow } from 'electron';

const addKeyboardListenerUtil = (window: BrowserWindow) => {
  if (window && !window.isDestroyed()) {
    window.webContents.executeJavaScript(`
            // Initialize external zoom value
            if (typeof window.externalZoom === 'undefined') {
              window.externalZoom = 1;
            }
            
            window.addEventListener('keydown', function (e) {
              if (e.keyCode === 88 && e.metaKey) {
                document.execCommand('cut');
              }
              else if (e.keyCode === 67 && e.metaKey) {
                document.execCommand('copy');
              }
              else if (e.keyCode === 86 && e.metaKey) {
                document.execCommand('paste');
              }
              else if (e.keyCode === 65 && e.metaKey) {
                document.execCommand('selectAll');
              }
              else if (e.keyCode === 90 && e.metaKey) {
                document.execCommand('undo');
              }
              else if (e.keyCode === 89 && e.metaKey) {
                document.execCommand('redo');
              }
              else if ((e.keyCode === 187 || e.keyCode === 61) && e.metaKey) {
                // Cmd+Plus or Cmd+= for zoom in
                e.preventDefault();
                window.externalZoom = Math.min(window.externalZoom + 0.1, 3.0);
                document.body.style.zoom = window.externalZoom;
              }
              else if (e.keyCode === 189 && e.metaKey) {
                // Cmd+Minus for zoom out
                e.preventDefault();
                window.externalZoom = Math.max(window.externalZoom - 0.1, 0.5);
                document.body.style.zoom = window.externalZoom;
              }
              else if (e.keyCode === 48 && e.metaKey) {
                // Cmd+0 for reset zoom
                e.preventDefault();
                window.externalZoom = 1;
                document.body.style.zoom = window.externalZoom;
              }
            });
        `);
  }
};

export { addKeyboardListenerUtil };
