const crypto = require('crypto');
const { URL } = require('url');

class SecurityManager {
  constructor(logManager) {
    this.logManager = logManager;
    this.allowedOrigins = new Set(['http://localhost', 'http://127.0.0.1']);
    this.blockedIPs = new Set();
    this.rateLimitStore = new Map();
    this.rateLimitConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      blockDuration: 300000 // 5 minutes
    };
    this.csrfTokens = new Map();
    this.sessionTokens = new Map();
  }

  /**
   * Initialise les configurations de sécurité
   */
  initialize() {
    this.setupCSP();
    this.setupRateLimit();
    this.logManager?.info('SecurityManager initialisé', {
      allowedOrigins: Array.from(this.allowedOrigins),
      rateLimitEnabled: true
    });
  }

  /**
   * Configure la Content Security Policy
   */
  setupCSP() {
    this.cspDirectives = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"], // Nécessaire pour Next.js
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "blob:"],
      'connect-src': ["'self'", "ws://localhost:*", "ws://127.0.0.1:*"],
      'font-src': ["'self'"],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'"],
      'manifest-src': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'upgrade-insecure-requests': []
    };
  }

  /**
   * Configure le système de rate limiting
   */
  setupRateLimit() {
    // Rate limiting configuration is already done in constructor
    // This method can be used for additional setup if needed
    this.logManager?.info('Rate limiting configuré', {
      windowMs: this.rateLimitConfig.windowMs,
      maxRequests: this.rateLimitConfig.maxRequests,
      blockDuration: this.rateLimitConfig.blockDuration
    });
  }

  /**
   * Génère l'en-tête CSP
   */
  generateCSPHeader(isDev = false) {
    const directives = { ...this.cspDirectives };
    
    if (isDev) {
      // Assouplir les règles en développement
      directives['script-src'].push("'unsafe-eval'");
      directives['connect-src'].push('ws://*');
    }

    return Object.entries(directives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(' ')}`;
      })
      .join('; ');
  }

  /**
   * Valide une URL pour la navigation
   */
  validateURL(url) {
    try {
      const parsedURL = new URL(url);
      
      // Vérifier le protocole
      if (!['http:', 'https:'].includes(parsedURL.protocol)) {
        this.logManager?.warn('Tentative de navigation vers protocole non autorisé', { url, protocol: parsedURL.protocol });
        return false;
      }

      // Vérifier l'origine pour les URLs locales
      if (parsedURL.hostname === 'localhost' || parsedURL.hostname === '127.0.0.1') {
        const origin = `${parsedURL.protocol}//${parsedURL.hostname}`;
        if (!this.allowedOrigins.has(origin)) {
          this.logManager?.warn('Tentative de navigation vers origine non autorisée', { url, origin });
          return false;
        }
      }

      return true;

    } catch (error) {
      this.logManager?.warn('URL invalide détectée', { url, error: error.message });
      return false;
    }
  }

  /**
   * Ajoute une origine autorisée
   */
  addAllowedOrigin(origin) {
    this.allowedOrigins.add(origin);
    this.logManager?.info('Origine autorisée ajoutée', { origin });
  }

  /**
   * Supprime une origine autorisée
   */
  removeAllowedOrigin(origin) {
    this.allowedOrigins.delete(origin);
    this.logManager?.info('Origine autorisée supprimée', { origin });
  }

  /**
   * Valide les entrées utilisateur
   */
  validateInput(input, type = 'string', options = {}) {
    if (input === null || input === undefined) {
      return { valid: false, error: 'Valeur requise' };
    }

    switch (type) {
      case 'port':
        return this.validatePort(input);
      case 'hostname':
        return this.validateHostname(input);
      case 'string':
        return this.validateString(input, options);
      case 'number':
        return this.validateNumber(input, options);
      case 'boolean':
        return this.validateBoolean(input);
      default:
        return { valid: false, error: 'Type de validation non supporté' };
    }
  }

  /**
   * Valide un numéro de port
   */
  validatePort(port) {
    const numPort = parseInt(port, 10);
    
    if (isNaN(numPort)) {
      return { valid: false, error: 'Le port doit être un nombre' };
    }
    
    if (numPort < 1 || numPort > 65535) {
      return { valid: false, error: 'Le port doit être entre 1 et 65535' };
    }

    // Ports réservés système (optionnel warning)
    if (numPort < 1024) {
      return { 
        valid: true, 
        warning: 'Ports inférieurs à 1024 peuvent nécessiter des privilèges administrateur',
        value: numPort 
      };
    }

    return { valid: true, value: numPort };
  }

  /**
   * Valide un nom d'hôte
   */
  validateHostname(hostname) {
    if (typeof hostname !== 'string') {
      return { valid: false, error: 'Le hostname doit être une chaîne' };
    }

    hostname = hostname.trim();
    
    if (hostname.length === 0) {
      return { valid: false, error: 'Le hostname ne peut pas être vide' };
    }

    // Permettre localhost, 127.0.0.1, 0.0.0.0 et IPs valides
    const validPatterns = [
      /^localhost$/i,
      /^127\.0\.0\.1$/,
      /^0\.0\.0\.0$/,
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    ];

    const isValid = validPatterns.some(pattern => pattern.test(hostname));
    
    if (!isValid) {
      return { valid: false, error: 'Hostname non valide (utilisez localhost, 127.0.0.1, 0.0.0.0 ou une IP valide)' };
    }

    return { valid: true, value: hostname };
  }

  /**
   * Valide une chaîne de caractères
   */
  validateString(str, options = {}) {
    if (typeof str !== 'string') {
      return { valid: false, error: 'Doit être une chaîne de caractères' };
    }

    const { minLength = 0, maxLength = 1000, allowEmpty = true } = options;

    if (!allowEmpty && str.trim().length === 0) {
      return { valid: false, error: 'Ne peut pas être vide' };
    }

    if (str.length < minLength) {
      return { valid: false, error: `Doit contenir au moins ${minLength} caractères` };
    }

    if (str.length > maxLength) {
      return { valid: false, error: `Doit contenir au maximum ${maxLength} caractères` };
    }

    // Nettoyer la chaîne (basique)
    const cleaned = str.replace(/[<>\"'&]/g, '');
    
    return { valid: true, value: cleaned };
  }

  /**
   * Valide un nombre
   */
  validateNumber(num, options = {}) {
    const numValue = Number(num);
    
    if (isNaN(numValue)) {
      return { valid: false, error: 'Doit être un nombre valide' };
    }

    const { min, max, integer = false } = options;

    if (integer && !Number.isInteger(numValue)) {
      return { valid: false, error: 'Doit être un nombre entier' };
    }

    if (min !== undefined && numValue < min) {
      return { valid: false, error: `Doit être supérieur ou égal à ${min}` };
    }

    if (max !== undefined && numValue > max) {
      return { valid: false, error: `Doit être inférieur ou égal à ${max}` };
    }

    return { valid: true, value: numValue };
  }

  /**
   * Valide un booléen
   */
  validateBoolean(bool) {
    if (typeof bool === 'boolean') {
      return { valid: true, value: bool };
    }

    if (bool === 'true' || bool === '1' || bool === 1) {
      return { valid: true, value: true };
    }

    if (bool === 'false' || bool === '0' || bool === 0) {
      return { valid: true, value: false };
    }

    return { valid: false, error: 'Doit être un booléen valide' };
  }

  /**
   * Implémente un rate limiting basique
   */
  checkRateLimit(identifier) {
    const now = Date.now();
    const key = `rate_${identifier}`;
    
    // Nettoyer les entrées expirées
    this.cleanupRateLimit(now);
    
    const current = this.rateLimitStore.get(key) || { count: 0, firstRequest: now, blocked: false };
    
    // Vérifier si bloqué
    if (current.blocked && (now - current.blockedAt) < this.rateLimitConfig.blockDuration) {
      return { allowed: false, blocked: true, resetIn: this.rateLimitConfig.blockDuration - (now - current.blockedAt) };
    }
    
    // Reset si nouvelle fenêtre
    if (now - current.firstRequest > this.rateLimitConfig.windowMs) {
      current.count = 0;
      current.firstRequest = now;
      current.blocked = false;
    }
    
    current.count++;
    
    // Vérifier limite
    if (current.count > this.rateLimitConfig.maxRequests) {
      current.blocked = true;
      current.blockedAt = now;
      this.rateLimitStore.set(key, current);
      
      this.logManager?.warn('Rate limit dépassé', { 
        identifier, 
        count: current.count, 
        limit: this.rateLimitConfig.maxRequests 
      });
      
      return { allowed: false, blocked: true, resetIn: this.rateLimitConfig.blockDuration };
    }
    
    this.rateLimitStore.set(key, current);
    
    return { 
      allowed: true, 
      remaining: this.rateLimitConfig.maxRequests - current.count,
      resetIn: this.rateLimitConfig.windowMs - (now - current.firstRequest)
    };
  }

  /**
   * Nettoie les entrées de rate limiting expirées
   */
  cleanupRateLimit(now) {
    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now - data.firstRequest > this.rateLimitConfig.windowMs * 2) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Génère un token CSRF
   */
  generateCSRFToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + (60 * 60 * 1000); // 1 heure
    
    this.csrfTokens.set(token, { created: Date.now(), expiry });
    
    // Nettoyer les anciens tokens
    this.cleanupTokens();
    
    return token;
  }

  /**
   * Valide un token CSRF
   */
  validateCSRFToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const tokenData = this.csrfTokens.get(token);
    
    if (!tokenData) {
      return false;
    }

    if (Date.now() > tokenData.expiry) {
      this.csrfTokens.delete(token);
      return false;
    }

    return true;
  }

  /**
   * Nettoie les tokens expirés
   */
  cleanupTokens() {
    const now = Date.now();
    
    for (const [token, data] of this.csrfTokens.entries()) {
      if (now > data.expiry) {
        this.csrfTokens.delete(token);
      }
    }
  }

  /**
   * Génère les en-têtes de sécurité HTTP
   */
  getSecurityHeaders(isDev = false) {
    return {
      'Content-Security-Policy': this.generateCSPHeader(isDev),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-DNS-Prefetch-Control': 'off'
    };
  }

  /**
   * Bloque une adresse IP
   */
  blockIP(ip, reason = 'Security violation') {
    this.blockedIPs.add(ip);
    this.logManager?.warn('IP bloquée', { ip, reason });
  }

  /**
   * Débloque une adresse IP
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.logManager?.info('IP débloquée', { ip });
  }

  /**
   * Vérifie si une IP est bloquée
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Obtient les statistiques de sécurité
   */
  getSecurityStats() {
    return {
      allowedOrigins: Array.from(this.allowedOrigins),
      blockedIPs: Array.from(this.blockedIPs),
      activeRateLimits: this.rateLimitStore.size,
      activeCSRFTokens: this.csrfTokens.size,
      rateLimitConfig: this.rateLimitConfig
    };
  }

  /**
   * Réinitialise les compteurs de sécurité
   */
  resetSecurityCounters() {
    this.rateLimitStore.clear();
    this.csrfTokens.clear();
    this.blockedIPs.clear();
    this.logManager?.info('Compteurs de sécurité réinitialisés');
  }

  /**
   * Configure le rate limiting
   */
  setRateLimitConfig(config) {
    this.rateLimitConfig = { ...this.rateLimitConfig, ...config };
    this.logManager?.info('Configuration rate limit mise à jour', this.rateLimitConfig);
  }
}

module.exports = SecurityManager; 