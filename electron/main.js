const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// === MANAGERS IMPORTS ===
const ConfigManager = require('./utils/ConfigManager');
const LogManager = require('./utils/LogManager');
const NetworkManager = require('./utils/NetworkManager');
const ServerMonitor = require('./utils/ServerMonitor');
const ErrorHandler = require('./utils/ErrorHandler');
const SecurityManager = require('./utils/SecurityManager');

// === FETCH POLYFILL FOR NODE.JS ===
let fetch;
(async () => {
  try {
    // Try to use native Node 18+ fetch
    fetch = globalThis.fetch;
    if (!fetch) {
      // Fallback to node-fetch if necessary
      const nodeFetch = await import('node-fetch');
      fetch = nodeFetch.default;
    }
  } catch (error) {
    console.warn('Fetch not available - HTTP verification disabled');
    // Simple fallback
    fetch = () => Promise.reject(new Error('Fetch not available'));
  }
})();

// === GLOBAL VARIABLES ===
let mainWindow = null;
let nextJsProcess = null;
let serverPort = 8080;

// === MANAGERS ===
let configManager = null;
let logManager = null;
let networkManager = null;
let serverMonitor = null;
let errorHandler = null;
let securityManager = null;

// === CONFIGURATION PATHS ===
// ✅ CORRECTION: Automatically detect correct path
const isPackaged = app.isPackaged;
const isDev = !isPackaged;

// Next.js standalone server path
let NEXT_SERVER_PATH;
if (isPackaged) {
  // Packaged mode (production)
  NEXT_SERVER_PATH = path.join(process.resourcesPath, '.next/standalone/server.js');
} else {
  // Development mode - always use local standalone
  NEXT_SERVER_PATH = path.join(__dirname, '../.next/standalone/server.js');
}

// === NEW: INTERFACE MODE ===
const INTERFACE_MODE = process.env.ELECTRON_MODE || 'auto'; // 'control', 'app', 'auto'
const CONTROL_PANEL_PATH = path.join(__dirname, 'control-panel.html');

console.log(`🚀 OxichStudio Electron Mode: ${isPackaged ? 'PACKAGED' : 'DEVELOPMENT'}`);
console.log(`🎮 Interface Mode: ${INTERFACE_MODE}`);
console.log(`📂 Server Path: ${NEXT_SERVER_PATH}`);
console.log(`🎛️ Control Panel: ${CONTROL_PANEL_PATH}`);
console.log(`🔍 Server Exists: ${fs.existsSync(NEXT_SERVER_PATH)}`);

// === MANAGERS INITIALIZATION ===
async function initializeManagers() {
  try {
    // Initialize ConfigManager
    configManager = new ConfigManager();
    await configManager.initialize();
    
    // Initialize LogManager
    logManager = new LogManager();
    await logManager.initialize();
    
    // Initialize NetworkManager
    networkManager = new NetworkManager();
    
    // Initialize SecurityManager (Sprint 3)
    securityManager = new SecurityManager(logManager);
    securityManager.initialize();
    
    // Initialize ErrorHandler (Sprint 3)
    errorHandler = new ErrorHandler(logManager, configManager, networkManager);
    
    // Initialize ServerMonitor (Sprint 3)
    serverMonitor = new ServerMonitor(logManager, networkManager);
    
    // Configuration event listeners for Sprint 3
    setupManagerEventListeners();
    
    // Load server configuration
    serverPort = configManager.get('server.port', 8080);
    
    await logManager.info('OxichStudio Managers initialized - Sprint 3', {
      configPath: configManager.configPath,
      serverPort,
      securityEnabled: true,
      monitoringEnabled: true
    });
    
  } catch (error) {
    console.error('❌ Manager initialization error:', error);
    throw error;
  }
}

