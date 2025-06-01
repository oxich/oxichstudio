const { EventEmitter } = require('events');

class ErrorHandler extends EventEmitter {
  constructor(logManager, configManager, networkManager) {
    super();
    this.logManager = logManager;
    this.configManager = configManager;
    this.networkManager = networkManager;
    this.errorHistory = [];
    this.maxHistorySize = 50;
    this.recoveryAttempts = new Map();
    this.maxRecoveryAttempts = 3;
  }

  /**
   * Gère une erreur avec stratégies de récupération
   */
  async handleError(error, context = {}, allowRecovery = true) {
    const errorInfo = this.analyzeError(error, context);
    
    // Enregistrer dans l'historique
    this.addToHistory(errorInfo);
    
    // Log détaillé
    await this.logManager?.error('Erreur capturée', {
      ...errorInfo,
      context,
      recoveryAllowed: allowRecovery
    });

    // Émettre l'événement pour l'interface utilisateur
    this.emit('error-occurred', errorInfo);

    // Tenter la récupération si autorisée
    if (allowRecovery) {
      await this.attemptRecovery(errorInfo);
    }

    return errorInfo;
  }

  /**
   * Analyse et catégorise une erreur
   */
  analyzeError(error, context = {}) {
    const errorInfo = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message: error.message || 'Erreur inconnue',
      code: error.code || 'UNKNOWN_ERROR',
      stack: error.stack,
      context,
      category: this.categorizeError(error),
      severity: this.getSeverity(error),
      userMessage: this.getUserFriendlyMessage(error),
      recoverable: this.isRecoverable(error),
      suggestedActions: this.getSuggestedActions(error)
    };

