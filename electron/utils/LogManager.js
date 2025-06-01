const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class LogManager {
  constructor() {
    this.logsDir = path.join(app.getPath('userData'), 'logs');
    this.currentLogFile = path.join(this.logsDir, 'app.log');
    this.maxLogSize = 5 * 1024 * 1024; // 5MB
    this.maxLogFiles = 5;
    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    this.currentLevel = this.logLevels.INFO;
    this.isInitialized = false;
  }

  /**
   * Initialise le système de logs
   */
  async initialize() {
    try {
      // Créer le dossier logs s'il n'existe pas
      await this.ensureLogsDirectory();
      
      // Nettoyer les anciens logs
      await this.cleanOldLogs();
      
      this.isInitialized = true;
      
      // Log de démarrage
      await this.info('LogManager initialisé', {
        logsDir: this.logsDir,
        maxSize: this.maxLogSize,
        maxFiles: this.maxLogFiles
      });
      
    } catch (error) {
      console.error('❌ Erreur initialisation LogManager:', error);
    }
  }

  /**
   * Définit le niveau de log
   */
  setLevel(level) {
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase();
      if (upperLevel in this.logLevels) {
        this.currentLevel = this.logLevels[upperLevel];
      }
    } else if (typeof level === 'number') {
      this.currentLevel = level;
    }
  }

  /**
   * Log niveau ERROR
   */
  async error(message, data = null, error = null) {
    await this.log('ERROR', message, data, error);
  }

  /**
   * Log niveau WARN
   */
  async warn(message, data = null) {
    await this.log('WARN', message, data);
  }

  /**
   * Log niveau INFO
   */
  async info(message, data = null) {
    await this.log('INFO', message, data);
  }

  /**
   * Log niveau DEBUG
   */
  async debug(message, data = null) {
    await this.log('DEBUG', message, data);
  }

  /**
   * Log principal
   */
  async log(level, message, data = null, error = null) {
    if (!this.isInitialized) {
      console.log(`[${level}] ${message}`);
      return;
    }

    // Vérifier le niveau
    if (this.logLevels[level] > this.currentLevel) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        pid: process.pid,
        ...(data && { data }),
        ...(error && { 
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        })
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Vérifier rotation avant écriture
      await this.checkRotation();
      
      // Écrire dans le fichier
      await fs.appendFile(this.currentLogFile, logLine, 'utf8');
      
      // Afficher aussi dans la console pour le développement
      const consoleMessage = `[${level}] ${message}`;
      if (level === 'ERROR') {
        console.error(consoleMessage, data || '');
      } else if (level === 'WARN') {
        console.warn(consoleMessage, data || '');
      } else {
        console.log(consoleMessage, data || '');
      }
      
    } catch (error) {
      console.error('❌ Erreur écriture log:', error);
    }
  }

  /**
   * Log des performances
   */
  async performance(operation, duration, details = null) {
    await this.info(`Performance: ${operation}`, {
      duration: `${duration}ms`,
      ...details
    });
  }

  /**
   * Log des événements serveur
   */
  async serverEvent(event, data = null) {
    await this.info(`Server: ${event}`, data);
  }

  /**
   * Log des actions utilisateur
   */
  async userAction(action, details = null) {
    await this.info(`User: ${action}`, details);
  }

  /**
   * Récupère les logs récents (pour l'interface)
   */
  async getRecentLogs(limit = 100) {
    try {
      const exists = await this.fileExists(this.currentLogFile);
      if (!exists) {
        return [];
      }

      const data = await fs.readFile(this.currentLogFile, 'utf8');
      const lines = data.trim().split('\n').filter(line => line.length > 0);
      
      const logs = lines
        .slice(-limit)
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null);

      return logs;
      
    } catch (error) {
      console.error('❌ Erreur lecture logs:', error);
      return [];
    }
  }

  /**
   * Exporte les logs pour support
   */
  async exportLogs() {
    try {
      const logs = await this.getRecentLogs(1000);
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error('❌ Erreur export logs:', error);
      return null;
    }
  }

  /**
   * Vide les logs (reset)
   */
  async clearLogs() {
    try {
      if (await this.fileExists(this.currentLogFile)) {
        await fs.unlink(this.currentLogFile);
      }
      
      await this.info('Logs vidés par l\'utilisateur');
      
    } catch (error) {
      console.error('❌ Erreur vidage logs:', error);
    }
  }

  // === MÉTHODES PRIVÉES ===

  async ensureLogsDirectory() {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async checkRotation() {
    try {
      const exists = await this.fileExists(this.currentLogFile);
      if (!exists) {
        return;
      }

      const stats = await fs.stat(this.currentLogFile);
      
      if (stats.size >= this.maxLogSize) {
        await this.rotateLog();
      }
      
    } catch (error) {
      console.error('❌ Erreur vérification rotation:', error);
    }
  }

  async rotateLog() {
    try {
      // Décaler les fichiers existants
      for (let i = this.maxLogFiles - 1; i >= 1; i--) {
        const currentFile = path.join(this.logsDir, `app.${i}.log`);
        const nextFile = path.join(this.logsDir, `app.${i + 1}.log`);
        
        if (await this.fileExists(currentFile)) {
          if (i === this.maxLogFiles - 1) {
            // Supprimer le plus ancien
            await fs.unlink(currentFile);
          } else {
            // Renommer vers numéro suivant
            await fs.rename(currentFile, nextFile);
          }
        }
      }
      
      // Renommer le fichier courant
      const firstRotated = path.join(this.logsDir, 'app.1.log');
      if (await this.fileExists(this.currentLogFile)) {
        await fs.rename(this.currentLogFile, firstRotated);
      }
      
      console.log('🔄 Rotation des logs effectuée');
      
    } catch (error) {
      console.error('❌ Erreur rotation logs:', error);
    }
  }

  async cleanOldLogs() {
    try {
      const files = await fs.readdir(this.logsDir);
      const logFiles = files.filter(file => file.match(/^app\.\d+\.log$/));
      
      // Supprimer les fichiers au-delà de maxLogFiles
      const sortedFiles = logFiles.sort((a, b) => {
        const numA = parseInt(a.match(/app\.(\d+)\.log$/)[1]);
        const numB = parseInt(b.match(/app\.(\d+)\.log$/)[1]);
        return numB - numA; // Ordre décroissant
      });
      
      for (let i = this.maxLogFiles - 1; i < sortedFiles.length; i++) {
        const filePath = path.join(this.logsDir, sortedFiles[i]);
        await fs.unlink(filePath);
      }
      
    } catch (error) {
      // Ignore les erreurs de nettoyage
      console.warn('⚠️ Erreur nettoyage logs:', error.message);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = LogManager; 