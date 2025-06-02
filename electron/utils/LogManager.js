const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class LogManager {
  constructor() {
    this.logsDir = path.join(app.getPath('userData'), 'logs');
    this.currentLogFile = path.join(this.logsDir, 'app.log');
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.maxLogFiles = 5;
    this.logLevel = 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.logHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Initialise le système de logs
   */
  async initialize() {
    try {
      // Create logs directory
      await fs.mkdir(this.logsDir, { recursive: true });
      
      // Check rotation on startup
      await this.checkRotation();
      
      // Startup log
      await this.info('LogManager initialized', {
        logsDir: this.logsDir,
        logLevel: this.logLevel,
        maxFileSize: this.maxFileSize
      });
      
    } catch (error) {
      console.error('❌ LogManager initialization error:', error);
      throw error;
    }
  }

  /**
   * Sets log level
   */
  setLogLevel(level) {
    if (this.logLevels.hasOwnProperty(level)) {
      this.logLevel = level;
      this.info('Log level changed', { level });
    }
  }

  /**
   * Gets current log level
   */
  getLogLevel() {
    return this.logLevel;
  }

  /**
   * ERROR level log
   */
  async error(message, metadata = null, error = null) {
    return this.log('error', message, metadata, error);
  }

  /**
   * WARN level log
   */
  async warn(message, metadata = null) {
    return this.log('warn', message, metadata);
  }

  /**
   * INFO level log
   */
  async info(message, metadata = null) {
    return this.log('info', message, metadata);
  }

  /**
   * DEBUG level log
   */
  async debug(message, metadata = null) {
    return this.log('debug', message, metadata);
  }

  /**
   * Main logging method
   */
  async log(level, message, metadata = null, error = null) {
    try {
      // Check level
      if (this.logLevels[level] > this.logLevels[this.logLevel]) {
        return;
      }

      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        metadata,
        error: error ? {
          message: error.message,
          stack: error.stack,
          code: error.code
        } : null,
        pid: process.pid
      };

      // Add to memory history
      this.addToHistory(logEntry);

      // Check rotation before writing
      await this.checkRotation();

      // Write to file
      const logLine = this.formatLogEntry(logEntry);
      await fs.appendFile(this.currentLogFile, logLine + '\n', 'utf8');

    } catch (error) {
      console.error('❌ Logging error:', error);
    }
  }

  /**
   * Formats log entry for file writing
   */
  formatLogEntry(entry) {
    const { timestamp, level, message, metadata, error, pid } = entry;
    
    let formatted = `[${timestamp}] [${level}] [PID:${pid}] ${message}`;
    
    if (metadata) {
      formatted += ` | META: ${JSON.stringify(metadata)}`;
    }
    
    if (error) {
      formatted += ` | ERROR: ${error.message}`;
      if (error.stack) {
        formatted += ` | STACK: ${error.stack.replace(/\n/g, ' | ')}`;
      }
    }
    
    return formatted;
  }

  /**
   * Performance logs
   */
  async performance(operation, duration, metadata = null) {
    return this.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      operation,
      ...metadata
    });
  }

  /**
   * Server event logs
   */
  async serverEvent(message, metadata = null) {
    return this.info(`Server: ${message}`, metadata);
  }

  /**
   * User action logs
   */
  async userAction(message, metadata = null) {
    return this.info(`User: ${message}`, metadata);
  }

  /**
   * Adds entry to memory history
   */
  addToHistory(entry) {
    this.logHistory.unshift(entry);
    
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Gets recent logs from memory
   */
  getRecentLogs(count = 100) {
    return this.logHistory.slice(0, count);
  }

  /**
   * Gets logs from file
   */
  async getLogsFromFile(lines = 100) {
    try {
      const content = await fs.readFile(this.currentLogFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      return logLines.slice(-lines);
    } catch (error) {
      return [];
    }
  }

  /**
   * Exports logs
   */
  async exportLogs() {
    try {
      const memoryLogs = this.getRecentLogs();
      const fileLogs = await this.getLogsFromFile(1000);
      
      return {
        memoryLogs,
        fileLogs,
        exportedAt: new Date().toISOString(),
        logLevel: this.logLevel
      };
    } catch (error) {
      throw new Error('Failed to export logs: ' + error.message);
    }
  }

  /**
   * Clears logs
   */
  async clearLogs() {
    try {
      this.logHistory = [];
      await fs.writeFile(this.currentLogFile, '', 'utf8');
      await this.info('Logs cleared by user');
    } catch (error) {
      throw new Error('Failed to clear logs: ' + error.message);
    }
  }

  /**
   * Checks if log rotation is needed
   */
  async checkRotation() {
    try {
      const stats = await fs.stat(this.currentLogFile).catch(() => null);
      
      if (!stats) {
        return; // File doesn't exist yet
      }

      if (stats.size >= this.maxFileSize) {
        await this.rotateLogFiles();
      }
      
    } catch (error) {
      console.error('❌ Rotation check error:', error);
    }
  }

  /**
   * Rotates log files
   */
  async rotateLogFiles() {
    try {
      // Shift existing files
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const currentPath = path.join(this.logsDir, `app.${i}.log`);
        const nextPath = path.join(this.logsDir, `app.${i + 1}.log`);
        
        try {
          await fs.access(currentPath);
          if (i === this.maxLogFiles - 1) {
            await fs.unlink(currentPath);
          } else {
            await fs.rename(currentPath, nextPath);
          }
        } catch (error) {
          // File doesn't exist, continue
        }
      }

      // Rename current file
      const archivePath = path.join(this.logsDir, 'app.1.log');
      try {
        await fs.rename(this.currentLogFile, archivePath);
      } catch (error) {
        // Current file doesn't exist
      }

      console.log('🔄 Log rotation completed');
      
    } catch (error) {
      console.error('❌ Log rotation error:', error);
    }
  }

  /**
   * Cleans old log files
   */
  async cleanOldLogs() {
    try {
      // Delete files beyond maxLogFiles
      for (let i = this.maxLogFiles + 1; i <= this.maxLogFiles + 5; i++) {
        const oldPath = path.join(this.logsDir, `app.${i}.log`);
        try {
          await fs.unlink(oldPath);
        } catch (error) {
          // File doesn't exist
        }
      }
    } catch (error) {
      console.error('❌ Old log cleanup error:', error);
    }
  }

  /**
   * Gets log file paths
   */
  getLogFiles() {
    const files = [this.currentLogFile];
    
    for (let i = 1; i <= this.maxLogFiles; i++) {
      files.push(path.join(this.logsDir, `app.${i}.log`));
    }
    
    return files;
  }

  /**
   * Gets log statistics
   */
  async getLogStats() {
    try {
      const stats = {
        memoryEntries: this.logHistory.length,
        currentLogLevel: this.logLevel,
        logFiles: [],
        totalSize: 0
      };

      const logFiles = this.getLogFiles();
      
      for (const filePath of logFiles) {
        try {
          const fileStat = await fs.stat(filePath);
          stats.logFiles.push({
            path: filePath,
            size: fileStat.size,
            modified: fileStat.mtime
          });
          stats.totalSize += fileStat.size;
        } catch (error) {
          // File doesn't exist
        }
      }

      return stats;
      
    } catch (error) {
      return null;
    }
  }
}

module.exports = LogManager; 