// === EVENT LISTENERS FOR SPRINT 3 ===
function setupManagerEventListeners() {
  // ErrorHandler events
  errorHandler.on('error-occurred', (errorInfo) => {
    // Notify user interface
    if (mainWindow) {
      mainWindow.webContents.send('error-notification', errorInfo);
    }
  });

  errorHandler.on('recovery-success', (errorInfo) => {
    if (mainWindow) {
      mainWindow.webContents.send('recovery-notification', {
        type: 'success',
        message: 'Problem resolved automatically',
        errorId: errorInfo.id
      });
    }
  });

  errorHandler.on('port-changed-automatically', ({ oldPort, newPort, reason }) => {
    serverPort = newPort;
    if (mainWindow) {
      mainWindow.webContents.send('port-changed', { oldPort, newPort, reason });
    }
  });

  // ServerMonitor events
  serverMonitor.on('health-check-failed', ({ retryCount, maxRetries }) => {
    if (mainWindow) {
      mainWindow.webContents.send('server-health-warning', { retryCount, maxRetries });
    }
  });

  serverMonitor.on('server-unhealthy', ({ metrics }) => {
    if (mainWindow) {
      mainWindow.webContents.send('server-critical-error', { metrics });
    }
  });

  serverMonitor.on('server-crashed', async ({ code, signal, uptime }) => {
    const autoStart = configManager.get('server.autoStart', true);
    
    // ✅ PREVENT auto-restart if a server is already starting
    if (nextJsProcess !== null) {
      logManager?.info('Auto-restart ignored - Server already active or starting');
      return;
    }
    
    if (autoStart) {
      logManager?.info('Auto-restart enabled - Attempting restart');
      
      // ✅ WAIT longer to ensure port is freed
      setTimeout(async () => {
        // ✅ DOUBLE CHECK that server hasn't already restarted
        if (nextJsProcess !== null) {
          logManager?.info('Auto-restart cancelled - Server already active');
          return;
        }
        
        try {
          await startNextJsServer();
          logManager?.info('Auto-restart successful');
        } catch (error) {
          logManager?.warn('Auto-restart failed', { error: error.message });
        }
      }, 7000); // Increase delay to 7 seconds
    } else {
      logManager?.info('Auto-restart disabled - Server will remain stopped');
    }
  });
}