    return errorInfo;
  }

  /**
   * Catégorise le type d'erreur
   */
  categorizeError(error) {
    if (error.code) {
      // Erreurs réseau
      if (['EADDRINUSE', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code)) {
        return 'NETWORK';
      }
      
      // Erreurs système
      if (['ENOENT', 'EACCES', 'EPERM', 'EMFILE', 'ENFILE'].includes(error.code)) {
        return 'SYSTEM';
      }
      
      // Erreurs de processus
      if (['ECHILD', 'ESRCH'].includes(error.code)) {
        return 'PROCESS';
      }
    }

    // Erreurs de validation
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'VALIDATION';
    }

    // Erreurs de configuration
    if (error.message.includes('config') || error.message.includes('configuration')) {
      return 'CONFIG';
    }

    // Erreurs de serveur
    if (error.message.includes('server') || error.message.includes('Next.js')) {
      return 'SERVER';
    }

    return 'UNKNOWN';
  }

  /**
   * Détermine la sévérité de l'erreur
   */
  getSeverity(error) {
    // Critique : erreurs qui empêchent l'application de fonctionner
    if (['SYSTEM', 'PROCESS'].includes(this.categorizeError(error))) {
      return 'CRITICAL';
    }

    // Haute : erreurs qui affectent des fonctionnalités principales
    if (['SERVER', 'NETWORK'].includes(this.categorizeError(error))) {
      return 'HIGH';
    }

    // Moyenne : erreurs qui affectent l'expérience utilisateur
    if (['CONFIG', 'VALIDATION'].includes(this.categorizeError(error))) {
      return 'MEDIUM';
    }

    // Faible : erreurs mineures ou récupérables
    return 'LOW';
  }

  /**
   * Génère un message utilisateur compréhensible
   */
  getUserFriendlyMessage(error) {
    const category = this.categorizeError(error);
    const code = error.code;

    switch (category) {
      case 'NETWORK':
        if (code === 'EADDRINUSE') {
          return 'Le port sélectionné est déjà utilisé par une autre application. Veuillez choisir un port différent.';
        }
        if (code === 'ECONNREFUSED') {
          return 'Impossible de se connecter au serveur. Vérifiez que le serveur est démarré.';
        }
        if (code === 'ENOTFOUND') {
          return 'Adresse réseau introuvable. Vérifiez votre connexion internet.';
        }
        return 'Problème de réseau détecté. Vérifiez votre connexion.';

      case 'SYSTEM':
        if (code === 'ENOENT') {
          return 'Fichier ou dossier requis introuvable. L\'application pourrait être incomplète.';
        }
        if (code === 'EACCES' || code === 'EPERM') {
          return 'Permissions insuffisantes. Essayez de relancer l\'application en tant qu\'administrateur.';
        }
        return 'Problème système détecté. Redémarrez l\'application.';

      case 'SERVER':
        return 'Le serveur web a rencontré un problème. Tentative de redémarrage automatique...';

      case 'CONFIG':
        return 'Problème de configuration détecté. La configuration sera réinitialisée.';

      case 'VALIDATION':
        return 'Données invalides détectées. Vérifiez vos paramètres.';

      default:
        return 'Une erreur inattendue s\'est produite. L\'équipe technique a été notifiée.';
    }
  }

  /**
   * Détermine si l'erreur est récupérable
   */
  isRecoverable(error) {
    const category = this.categorizeError(error);
    const nonRecoverableCategories = ['SYSTEM'];
    const code = error.code;

    // Erreurs système généralement non récupérables
    if (nonRecoverableCategories.includes(category)) {
      return false;
    }

    // Erreurs spécifiques non récupérables
    if (['EMFILE', 'ENFILE', 'ENOENT'].includes(code)) {
      return false;
    }

    return true;
  }

  /**
   * Fournit des actions suggérées pour résoudre l'erreur
   */
  getSuggestedActions(error) {
    const category = this.categorizeError(error);
    const code = error.code;

    switch (category) {
      case 'NETWORK':
        if (code === 'EADDRINUSE') {
          return [
            'Changer le port dans les paramètres',
            'Arrêter l\'application qui utilise ce port',
            'Redémarrer l\'ordinateur'
          ];
        }
        return [
          'Vérifier la connexion internet',
          'Redémarrer le serveur',
          'Contacter l\'administrateur réseau'
        ];

      case 'SYSTEM':
        return [
          'Redémarrer l\'application',
          'Lancer en tant qu\'administrateur',
          'Réinstaller l\'application'
        ];

      case 'SERVER':
        return [
          'Redémarrer le serveur',
          'Vérifier les logs détaillés',
          'Changer le port du serveur'
        ];

      case 'CONFIG':
        return [
          'Réinitialiser la configuration',
          'Importer une configuration valide',
          'Supprimer le fichier de configuration'
        ];

      default:
        return [
          'Redémarrer l\'application',
          'Consulter les logs',
          'Contacter le support technique'
        ];
    }
  }

  /**
   * Tente une récupération automatique
   */
  async attemptRecovery(errorInfo) {
    const { category, code, id } = errorInfo;
    const attemptKey = `${category}-${code}`;

    // Vérifier le nombre de tentatives précédentes
    const previousAttempts = this.recoveryAttempts.get(attemptKey) || 0;
    if (previousAttempts >= this.maxRecoveryAttempts) {
      await this.logManager?.warn('Nombre maximum de tentatives de récupération atteint', {
        category,
        code,
        attempts: previousAttempts
      });
      return false;
    }

    // Incrémenter le compteur
    this.recoveryAttempts.set(attemptKey, previousAttempts + 1);

    await this.logManager?.info('Tentative de récupération automatique', {
      errorId: id,
      category,
      attempt: previousAttempts + 1
    });

    try {
      let recovered = false;

      switch (category) {
        case 'NETWORK':
          recovered = await this.recoverNetworkError(errorInfo);
          break;
        case 'CONFIG':
          recovered = await this.recoverConfigError(errorInfo);
          break;
        case 'SERVER':
          recovered = await this.recoverServerError(errorInfo);
          break;
        default:
          recovered = await this.recoverGenericError(errorInfo);
      }

      if (recovered) {
        // Reset le compteur en cas de succès
        this.recoveryAttempts.delete(attemptKey);
        this.emit('recovery-success', errorInfo);
        await this.logManager?.info('Récupération automatique réussie', { errorId: id });
      } else {
        this.emit('recovery-failed', errorInfo);
        await this.logManager?.warn('Échec de la récupération automatique', { errorId: id });
      }

      return recovered;

    } catch (recoveryError) {
      await this.logManager?.error('Erreur durant la récupération', { errorId: id }, recoveryError);
      this.emit('recovery-error', { originalError: errorInfo, recoveryError });
      return false;
    }
  }

  /**
   * Récupération d'erreurs réseau
   */
  async recoverNetworkError(errorInfo) {
    const { code } = errorInfo;

    if (code === 'EADDRINUSE') {
      // Proposer un port alternatif
      try {
        const currentPort = this.configManager?.get('server.port', 8080);
        const suggestions = await this.networkManager?.suggestAlternativePorts(currentPort, 1);
        
        if (suggestions && suggestions.length > 0) {
          const newPort = suggestions[0];
          await this.configManager?.set('server.port', newPort);
          
          this.emit('port-changed-automatically', { 
            oldPort: currentPort, 
            newPort,
            reason: 'Port conflict recovery'
          });
          
          return true;
        }
      } catch (error) {
        // Échec de récupération
      }
    }

    return false;
  }

  /**
   * Récupération d'erreurs de configuration
   */
  async recoverConfigError(errorInfo) {
    try {
      // Tenter de restaurer depuis backup
      await this.configManager?.resetToDefault();
      this.emit('config-reset-automatically', { reason: 'Config error recovery' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Récupération d'erreurs serveur
   */
  async recoverServerError(errorInfo) {
    // Pour l'instant, signaler qu'une récupération serveur est nécessaire
    // (sera implémenté avec l'auto-restart dans ServerMonitor)
    this.emit('server-recovery-needed', errorInfo);
    return false;
  }

  /**
   * Récupération générique
   */
  async recoverGenericError(errorInfo) {
    // Pas de récupération automatique pour les erreurs génériques
    return false;
  }

  /**
   * Ajoute une erreur à l'historique
   */
  addToHistory(errorInfo) {
    this.errorHistory.unshift(errorInfo);
    
    // Limiter la taille de l'historique
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Obtient l'historique des erreurs
   */
  getErrorHistory(limit = 20) {
    return this.errorHistory.slice(0, limit);
  }

  /**
   * Obtient les statistiques d'erreurs
   */
  getErrorStatistics() {
    const total = this.errorHistory.length;
    const byCategory = {};
    const bySeverity = {};
    const recent = this.errorHistory.filter(
      err => Date.now() - new Date(err.timestamp).getTime() < 24 * 60 * 60 * 1000 // 24h
    );

    this.errorHistory.forEach(err => {
      byCategory[err.category] = (byCategory[err.category] || 0) + 1;
      bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
    });

    return {
      total,
      recent: recent.length,
      byCategory,
      bySeverity,
      recoveryAttempts: Object.fromEntries(this.recoveryAttempts)
    };
  }

  /**
   * Vide l'historique des erreurs
   */
  clearErrorHistory() {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
    this.logManager?.info('Historique des erreurs vidé');
    this.emit('history-cleared');
  }
}

module.exports = ErrorHandler; 