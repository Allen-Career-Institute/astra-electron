// Webview preload script to ensure localStorage access
const { contextBridge, ipcRenderer } = require('electron');

// Expose localStorage access to the webview
contextBridge.exposeInMainWorld('webviewAPI', {
  // Test localStorage access
  testLocalStorage: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('webview-preload-test', 'webview-preload-working');
        const testValue = localStorage.getItem('webview-preload-test');
        console.log('Webview preload localStorage test:', testValue);
        return { success: true, value: testValue };
      } else {
        console.error('localStorage not available in webview preload');
        return { success: false, error: 'localStorage not available' };
      }
    } catch (error) {
      console.error('Webview preload localStorage test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Test sessionStorage access
  testSessionStorage: () => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          'webview-preload-session',
          'webview-preload-session-working'
        );
        const testValue = sessionStorage.getItem('webview-preload-session');
        console.log('Webview preload sessionStorage test:', testValue);
        return { success: true, value: testValue };
      } else {
        console.error('sessionStorage not available in webview preload');
        return { success: false, error: 'sessionStorage not available' };
      }
    } catch (error) {
      console.error('Webview preload sessionStorage test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Get localStorage value
  getLocalStorage: key => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error getting localStorage:', error);
      return null;
    }
  },

  // Set localStorage value
  setLocalStorage: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Error setting localStorage:', error);
      return false;
    }
  },

  // Get sessionStorage value
  getSessionStorage: key => {
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.error('Error getting sessionStorage:', error);
      return null;
    }
  },

  // Set sessionStorage value
  setSessionStorage: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Error setting sessionStorage:', error);
      return false;
    }
  },

  // Token management
  setTokens: tokens => {
    try {
      localStorage.setItem('tokens', JSON.stringify(tokens));
      console.log('Tokens set in webview localStorage:', tokens);
      return { success: true };
    } catch (error) {
      console.error('Error setting tokens in webview:', error);
      return { success: false, error: error.message };
    }
  },

  getTokens: () => {
    try {
      const tokens = localStorage.getItem('tokens');
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Error getting tokens from webview:', error);
      return null;
    }
  },
});

// Test localStorage access when preload script loads
console.log('Webview preload script loaded');
try {
  if (typeof localStorage !== 'undefined') {
    console.log('localStorage is available in preload script');
    localStorage.setItem('preload-init-test', 'preload-script-loaded');
    console.log('Preload script localStorage test successful');
  } else {
    console.error('localStorage not available in preload script');
  }
} catch (error) {
  console.error('Preload script localStorage test failed:', error);
}