// === IMPROVED SERVER FUNCTIONS ===
async function startNextJsServer() {
  return new Promise(async (resolve, reject) => {
    try {
      // ✅ RELOAD configuration before startup
      serverPort = configManager.get('server.port', 8080);
      const enableLan = configManager.get('server.enableLan', true); // Get real config
      
      // ✅ HOSTNAME ACCORDING TO LAN CONFIGURATION
      const hostname = enableLan ? '0.0.0.0' : '127.0.0.1';
      
      await logManager.serverEvent('🚀 Starting OxichStudio server', { 
        port: serverPort, 
        hostname,
        enableLan 
      });

      // ✅ VERIFY that Next.js standalone exists
      if (!fs.existsSync(NEXT_SERVER_PATH)) {
        const errorMsg = `Next.js server file not found at: ${NEXT_SERVER_PATH}`;
        console.log(`❌ ${errorMsg}`);
        await logManager.error('Server startup failed - Missing files', { 
          path: NEXT_SERVER_PATH,
          isPackaged,
          isDev 
        });
        
        reject(new Error('OxichStudio application files are missing or corrupted. Please reinstall the application.'));
        return;
      } else {
        console.log(`✅ Next.js server file found at: ${NEXT_SERVER_PATH}`);
        await logManager.info('Next.js server file verified', { path: NEXT_SERVER_PATH });
      }

      // ✅ VERIFY PORT AVAILABILITY
      const portAvailable = await networkManager.isPortAvailable(serverPort);
      if (!portAvailable) {
        await logManager.warn('Port conflict detected', { 
          port: serverPort,
          suggestion: 'Will try alternative ports' 
        });
        
        // Try to find alternative ports
        const alternatives = await networkManager.findAvailablePorts(serverPort, 5);
        if (alternatives.length > 0) {
          const newPort = alternatives[0];
          await logManager.info('Using alternative port', { 
            originalPort: serverPort, 
            newPort: newPort 
          });
          serverPort = newPort;
          configManager.set('server.port', serverPort);
        } else {
          const error = new Error(`Port ${serverPort} is already in use and no alternatives are available.`);
          error.suggestions = ['8081', '8082', '3000', '3001'];
          reject(error);
          return;
        }
      }

      // ✅ ENVIRONMENT VARIABLES
      const env = {
        ...process.env,
        PORT: serverPort.toString(),
        HOSTNAME: hostname,
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1'
      };

      await logManager.info('✅ Server environment prepared', { 
        port: serverPort, 
        hostname,
        nodeVersion: process.version 
      });

      // ✅ SPAWN NEXT.JS SERVER
      nextJsProcess = spawn('node', [NEXT_SERVER_PATH], {
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });

      let serverStartupTimeout;
      let isResolved = false;

      // ✅ STARTUP TIMEOUT (60 seconds - increased from 30)
      serverStartupTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          nextJsProcess?.kill();
          nextJsProcess = null;
          
          const errorMsg = 'Server startup timed out after 60 seconds';
          logManager.error(errorMsg, { port: serverPort });
          reject(new Error('OxichStudio is taking too long to start. This may be due to system performance or antivirus interference.'));
        }
      }, 60000); // Increased to 60 seconds

      // ✅ STDOUT HANDLING
      nextJsProcess.stdout.on('data', async (data) => {
        const output = data.toString();
        
        // Log all output for debugging
        console.log(`🔧 Next.js STDOUT: ${output.trim()}`);
        await logManager.debug('Server output', { output: output.trim() });
        
        if (!isResolved && (output.includes('started server') || output.includes('Local:') || output.includes(`localhost:${serverPort}`))) {
          clearTimeout(serverStartupTimeout);
          isResolved = true;
          
          await logManager.serverEvent('✅ OxichStudio server started successfully', { 
            port: serverPort,
            pid: nextJsProcess.pid,
            uptime: '0s'
          });
          
          // Start monitoring
          serverMonitor.startMonitoring(nextJsProcess.pid, serverPort);
          
          resolve({
            success: true,
            port: serverPort,
            pid: nextJsProcess.pid,
            hostname: hostname,
            enableLan: enableLan
          });
        }
      });

      // ✅ STDERR HANDLING
      nextJsProcess.stderr.on('data', async (data) => {
        const errorOutput = data.toString();
        
        // Log all error output for debugging
        console.log(`🔧 Next.js STDERR: ${errorOutput.trim()}`);
        await logManager.warn('Server warning', { output: errorOutput.trim() });
        
        // Check for specific errors
        if (errorOutput.includes('EADDRINUSE')) {
          if (!isResolved) {
            clearTimeout(serverStartupTimeout);
            isResolved = true;
            nextJsProcess = null;
            
            const error = new Error(`Port ${serverPort} is already being used by another application.`);
            error.suggestions = ['8081', '8082', '3000', '3001'];
            reject(error);
          }
        } else if (errorOutput.includes('EACCES') || errorOutput.includes('permission denied')) {
          if (!isResolved) {
            clearTimeout(serverStartupTimeout);
            isResolved = true;
            nextJsProcess = null;
            
            reject(new Error('Permission denied. Try running OxichStudio as administrator or use a port number above 1024.'));
          }
        }
      });

      // ✅ PROCESS EXIT HANDLING
      nextJsProcess.on('exit', async (code, signal) => {
        serverMonitor.stopMonitoring();
        
        if (!isResolved) {
          clearTimeout(serverStartupTimeout);
          isResolved = true;
          nextJsProcess = null;
          
          let errorMessage = 'Server failed to start';
          let userMessage = 'OxichStudio could not start properly.';
          
          if (code !== null) {
            await logManager.error('Server exited during startup', { exitCode: code, signal });
            
            switch (code) {
              case 1:
                userMessage = 'Server configuration error. Please check your settings and try again.';
                break;
              case 126:
                userMessage = 'Permission denied. Try running OxichStudio as administrator.';
                break;
              case 127:
                userMessage = 'Required files are missing. Please reinstall OxichStudio.';
                break;
              default:
                userMessage = `Server stopped unexpectedly (exit code ${code}). Please try restarting.`;
            }
          } else if (signal) {
            await logManager.error('Server killed during startup', { signal });
            userMessage = 'Server was terminated unexpectedly. This may be due to antivirus software or system security.';
          }
          
          reject(new Error(userMessage));
        } else {
          // Normal exit after server was running
          await logManager.serverEvent('🛑 OxichStudio server stopped', { 
            exitCode: code, 
            signal,
            wasRunning: true 
          });
          
          nextJsProcess = null;
          
          // Notify monitoring
          if (serverMonitor) {
            serverMonitor.handleServerCrash(code, signal);
          }
        }
      });

      // ✅ ERROR HANDLING
      nextJsProcess.on('error', async (error) => {
        if (!isResolved) {
          clearTimeout(serverStartupTimeout);
          isResolved = true;
          nextJsProcess = null;
          
          await logManager.error('Server process error', { 
            error: error.message,
            code: error.code 
          });
          
          let userMessage = 'Failed to start OxichStudio server.';
          
          if (error.code === 'ENOENT') {
            userMessage = 'Server files are missing. Please reinstall OxichStudio.';
          } else if (error.code === 'EACCES') {
            userMessage = 'Permission denied. Try running OxichStudio as administrator.';
          } else if (error.code === 'EMFILE' || error.code === 'ENFILE') {
            userMessage = 'Too many files open. Please close other applications and try again.';
          }
          
          reject(new Error(userMessage));
        }
      });

    } catch (error) {
      await logManager.error('Unexpected startup error', { 
        error: error.message,
        stack: error.stack 
      });
      
      reject(new Error('An unexpected error occurred while starting OxichStudio. Please try again or restart the application.'));
    }
  });
}

