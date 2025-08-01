// 1. Console Protection Hook (React Hook)
import { useEffect } from 'react';

export const useConsoleProtection = () => {
  useEffect(() => {
    // Disable console methods in production
    if (process.env.NODE_ENV === 'production') {
      const noop = () => {};
      
      // Override console methods
      console.log = noop;
      console.warn = noop;
      console.error = noop;
      console.info = noop;
      console.debug = noop;
      console.trace = noop;
      console.table = noop;
      console.group = noop;
      console.groupEnd = noop;
      console.clear = noop;
      
      // Clear existing console
      console.clear();
    }

    // Detect DevTools opening
    let devtools = {
      open: false,
      orientation: null
    };
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > 200 || 
          window.outerWidth - window.innerWidth > 200) {
        if (!devtools.open) {
          devtools.open = true;
          // Redirect or show warning when DevTools detected
          handleDevToolsDetection();
        }
      } else {
        devtools.open = false;
      }
    }, 500);

    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable common keyboard shortcuts
    const handleKeyDown = (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.keyCode === 123 || 
          (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) ||
          (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDevToolsDetection = () => {
    // Option 1: Redirect to a warning page
    // window.location.href = '/unauthorized';
    
    // Option 2: Show alert and redirect
    alert('Unauthorized access detected. Redirecting...');
    window.location.href = '/';
    
    // Option 3: Close the tab/window
    // window.close();
  };
};

// 2. Environment-based Console Management
export const setupConsoleProtection = () => {
  if (process.env.NODE_ENV === 'production') {
    // Completely disable console
    window.console = {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {},
      trace: () => {},
      table: () => {},
      group: () => {},
      groupEnd: () => {},
      clear: () => {},
      time: () => {},
      timeEnd: () => {},
      count: () => {},
      assert: () => {}
    };

    // Show warning message instead
    Object.defineProperty(window, 'console', {
      value: {
        ...window.console,
        log: () => console.warn('Console access is restricted in production'),
        error: () => console.warn('Console access is restricted in production'),
      },
      writable: false,
      configurable: false
    });
  }
};

// 3. Anti-Debug Protection
export const antiDebugProtection = () => {
  // Detect debugging attempts
  let startTime = new Date();
  debugger; // This will pause execution if DevTools is open
  let endTime = new Date();
  
  if (endTime - startTime > 100) {
    // DevTools detected
    window.location.href = '/unauthorized';
  }
  
  // Continue checking periodically
  setTimeout(antiDebugProtection, 1000);
};

// 4. Source Code Obfuscation Warning
export const addSourceProtectionWarning = () => {
  const style = `
    color: red;
    font-size: 30px;
    font-weight: bold;
    background: yellow;
    padding: 10px;
  `;
  
  console.log('%cSTOP!', style);
  console.log('%cThis is a browser feature intended for developers. Unauthorized access to this console may violate our terms of service.', 'color: red; font-size: 16px;');
  console.log('%cIf someone told you to copy-paste something here, it is likely a scam.', 'color: red; font-size: 16px;');
};

// 5. Network Request Protection
export const hideNetworkRequests = () => {
  if (process.env.NODE_ENV === 'production') {
    // Override fetch to hide Firebase requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      // Log minimal info or nothing
      return originalFetch.apply(this, args);
    };

    // Override XMLHttpRequest
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      
      xhr.open = function(method, url, ...rest) {
        // Don't log sensitive URLs
        if (!url.includes('firestore.googleapis.com')) {
          return originalOpen.apply(this, [method, url, ...rest]);
        }
        return originalOpen.apply(this, arguments);
      };
      
      return xhr;
    };
  }
};

// 6. React Component Usage
export const ProtectedApp = ({ children }) => {
  // Use the protection hook
  useConsoleProtection();
  
  useEffect(() => {
    setupConsoleProtection();
    addSourceProtectionWarning();
    hideNetworkRequests();
    
    // Start anti-debug protection (use carefully)
    // antiDebugProtection();
  }, []);

  return <>{children}</>;
};

// 7. Firebase Config Protection
export const getFirebaseConfig = () => {
  // Don't expose the actual config in console
  if (process.env.NODE_ENV === 'production') {
    return {
      // Your actual config here, but it won't be logged
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      // ... other config
    };
  }
  
  // In development, you can still see the config
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    // ... other config
  };
};

export default useConsoleProtection;