const { EventEmitter } = require('events');

class ErrorHandler extends EventEmitter {
  constructor(logManager, configManager, networkManager) {
    super();
    this.logManager = logManager;
    this.configManager = configManager;
    this.networkManager = networkManager;
    this.errorHistory = [];
    this.maxHistorySize = 100;
    this.recoveryAttempts = new Map();
  }

  /**
   * Handles an error with recovery strategies
   */
  async handleError(error, context = {}, shouldRecover = true) {
    try {
      const errorInfo = this.analyzeError(error, context);
      
      await this.logManager?.error('Error captured', {
        type: errorInfo.type,
        severity: errorInfo.severity,
        context: context,
        recoverable: errorInfo.recoverable
      }, error);

      this.addToHistory(errorInfo);
      this.emit('error-occurred', errorInfo);

      if (shouldRecover && errorInfo.recoverable) {
        await this.attemptRecovery(errorInfo);
      }

      return errorInfo;

    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
    }
  }

  /**
   * Analyzes and categorizes an error
   */
  analyzeError(error, context = {}) {
    const errorInfo = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      code: error.code,
      type: this.categorizeError(error),
      severity: this.determineSeverity(error),
      context: context,
      recoverable: this.isRecoverable(error),
      userMessage: this.generateUserMessage(error),
      suggestedActions: this.getSuggestedActions(error)
    };