async function stopNextJsServer() {
  let processKilled = false;
  
  // 1. Stop the process tracked by Electron if it exists
  if (nextJsProcess) {
    await logManager.serverEvent('Server stop requested', { pid: nextJsProcess.pid });
    
    // Stop monitoring
    serverMonitor.stopMonitoring();
    
    try {
    nextJsProcess.kill('SIGTERM');
      processKilled = true;
      await logManager.info('Electron process killed', { pid: nextJsProcess.pid });
    } catch (error) {
      await logManager.warn('Failed to stop Electron process', { error: error.message });
    }
    
    nextJsProcess = null;
  }
  
  // 2. Check if there's still a server on the port (external process)
  try {
    const response = await fetch(`http://127.0.0.1:${serverPort}`, { 
      method: 'HEAD',
      timeout: 2000 
    });
    
    if (response.ok || response.status < 500) {
      // Server still responds - it's an external process
      await logManager.warn('External server detected on port', { port: serverPort });
      
      // Try to kill process by port (Windows/PowerShell)
      if (process.platform === 'win32') {
        try {
          const { spawn } = require('child_process');
          
          // Find PID of process using the port
          const netstatProcess = spawn('netstat', ['-ano'], { shell: true });
          let netstatOutput = '';
          
          netstatProcess.stdout.on('data', (data) => {
            netstatOutput += data.toString();
          });
          
          netstatProcess.on('close', async () => {
            const lines = netstatOutput.split('\n');
            const portLine = lines.find(line => 
              line.includes(`:${serverPort} `) && 
              line.includes('LISTENING')
            );
            
            if (portLine) {
              const parts = portLine.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              
              if (pid && pid !== '0') {
                // Kill process by PID
                const killProcess = spawn('taskkill', ['/F', '/PID', pid], { shell: true });
                
                killProcess.on('close', async (code) => {
                  if (code === 0) {
                    await logManager.info('External process killed', { pid, port: serverPort });
                    processKilled = true;
                  } else {
                    await logManager.warn('Failed to stop external process', { pid, port: serverPort });
                  }
                });
              }
            }
          });
          
        } catch (error) {
          await logManager.warn('Error stopping external process', { error: error.message });
        }
      }
    }
  } catch (error) {
    // Server doesn't respond - it's probably stopped
    processKilled = true;
  }
  
  // 3. Wait a bit then check shutdown
  setTimeout(async () => {
    const finalStatus = await getServerStatus();
    if (finalStatus.running) {
      await logManager.warn('Server still appears to be running', { 
        status: finalStatus.status 
      });
    } else {
      await logManager.serverEvent('OxichStudio server stopped successfully');
    }
  }, 3000);
  
  if (processKilled) {
    await logManager.serverEvent('Server shutdown initiated');
  }
}

