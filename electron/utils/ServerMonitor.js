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
    this.defaultHealthCheckInterval = 5000; // ✅ AJOUT: Sauvegarder la valeur par défaut
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
   * Démarre la surveillance du serveur
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

    this.logManager?.info('Surveillance serveur démarrée', {
      port,
      hostname,
      pid: serverProcess?.pid
    });

    // ✅ DÉLAI initial pour laisser le serveur démarrer complètement
    setTimeout(() => {
      if (this.isMonitoring) {
        // ✅ OPTIMISATION: Commencer avec un intervalle plus long puis se normaliser
        this.healthCheckInterval = 10000; // Commencer avec 10 secondes
        
        // Démarrer les vérifications périodiques après un délai
        this.monitorInterval = setInterval(() => {
          this.performHealthCheck();
        }, this.healthCheckInterval);
        
        this.logManager?.info('Health checks demarre avec intervalle initial', { 
          port, 
          hostname,
          initialInterval: this.healthCheckInterval 
        });
      }
    }, 8000); // 8 secondes de délai initial

    // Surveillance du processus
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
   * Arrête la surveillance
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // ✅ CORRECTION: Message en ASCII pour éviter les problèmes d'encodage
    this.logManager?.info('Surveillance serveur arretee');
    this.emit('monitoring-stopped');
  }

  /**
   * Vérifie l'état de santé du serveur
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
        
        // ✅ RÉINITIALISATION: Remettre l'intervalle normal si le serveur est redevenu sain
        if (this.healthCheckInterval > this.defaultHealthCheckInterval) {
          this.healthCheckInterval = this.defaultHealthCheckInterval; // Revenir à l'intervalle par défaut
          
          // Redémarrer l'intervalle avec la fréquence normale
          if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = setInterval(() => {
              this.performHealthCheck();
            }, this.healthCheckInterval);
            
            this.logManager?.info('Health check intervalle normalise', {
              interval: this.healthCheckInterval,
              port: this.serverPort
            });
          }
        }
        
        // Métriques du processus si disponible
        if (this.serverProcess && this.serverProcess.pid) {
          try {
            const usage = process.memoryUsage();
            this.performanceMetrics.memoryUsage = usage.rss;
          } catch (error) {
            // Ignore les erreurs de métriques
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
   * Teste la connectivité du serveur
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
        this.logManager?.debug('Health check connexion refusée', {
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
   * Gère les échecs de vérification de santé
   */
  async handleHealthCheckFailure(error = null) {
    this.retryCount++;
    this.performanceMetrics.errorCount++;

    // ✅ CORRECTION: Messages en ASCII pour éviter les problèmes d'encodage
    await this.logManager?.warn('Health check echec', {
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

    // Si trop d'échecs consécutifs, signaler un problème critique
    if (this.retryCount >= this.maxRetries) {
      await this.logManager?.error('Serveur considere comme defaillant', {
        port: this.serverPort,
        retryCount: this.retryCount
      });

      this.emit('server-unhealthy', {
        retryCount: this.retryCount,
        metrics: this.performanceMetrics
      });

      // ✅ AMÉLIORATION: Augmenter l'intervalle après échecs pour réduire le spam
      this.healthCheckInterval = Math.min(this.healthCheckInterval * 1.5, 30000); // Max 30 secondes
      
      // Redémarrer l'intervalle avec la nouvelle fréquence
      if (this.monitorInterval) {
        clearInterval(this.monitorInterval);
        this.monitorInterval = setInterval(() => {
          this.performHealthCheck();
        }, this.healthCheckInterval);
      }

      // Reset pour éviter le spam
      this.retryCount = 0;
    }
  }

  /**
   * Gère la sortie inattendue du processus serveur
   */
  async handleServerExit(code, signal) {
    // ✅ CORRECTION: Message en ASCII pour éviter les problèmes d'encodage
    await this.logManager?.error('Serveur termine de facon inattendue', {
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
   * Gère les erreurs du processus serveur
   */
  async handleServerError(error) {
    await this.logManager?.error('Erreur processus serveur', null, error);
    
    this.emit('server-error', {
      error: error.message,
      code: error.code
    });
  }

  /**
   * Obtient les métriques de performance actuelles
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
   * Obtient l'état détaillé du serveur
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
   * Met à jour l'intervalle de vérification
   */
  setHealthCheckInterval(interval) {
    if (interval < 1000) interval = 1000; // Minimum 1 seconde
    if (interval > 60000) interval = 60000; // Maximum 1 minute

    this.healthCheckInterval = interval;

    if (this.isMonitoring) {
      // Redémarrer avec le nouvel intervalle
      this.stopMonitoring();
      setTimeout(() => {
        this.startMonitoring(this.serverProcess, this.serverPort, this.serverHostname);
      }, 100);
    }

    this.logManager?.info('Intervalle health check modifié', { interval });
  }

  /**
   * Réinitialise les compteurs de performance
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

    this.logManager?.info('Métriques de performance réinitialisées');
    this.emit('metrics-reset');
  }
}

module.exports = ServerMonitor; 