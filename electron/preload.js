const { contextBridge, ipcRenderer } = require('electron');

// === OXICHSTUDIO ELECTRON API - IMPROVED ERROR HANDLING ===
const electronAPI = {
  // === SERVER ===
  server: {
    getStatus: () => ipcRenderer.invoke('server:get-status'),
    start: (config) => ipcRenderer.invoke('server:start', config),
    stop: () => ipcRenderer.invoke('server:stop')
  },

  // === CONFIGURATION ===
  config: {
    get: (keyPath, defaultValue) => ipcRenderer.invoke('config:get', keyPath, defaultValue),
    set: (keyPath, value) => ipcRenderer.invoke('config:set', keyPath, value),
    updateMultiple: (updates) => ipcRenderer.invoke('config:update-multiple', updates),
    export: () => ipcRenderer.invoke('config:export'),
    import: (configString) => ipcRenderer.invoke('config:import', configString),
    reset: () => ipcRenderer.invoke('config:reset')
  },

  // === NETWORK ===
  network: {
    getInfo: (port, enableLan) => ipcRenderer.invoke('network:get-info', port, enableLan),
    getDebugInfo: () => ipcRenderer.invoke('network:get-debug-info'),
    checkPort: (port) => ipcRenderer.invoke('network:check-port', port),
    suggestPorts: (currentPort, count) => ipcRenderer.invoke('network:suggest-ports', currentPort, count),
    findPreferredPort: (configuredPort) => ipcRenderer.invoke('network:find-preferred-port', configuredPort)
  },

  // === LOGS ===
  logs: {
    getRecent: (count) => ipcRenderer.invoke('logs:get-recent', count),
    clear: () => ipcRenderer.invoke('logs:clear'),
    export: () => ipcRenderer.invoke('logs:export')
  },

  // === MONITORING ===
  monitoring: {
    getMetrics: () => ipcRenderer.invoke('monitoring:get-metrics'),
    getDetailedStatus: () => ipcRenderer.invoke('monitoring:get-detailed-status')
  },

  // === ERROR HANDLING ===
  errors: {
    getHistory: (limit) => ipcRenderer.invoke('errors:get-history', limit),
    getStatistics: () => ipcRenderer.invoke('errors:get-statistics'),
    clearHistory: () => ipcRenderer.invoke('errors:clear-history')
  },

  // === SECURITY ===
  security: {
    getStats: () => ipcRenderer.invoke('security:get-stats'),
    validateInput: (input, type, options) => ipcRenderer.invoke('security:validate-input', input, type, options)
  },

  // === SYSTEM UTILITIES ===
  utils: {
    openExternal: (url) => ipcRenderer.invoke('utils:open-external', url),
    getNetworkInfo: () => ipcRenderer.invoke('utils:get-network-info')
  },

  // === SYSTEM ===
  system: {
    getVersions: () => ipcRenderer.invoke('system:get-versions')
  },

  // === APPLICATION CONTROL ===
  app: {
    restart: () => ipcRenderer.invoke('app:restart'),
    getVersion: () => ipcRenderer.invoke('app:get-version')
  },

  // === EVENTS FOR UI UPDATES ===
  events: {
    // Listen for error notifications
    onErrorNotification: (callback) => {
      ipcRenderer.on('error-notification', (event, errorInfo) => callback(errorInfo));
    },
    
    // Listen for recovery notifications
    onRecoveryNotification: (callback) => {
      ipcRenderer.on('recovery-notification', (event, notification) => callback(notification));
    },

    // Listen for automatic port changes
    onPortChanged: (callback) => {
      ipcRenderer.on('port-changed', (event, data) => callback(data));
    },

    // Listen for server health warnings
    onServerHealthWarning: (callback) => {
      ipcRenderer.on('server-health-warning', (event, data) => callback(data));
    },

    // Listen for server critical errors
    onServerCriticalError: (callback) => {
      ipcRenderer.on('server-critical-error', (event, data) => callback(data));
    },

    // Listen for autostart success
    onAutostartSuccess: (callback) => {
      ipcRenderer.on('autostart-success', (event, data) => callback(data));
    },

    // Listen for autostart failures
    onAutostartFailed: (callback) => {
      ipcRenderer.on('autostart-failed', (event, data) => callback(data));
    },

    // Remove all event listeners
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('error-notification');
      ipcRenderer.removeAllListeners('recovery-notification');
      ipcRenderer.removeAllListeners('port-changed');
      ipcRenderer.removeAllListeners('server-health-warning');
      ipcRenderer.removeAllListeners('server-critical-error');
      ipcRenderer.removeAllListeners('autostart-success');
      ipcRenderer.removeAllListeners('autostart-failed');
    }
  },

  // === INTERFACE CONTROL ===
  interface: {
    switchToControl: () => ipcRenderer.invoke('interface:switch-to-control'),
    switchToApp: () => ipcRenderer.invoke('interface:switch-to-app'),
    getMode: () => ipcRenderer.invoke('interface:get-mode')
  }
};

// === SECURE EXPOSURE ===
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// === SECURITY LOG ===
console.log('🔒 OxichStudio preload script loaded - APIs exposed:', Object.keys(electronAPI));
