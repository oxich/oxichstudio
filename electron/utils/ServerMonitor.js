const http = require('http');
const { EventEmitter } = require('events');

class ServerMonitor extends EventEmitter {
  constructor(logManager, networkManager) {
    super();
    this.logManager = logManager;
    this.networkManager = networkManager;
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.healthCheckInterval = 5000; // 5 seconds
    this.defaultHealthCheckInterval = 5000; // ✅ ADDED: Save default value
    this.maxRetries = 3;
    this.retryCount = 0;
    this.serverProcess = null;
    this.serverPort = null;
    this.serverHostname = null;
    this.startTime = null;
    this.lastHealthCheck = null;
    this.performanceMetrics = {
      uptime: 0,
      responseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      requestCount: 0,
      errorCount: 0
    };
  }

  /**
   * Starts server monitoring
   */
  startMonitoring(serverProcess, port, hostname = 'localhost') {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }

    this.serverProcess = serverProcess;
    this.serverPort = port;
    this.serverHostname = hostname;
    this.startTime = Date.now();
    this.isMonitoring = true;
    this.retryCount = 0;

    this.logManager?.info('Server monitoring started', {
      port,
      hostname,
      pid: serverProcess?.pid
    });

    // ✅ INITIAL DELAY to let the server start completely
    setTimeout(() => {
      if (this.isMonitoring) {
        // ✅ OPTIMIZATION: Start with longer interval then normalize
        this.healthCheckInterval = 10000; // Start with 10 seconds
        
        // Start periodic checks after delay
        this.monitorInterval = setInterval(() => {
          this.performHealthCheck();
        }, this.healthCheckInterval);
        
        this.logManager?.info('Health checks started with initial interval', { 
          port, 
          hostname,
          initialInterval: this.healthCheckInterval 
        });
      }
    }, 8000); // 8 seconds initial delay

    // Process monitoring
    if (serverProcess) {
      serverProcess.on('exit', (code, signal) => {
        this.handleServerExit(code, signal);
      });

      serverProcess.on('error', (error) => {
        this.handleServerError(error);
      });
    }