    return errorInfo;
  }

  /**
   * Categorizes error type
   */
  categorizeError(error) {
    const code = error.code;
    const message = error.message?.toLowerCase() || '';

    // Network errors
    if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(code)) {
      return 'network';
    }

    // System errors
    if (['ENOENT', 'EACCES', 'EPERM', 'EMFILE'].includes(code)) {
      return 'system';
    }

    // Process errors
    if (code === 'EADDRINUSE' || message.includes('port') || message.includes('address')) {
      return 'port';
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return 'validation';
    }

    // Configuration errors
    if (message.includes('config') || message.includes('setting')) {
      return 'configuration';
    }

    // Server errors
    if (message.includes('server') || message.includes('http')) {
      return 'server';
    }

    return 'generic';
  }

  /**
   * Determines error severity
   */
  determineSeverity(error) {
    const type = this.categorizeError(error);
    
    // Critical: errors that prevent application from functioning
    if (['system', 'configuration'].includes(type)) {
      return 'critical';
    }

    // High: errors that affect main functionalities
    if (['server', 'port'].includes(type)) {
      return 'high';
    }

    // Medium: errors that affect user experience
    if (['network', 'validation'].includes(type)) {
      return 'medium';
    }

    // Low: minor or recoverable errors
    return 'low';
  }

  /**
   * Generates user-friendly error message
   */
  generateUserMessage(error) {
    const code = error.code;
    const message = error.message?.toLowerCase() || '';

    switch (code) {
      case 'ECONNREFUSED':
        return 'Unable to connect to server. Check that the server is started.';
      case 'ENOTFOUND':
        return 'Network address not found. Check your internet connection.';
      case 'ETIMEDOUT':
        return 'Network problem detected. Check your connection.';
      case 'EADDRINUSE':
        return `Port ${this.extractPortFromMessage(error.message)} is already in use by another application.`;
      case 'ENOENT':
        return 'Required file not found. The application may need to be reinstalled.';
      case 'EACCES':
      case 'EPERM':
        return 'Permission denied. Try running the application as administrator.';
      case 'EMFILE':
        return 'System problem detected. Restart the application.';
    }

    if (message.includes('server') || message.includes('http')) {
      return 'The web server encountered a problem. Attempting automatic restart...';
    }
    if (message.includes('config')) {
      return 'Configuration problem detected. Configuration will be reset.';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'Invalid data detected. Check your settings.';
    }

    return 'An unexpected error occurred. The technical team has been notified.';
  }

  /**
   * Determines if error is recoverable
   */
  isRecoverable(error) {
    const code = error.code;
    const type = this.categorizeError(error);

    // Network errors are generally recoverable
    if (type === 'network') return true;

    // System errors generally not recoverable
    if (['ENOENT', 'EACCES', 'EPERM'].includes(code)) return false;

    // Specific non-recoverable errors
    if (error.message?.includes('FATAL') || error.message?.includes('CRITICAL')) {
      return false;
    }

    // Port errors are recoverable (can try other port)
    if (type === 'port') return true;

    return true;
  }

  /**
   * Provides suggested actions to resolve error
   */
  getSuggestedActions(error) {
    const type = this.categorizeError(error);
    const code = error.code;

    switch (type) {
      case 'port':
        return [
          'Stop the application using this port',
          'Use a different port number',
          'Restart the computer'
        ];

      case 'network':
        return [
          'Check internet connection',
          'Restart the server',
          'Contact network administrator'
        ];

      case 'system':
        return [
          'Restart the application',
          'Run as administrator',
          'Check available disk space'
        ];

      case 'server':
        return [
          'Restart the server',
          'Check detailed logs',
          'Change server port'
        ];

      case 'configuration':
        return [
          'Reset configuration to default',
          'Check configuration file',
          'Restore from backup'
        ];

      case 'validation':
        return [
          'Check entered data',
          'Reset to default values',
          'Restart the application',
          'Contact support'
        ];

      default:
        return [
          'Restart the application',
          'Check application logs',
          'Contact technical support'
        ];
    }
  }

  /**
   * Attempts error recovery
   */
  async attemptRecovery(errorInfo) {
    const { id, type } = errorInfo;

    // Check number of previous attempts
    const attempts = this.recoveryAttempts.get(type) || 0;
    if (attempts >= 3) {
      await this.logManager?.warn('Maximum recovery attempts reached', { type, attempts });
      return false;
    }

    this.recoveryAttempts.set(type, attempts + 1);

    try {
      let success = false;

      switch (type) {
        case 'network':
          success = await this.recoverFromNetworkError(errorInfo);
          break;
        case 'port':
          success = await this.recoverFromPortError(errorInfo);
          break;
        case 'configuration':
          success = await this.recoverFromConfigError(errorInfo);
          break;
        case 'server':
          success = await this.recoverFromServerError(errorInfo);
          break;
        default:
          success = await this.genericRecovery(errorInfo);
      }

      if (success) {
        this.recoveryAttempts.delete(type);
        this.emit('recovery-success', errorInfo);
        await this.logManager?.info('Error recovery successful', { errorId: id, type });
      }

      return success;

    } catch (recoveryError) {
      await this.logManager?.error('Error during recovery', { errorId: id }, recoveryError);
      return false;
    }
  }

  /**
   * Network error recovery
   */
  async recoverFromNetworkError(errorInfo) {
    // Test network connectivity
    if (this.networkManager) {
      const isConnected = await this.networkManager.testNetworkConnectivity();
      if (isConnected) {
        await this.logManager?.info('Network connectivity restored');
        return true;
      }
    }

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 5000));
    return false;
  }

  /**
   * Port error recovery
   */
  async recoverFromPortError(errorInfo) {
    if (this.networkManager && this.configManager) {
      // Find alternative port
      const currentPort = this.configManager.get('server.port', 8080);
      const suggestions = await this.networkManager.suggestAlternativePorts(currentPort, 1);
      
      if (suggestions.length > 0) {
        const newPort = suggestions[0];
        await this.configManager.set('server.port', newPort);
        
        this.emit('port-changed-automatically', { 
          oldPort: currentPort, 
          newPort: newPort,
          reason: 'Port conflict resolution'
        });
        
        return true;
      }
    }
    return false;
  }

  /**
   * Configuration error recovery
   */
  async recoverFromConfigError(errorInfo) {
    if (this.configManager) {
      try {
        await this.configManager.resetToDefault();
        await this.logManager?.info('Configuration reset for error recovery');
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  /**
   * Server error recovery
   */
  async recoverFromServerError(errorInfo) {
    // For now, signal that server recovery is needed
    this.emit('server-recovery-needed', errorInfo);
    return false;
  }

  /**
   * Generic recovery
   */
  async genericRecovery(errorInfo) {
    // No automatic recovery for generic errors
    return false;
  }

  /**
   * Adds error to history
   */
  addToHistory(errorInfo) {
    this.errorHistory.unshift(errorInfo);
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Gets error history
   */
  getErrorHistory(limit = 50) {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Gets error statistics
   */
  getErrorStatistics() {
    const stats = {
      total: this.errorHistory.length,
      byType: {},
      bySeverity: {},
      byTime: {
        lastHour: 0,
        lastDay: 0,
        lastWeek: 0
      }
    };

    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    const week = 7 * day;

    this.errorHistory.forEach(error => {
      // By type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // By severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // By time
      const errorTime = error.timestamp.getTime();
      if (now - errorTime < hour) stats.byTime.lastHour++;
      if (now - errorTime < day) stats.byTime.lastDay++;
      if (now - errorTime < week) stats.byTime.lastWeek++;
    });

    return stats;
  }

  /**
   * Clears error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
    this.logManager?.info('Error history cleared');
  }

  /**
   * Extracts port number from error message
   */
  extractPortFromMessage(message) {
    const match = message?.match(/(?:port|:)\s*(\d+)/i);
    return match ? match[1] : 'unknown';
  }
}

module.exports = ErrorHandler; 