// === MAIN WINDOW WITH ENHANCED SECURITY ===
function createMainWindow() {
  const windowOptions = {
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    minWidth: 800,
    minHeight: 600,
  };

  // === INTERFACE MODE ADAPTATION ===
  if (INTERFACE_MODE === 'control') {
    // Control mode only
    windowOptions.width = 900;
    windowOptions.height = 700;
    windowOptions.title = 'OxichStudio - Desktop Controller';
  } else if (INTERFACE_MODE === 'app') {
    // Application mode only
    windowOptions.title = 'OxichStudio Business Application';
    windowOptions.width = 1400;
    windowOptions.height = 900;
  } else {
    // Auto mode - adaptive
    windowOptions.title = 'OxichStudio - Desktop Controller';
  }

  mainWindow = new BrowserWindow(windowOptions);

  // === LOAD INTERFACE ACCORDING TO MODE ===
  loadInterfaceBasedOnMode();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// === NEW FUNCTION: INTERFACE LOADING ===
async function loadInterfaceBasedOnMode() {
  try {
    switch (INTERFACE_MODE) {
      case 'control':
        // Control mode - Native Electron interface only
        console.log('📋 Loading OxichStudio control interface');
        mainWindow.loadFile(CONTROL_PANEL_PATH);
        break;

      case 'app':
        // Application mode - Next.js only (server must be started)
        console.log('🌐 Loading OxichStudio Next.js application');
        await loadNextJsApp();
        break;

      case 'auto':
      default:
        // Auto mode - Determine automatically
        console.log('🤖 Auto mode - Determining interface');
        await loadAutoInterface();
        break;
    }
  } catch (error) {
    console.error('❌ Interface loading error:', error);
    await errorHandler.handleError(error, { context: 'interface-loading' });
    // Fallback to control interface
    mainWindow.loadFile(CONTROL_PANEL_PATH);
  }
}

// === LOAD NEXT.JS APPLICATION ===
async function loadNextJsApp() {
  const serverStatus = await getServerStatus();
  
  if (serverStatus.running) {
    const url = `http://${serverStatus.hostname}:${serverStatus.port}`;
    console.log(`🌐 Loading OxichStudio application: ${url}`);
    mainWindow.loadURL(url);
  } else {
    console.log('⚠️ Server not started - Loading control interface');
    mainWindow.loadFile(CONTROL_PANEL_PATH);
  }
}

// === AUTO LOADING ===
async function loadAutoInterface() {
  // ✅ ALWAYS load control interface - Autostart is handled in app.whenReady()
  console.log('🎛️ Loading OxichStudio control interface');
  mainWindow.loadFile(CONTROL_PANEL_PATH);
  
  // Note: Autostart logic has been moved to app.whenReady() for better centralization
}

// === HELPER FUNCTION: GET SERVER STATUS ===
async function getServerStatus() {
  // First check if process exists
  const processRunning = nextJsProcess !== null && !nextJsProcess.killed;
  
  // If process seems stopped, check via HTTP if server responds anyway
  if (!processRunning) {
    try {
      const response = await fetch(`http://127.0.0.1:${serverPort}`, { 
        method: 'HEAD',
        timeout: 2000 
      });
      // If we get a response, server works even without tracked process
      if (response.ok || response.status < 500) {
        return {
          running: true,
          port: serverPort,
          hostname: '127.0.0.1',
          pid: 'external', // External or untracked server
          status: 'running-external'
        };
      }
    } catch (error) {
      // Ignore - server doesn't respond
    }
  }

  return {
    running: processRunning,
    port: serverPort,
    hostname: '127.0.0.1',
    pid: nextJsProcess?.pid || null,
    status: processRunning ? 'running' : 'stopped'
  };
}

// === NEW IPC HANDLER: SWITCH INTERFACE MODE ===
function setupInterfaceHandlers() {
  // Switch to control interface (always available)
  ipcMain.handle('interface:switch-to-control', () => {
    mainWindow.loadFile(CONTROL_PANEL_PATH);
    return { success: true };
  });

  // Disable switch to application - control mode only
  ipcMain.handle('interface:switch-to-app', async () => {
    // Don't switch - stay on control interface
    console.log('🎛️ Switch to app disabled - Control mode only');
    return { 
      success: false, 
      error: 'Application configured in control mode only. Use browser to access the application.' 
    };
  });

  // Get current interface mode (always 'control')
  ipcMain.handle('interface:get-mode', () => {
    return { mode: 'control' };
  });
}

// === IPC HANDLERS WITH SECURE VALIDATION ===
function setupIpcHandlers() {
  // === SERVER ===
  ipcMain.handle('server:get-status', async () => {
    const enableLan = configManager?.get('server.enableLan', true);
    const networkInfo = networkManager?.getNetworkInfo(serverPort, enableLan);
    
    // Add monitoring metrics
    const monitoringMetrics = serverMonitor?.getPerformanceMetrics() || {};
    
    // Get server status with HTTP verification
    const serverStatus = await getServerStatus();
    
    return {
      running: serverStatus.running,
      port: serverPort,
      pid: serverStatus.pid,
      status: serverStatus.status,
      networkInfo,
      monitoring: monitoringMetrics,
      enableLan: enableLan
    };
  });

  ipcMain.handle('server:start', async (event, config = null) => {
    try {
      await logManager.userAction('🚀 User requested server start', { config });
      
      // If config parameters are provided, use them
      if (config && config.port) {
        const port = parseInt(config.port);
        if (isNaN(port) || port < 1000 || port > 65535) {
          throw new Error('Invalid port number. Please use a port between 1000 and 65535.');
        }
        serverPort = port;
        await configManager.set('server.port', serverPort);
      }
      
      // Handle LAN access with save
      if (config && config.enableLan !== undefined) {
        await configManager.set('server.enableLan', config.enableLan);
      }
      
      const result = await startNextJsServer();
      await logManager.userAction('✅ Server started successfully by user', { 
        port: serverPort,
        pid: result.pid 
      });
      
      return { 
        success: true,
        port: result.port,
        pid: result.pid,
        hostname: result.hostname,
        enableLan: result.enableLan
      };
    } catch (error) {
      await logManager.userAction('❌ Server start failed', { 
        error: error.message,
        config 
      });
      
      return { 
        success: false, 
        error: error.message,
        code: error.code,
        suggestions: error.suggestions 
      };
    }
  });

  ipcMain.handle('server:stop', async () => {
    try {
      await logManager.userAction('🛑 User requested server stop');
      await stopNextJsServer();
      await logManager.userAction('✅ Server stopped successfully by user');
      return { success: true };
    } catch (error) {
      await logManager.userAction('❌ Server stop failed', { error: error.message });
      return { 
        success: false, 
        error: 'Failed to stop the server. It may have already stopped or encountered an error.'
      };
    }
  });

  // === CONFIGURATION WITH VALIDATION ===
  ipcMain.handle('config:get', (event, keyPath, defaultValue) => {
    try {
      return configManager?.get(keyPath, defaultValue) || defaultValue;
    } catch (error) {
      logManager?.warn('Configuration read error', { keyPath, error: error.message });
      return defaultValue;
    }
  });

  ipcMain.handle('config:set', async (event, keyPath, value) => {
    try {
      // Validate common configuration keys
      if (keyPath === 'server.port') {
        const port = parseInt(value);
        if (isNaN(port) || port < 1000 || port > 65535) {
          throw new Error('Port must be a number between 1000 and 65535');
        }
      } else if (keyPath === 'server.enableLan') {
        if (typeof value !== 'boolean') {
          throw new Error('Network access setting must be true or false');
        }
      }
      
      await configManager.set(keyPath, value);
      await logManager.userAction('⚙️ Configuration updated', { keyPath, value });
      return { success: true };
    } catch (error) {
      await logManager.warn('Configuration update failed', { 
        keyPath, 
        value, 
        error: error.message 
      });
      return { 
        success: false, 
        error: error.message || 'Failed to update configuration'
      };
    }
  });

  // === NEW HANDLERS SPRINT 3 ===
  
  // Server monitoring
  ipcMain.handle('monitoring:get-metrics', () => {
    return serverMonitor?.getPerformanceMetrics() || null;
  });

  ipcMain.handle('monitoring:get-detailed-status', () => {
    return serverMonitor?.getDetailedStatus() || null;
  });

  // Error handling
  ipcMain.handle('errors:get-history', (event, limit) => {
    return errorHandler?.getErrorHistory(limit) || [];
  });

  ipcMain.handle('errors:get-statistics', () => {
    return errorHandler?.getErrorStatistics() || {};
  });

  ipcMain.handle('errors:clear-history', async () => {
    try {
      errorHandler?.clearErrorHistory();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Security
  ipcMain.handle('security:get-stats', () => {
    return securityManager?.getSecurityStats() || {};
  });

  ipcMain.handle('security:validate-input', (event, input, type, options) => {
    return securityManager?.validateInput(input, type, options) || { valid: false, error: 'SecurityManager not available' };
  });

  // === EXISTING HANDLERS (unchanged) ===
  ipcMain.handle('config:update-multiple', async (event, updates) => {
    try {
      await configManager.updateMultiple(updates);
      await logManager.userAction('Configuration updated', updates);
      return { success: true };
    } catch (error) {
      await errorHandler.handleError(error, { context: 'config-update-multiple', updates });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('config:reset', async () => {
    try {
      await configManager.resetToDefault();
      await logManager.userAction('Configuration reset');
      return { success: true };
    } catch (error) {
      await errorHandler.handleError(error, { context: 'config-reset' });
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('config:export', () => {
    return configManager?.exportConfig() || null;
  });

  ipcMain.handle('config:import', async (event, configString) => {
    try {
      await configManager.importConfig(configString);
      await logManager.userAction('Configuration imported');
      return { success: true };
    } catch (error) {
      await errorHandler.handleError(error, { context: 'config-import' });
      return { success: false, error: error.message };
    }
  });

  // === NETWORK ===
  ipcMain.handle('network:get-info', (event, port, enableLan) => {
    return networkManager?.getNetworkInfo(port || serverPort, enableLan) || null;
  });

  ipcMain.handle('network:get-debug-info', () => {
    return networkManager?.getNetworkDebugInfo() || null;
  });

  ipcMain.handle('network:check-port', async (event, port) => {
    const isAvailable = await networkManager.isPortAvailable(port);
    return { available: isAvailable };
  });

  ipcMain.handle('network:suggest-ports', async (event, currentPort, count) => {
    const suggestions = await networkManager.suggestAlternativePorts(currentPort, count);
    return { suggestions };
  });

  ipcMain.handle('network:find-preferred-port', async (event, configuredPort) => {
    const port = await networkManager.findPreferredPort(configuredPort);
    return { port };
  });

  // === LOGS ===
  ipcMain.handle('logs:get-recent', async (event, count = 50) => {
    try {
      const logs = await logManager?.getRecentLogs(count) || [];
      return { success: true, logs };
    } catch (error) {
      return { 
        success: false, 
        error: 'Unable to retrieve application logs',
        logs: [] 
      };
    }
  });

  ipcMain.handle('logs:export', async () => {
    const exported = await logManager.exportLogs();
    return { logs: exported };
  });

  ipcMain.handle('logs:clear', async () => {
    try {
      await logManager?.clearLogs();
      await logManager.userAction('🗑️ User cleared application logs');
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: 'Unable to clear logs. You may need to restart the application.'
      };
    }
  });

  // === SYSTEM ===
  ipcMain.handle('system:get-versions', () => {
    return {
      electron: process.versions.electron,
      node: process.versions.node,
      chrome: process.versions.chrome,
      platform: process.platform
    };
  });

  // === SHELL WITH SECURE VALIDATION ===
  ipcMain.handle('shell:open-external', async (event, url) => {
    try {
      // Secure URL validation
      const isValid = securityManager?.validateURL(url);
      if (!isValid) {
        throw new Error('Unauthorized URL');
      }
      
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      await errorHandler.handleError(error, { context: 'shell-open-external', url });
      return { success: false, error: error.message };
    }
  });

  // === SYSTEM UTILITIES ===
  ipcMain.handle('utils:open-external', async (event, url) => {
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided');
      }
      
      // Basic URL validation
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }
      
      await shell.openExternal(url);
      await logManager.userAction('🌐 User opened external URL', { url });
      return { success: true };
    } catch (error) {
      await logManager.warn('Failed to open external URL', { 
        url, 
        error: error.message 
      });
      return { 
        success: false, 
        error: 'Unable to open the URL. Please copy and paste it into your browser manually.'
      };
    }
  });

  ipcMain.handle('utils:get-network-info', () => {
    try {
      const enableLan = configManager?.get('server.enableLan', true);
      const networkInfo = networkManager?.getNetworkInfo(serverPort, enableLan);
      return { success: true, networkInfo };
    } catch (error) {
      logManager?.warn('Network info error', { error: error.message });
      return { 
        success: false, 
        error: 'Unable to retrieve network information',
        networkInfo: null 
      };
    }
  });

  // === APPLICATION CONTROL ===
  ipcMain.handle('app:restart', async () => {
    try {
      await logManager.userAction('🔄 User requested application restart');
      
      // Stop server first
      if (nextJsProcess) {
        await stopNextJsServer();
      }
      
      // Restart application
      app.relaunch();
      app.exit(0);
      
      return { success: true };
    } catch (error) {
      await logManager.error('Application restart failed', { error: error.message });
      return { 
        success: false, 
        error: 'Unable to restart automatically. Please close and reopen OxichStudio manually.'
      };
    }
  });

  ipcMain.handle('app:get-version', () => {
    try {
      return {
        success: true,
        version: app.getVersion(),
        name: app.getName(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node
      };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to get application version information'
      };
    }
  });
}

// === APP EVENTS WITH IMPROVED ERROR HANDLING ===
app.whenReady().then(async () => {
  try {
    // Initialize managers
    await initializeManagers();
    
    createMainWindow();
    setupIpcHandlers();
    setupInterfaceHandlers();

    // ✅ ALWAYS show control panel first
    console.log('🎛️ Loading OxichStudio control interface');
    mainWindow.loadFile(CONTROL_PANEL_PATH);

    // ✅ Auto-start server if configured - CENTRALIZED LOGIC
    const autoStart = configManager.get('server.autoStart', false);
    console.log(`🔧 AutoStart configuration: ${autoStart}`);
    
    if (autoStart) {
      console.log('🚀 Auto-start enabled - Starting server in background');
      
      // Wait for interface to load then start
      setTimeout(async () => {
        try {
          console.log('⏳ Attempting automatic startup...');
          await startNextJsServer();
          console.log('✅ Server started successfully - Interface maintained');
          
          // Notify interface of success
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('autostart-success', {
              port: serverPort,
              message: 'Server started automatically'
            });
          }
          
        } catch (error) {
          console.log('❌ Auto-start failed:', error.message);
          
          // Notify interface of failure
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('autostart-failed', {
              error: error.message,
              suggestions: error.suggestions || []
            });
          }
          
          await logManager.warn('Auto-start failed at startup', { 
            error: error.message,
            autoStart: true 
          });
        }
      }, 2000); // Increase delay to ensure interface is ready
      
    } else {
      console.log('⏸️ Auto-start disabled - Server awaiting commands');
    }
    
  } catch (error) {
    console.error('❌ OxichStudio app initialization error:', error);
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, 'error.html'));
    }
  }
});

app.on('window-all-closed', async () => {
  await stopNextJsServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await logManager?.info('OxichStudio application closed by user');
  await stopNextJsServer();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// === GLOBAL ERROR HANDLING SPRINT 3 ===
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await errorHandler?.handleError(error, { context: 'uncaught-exception' }, false);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  const error = reason instanceof Error ? reason : new Error(String(reason));
  await errorHandler?.handleError(error, { context: 'unhandled-rejection' }, false);
});