    this.emit('monitoring-started', { port, hostname });
  }

  /**
   * Stops monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // ✅ CORRECTION: ASCII message to avoid encoding issues
    this.logManager?.info('Server monitoring stopped');
    this.emit('monitoring-stopped');
  }

  /**
   * Checks server health status
   */
  async performHealthCheck() {
    if (!this.isMonitoring || !this.serverPort) return;

    const startTime = Date.now();

    try {
      const isHealthy = await this.checkServerHealth();
      const responseTime = Date.now() - startTime;

      this.lastHealthCheck = Date.now();
      this.performanceMetrics.responseTime = responseTime;
      this.performanceMetrics.uptime = Date.now() - this.startTime;

      if (isHealthy) {
        this.retryCount = 0;
        this.performanceMetrics.requestCount++;
        
        // ✅ RESET: Restore normal interval if server became healthy again
        if (this.healthCheckInterval > this.defaultHealthCheckInterval) {
          this.healthCheckInterval = this.defaultHealthCheckInterval; // Return to default interval
          
          // Restart interval with normal frequency
          if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = setInterval(() => {
              this.performHealthCheck();
            }, this.healthCheckInterval);
            
            this.logManager?.info('Health check interval normalized', {
              interval: this.healthCheckInterval,
              port: this.serverPort
            });
          }
        }
        
        // Process metrics if available
        if (this.serverProcess && this.serverProcess.pid) {
          try {
            const usage = process.memoryUsage();
            this.performanceMetrics.memoryUsage = usage.rss;
          } catch (error) {
            // Ignore metrics errors
          }
        }

        this.emit('health-check-success', {
          responseTime,
          metrics: this.performanceMetrics
        });

      } else {
        this.handleHealthCheckFailure();
      }

    } catch (error) {
      this.handleHealthCheckFailure(error);
    }
  }

  /**
   * Tests server connectivity
   */
  async checkServerHealth() {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: this.serverPort,
        path: '/',
        method: 'GET',
        timeout: 4000
      };

      const req = http.request(options, (res) => {
        resolve(res.statusCode > 0);
      });

      req.on('error', (error) => {
        this.logManager?.debug('Health check connection refused', {
          port: this.serverPort,
          error: error.code || error.message
        });
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        this.logManager?.debug('Health check timeout', { port: this.serverPort });
        resolve(false);
      });

      req.setTimeout(4000);
      req.end();
    });
  }

  /**
   * Handles health check failures
   */
  async handleHealthCheckFailure(error = null) {
    this.retryCount++;
    this.performanceMetrics.errorCount++;

    // ✅ CORRECTION: ASCII messages to avoid encoding issues
    await this.logManager?.warn('Health check failed', {
      port: this.serverPort,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      error: error?.message || 'Connection refused'
    });

    this.emit('health-check-failed', {
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      error: error?.message
    });

    // If too many consecutive failures, report critical issue
    if (this.retryCount >= this.maxRetries) {
      await this.logManager?.error('Server considered unhealthy', {
        port: this.serverPort,
        retryCount: this.retryCount
      });

      this.emit('server-unhealthy', {
        retryCount: this.retryCount,
        metrics: this.performanceMetrics
      });

      // ✅ IMPROVEMENT: Increase interval after failures to reduce spam
      this.healthCheckInterval = Math.min(this.healthCheckInterval * 1.5, 30000); // Max 30 seconds
      
      // Restart interval with new frequency
      if (this.monitorInterval) {
        clearInterval(this.monitorInterval);
        this.monitorInterval = setInterval(() => {
          this.performHealthCheck();
        }, this.healthCheckInterval);
      }

      // Reset to avoid spam
      this.retryCount = 0;
    }
  }

  /**
   * Handles unexpected server process exit
   */
  async handleServerExit(code, signal) {
    // ✅ CORRECTION: ASCII message to avoid encoding issues
    await this.logManager?.error('Server terminated unexpectedly', {
      code,
      signal,
      pid: this.serverProcess?.pid,
      uptime: this.performanceMetrics.uptime
    });

    this.emit('server-crashed', {
      code,
      signal,
      uptime: this.performanceMetrics.uptime
    });

    this.stopMonitoring();
  }

  /**
   * Handles server process errors
   */
  async handleServerError(error) {
    await this.logManager?.error('Server process error', null, error);
    
    this.emit('server-error', {
      error: error.message,
      code: error.code
    });
  }

  /**
   * Gets current performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      isHealthy: this.retryCount === 0,
      lastHealthCheck: this.lastHealthCheck,
      monitoringStarted: this.startTime,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Gets detailed server status
   */
  getDetailedStatus() {
    return {
      isMonitoring: this.isMonitoring,
      serverPort: this.serverPort,
      serverHostname: this.serverHostname,
      serverPid: this.serverProcess?.pid || null,
      metrics: this.getPerformanceMetrics(),
      healthCheckInterval: this.healthCheckInterval,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Updates health check interval
   */
  setHealthCheckInterval(interval) {
    if (interval < 1000) interval = 1000; // Minimum 1 second
    if (interval > 60000) interval = 60000; // Maximum 1 minute

    this.healthCheckInterval = interval;

    if (this.isMonitoring) {
      // Restart with new interval
      this.stopMonitoring();
      setTimeout(() => {
        this.startMonitoring(this.serverProcess, this.serverPort, this.serverHostname);
      }, 100);
    }

    this.logManager?.info('Health check interval modified', { interval });
  }

  /**
   * Resets performance counters
   */
  resetMetrics() {
    this.performanceMetrics = {
      uptime: 0,
      responseTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      requestCount: 0,
      errorCount: 0
    };
    this.retryCount = 0;
    this.startTime = Date.now();

    this.logManager?.info('Performance metrics reset');
    this.emit('metrics-reset');
  }
}

module.exports = ServerMonitor; 