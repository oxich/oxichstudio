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
   * Initializes security configurations
   */
  initialize() {
    this.setupCSP();
    this.setupRateLimit();
    this.logManager?.info('Security system initialized', {
      allowedOrigins: Array.from(this.allowedOrigins),
      rateLimitEnabled: true
    });
  }

  /**
   * Configure the Content Security Policy
   */
  setupCSP() {
    this.cspDirectives = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"], // Required for Next.js
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
   * Configure the rate limiting system
   */
  setupRateLimit() {
    // Rate limiting configuration is already done in constructor
    // This method can be used for additional setup if needed
    this.logManager?.info('Rate limiting configured', {
      windowMs: this.rateLimitConfig.windowMs,
      maxRequests: this.rateLimitConfig.maxRequests,
      blockDuration: this.rateLimitConfig.blockDuration
    });
  }

  /**
   * Generates the CSP header
   */
  generateCSPHeader(isDev = false) {
    const directives = { ...this.cspDirectives };
    
    if (isDev) {
      // Relax rules in development
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
   * Validates a URL for navigation
   */
  validateURL(url) {
    try {
      const parsedURL = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsedURL.protocol)) {
        this.logManager?.warn('Attempted navigation to unauthorized protocol', { url, protocol: parsedURL.protocol });
        return false;
      }

      // Check origin for local URLs
      if (parsedURL.hostname === 'localhost' || parsedURL.hostname === '127.0.0.1') {
        const origin = `${parsedURL.protocol}//${parsedURL.hostname}`;
        if (!this.allowedOrigins.has(origin)) {
          this.logManager?.warn('Attempted navigation to unauthorized origin', { url, origin });
          return false;
        }
      }

      return true;

    } catch (error) {
      this.logManager?.warn('Invalid URL detected', { url, error: error.message });
      return false;
    }
  }

  /**
   * Adds an allowed origin
   */
  addAllowedOrigin(origin) {
    this.allowedOrigins.add(origin);
    this.logManager?.info('Allowed origin added', { origin });
  }

  /**
   * Removes an allowed origin
   */
  removeAllowedOrigin(origin) {
    this.allowedOrigins.delete(origin);
    this.logManager?.info('Allowed origin removed', { origin });
  }

  /**
   * Validates input according to type and constraints
   */
  validateInput(input, type, options = {}) {
    try {
      switch (type) {
        case 'port':
          return this.validatePort(input, options);
        case 'url':
          return this.validateURL(input, options);
        case 'path':
          return this.validatePath(input, options);
        case 'string':
          return this.validateString(input, options);
        case 'number':
          return this.validateNumber(input, options);
        case 'boolean':
          return this.validateBoolean(input, options);
        default:
          return { valid: false, error: 'Unknown validation type' };
      }
    } catch (error) {
      this.logManager?.error('Input validation error', { type, input: typeof input }, error);
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Validates port number
   */
  validatePort(port, options = {}) {
    const num = Number(port);
    
    if (isNaN(num) || !Number.isInteger(num)) {
      return { valid: false, error: 'Port must be a valid integer' };
    }
    
    if (num < 1 || num > 65535) {
      return { valid: false, error: 'Port must be between 1 and 65535' };
    }
    
    if (num < 1024 && !options.allowPrivileged) {
      return { valid: false, error: 'Privileged ports (< 1024) require special permissions' };
    }
    
    return { valid: true, value: num };
  }

  /**
   * Validates file path
   */
  validatePath(path, options = {}) {
    if (typeof path !== 'string') {
      return { valid: false, error: 'Path must be a string' };
    }
    
    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(path)) {
      return { valid: false, error: 'Path contains invalid characters' };
    }
    
    // Check for path traversal attempts
    if (path.includes('..') || path.includes('~')) {
      return { valid: false, error: 'Path traversal not allowed' };
    }
    
    if (options.maxLength && path.length > options.maxLength) {
      return { valid: false, error: `Path too long (max ${options.maxLength} characters)` };
    }
    
    return { valid: true, value: path };
  }

  /**
   * Validates string
   */
  validateString(str, options = {}) {
    if (typeof str !== 'string') {
      return { valid: false, error: 'Value must be a string' };
    }
    
    const maxLength = options.maxLength || this.rateLimitConfig.maxRequests;
    if (str.length > maxLength) {
      return { valid: false, error: `String too long (max ${maxLength} characters)` };
    }
    
    if (options.minLength && str.length < options.minLength) {
      return { valid: false, error: `String too short (min ${options.minLength} characters)` };
    }
    
    // Check for dangerous patterns
    if (options.allowHTML !== true) {
      const htmlPattern = /<[^>]*>/;
      if (htmlPattern.test(str)) {
        return { valid: false, error: 'HTML content not allowed' };
      }
    }
    
    if (options.allowScripts !== true) {
      const scriptPattern = /(javascript:|data:|vbscript:|on\w+\s*=)/i;
      if (scriptPattern.test(str)) {
        return { valid: false, error: 'Script content not allowed' };
      }
    }
    
    return { valid: true, value: str };
  }

  /**
   * Validates number
   */
  validateNumber(num, options = {}) {
    const value = Number(num);
    
    if (isNaN(value)) {
      return { valid: false, error: 'Value must be a valid number' };
    }
    
    if (options.integer && !Number.isInteger(value)) {
      return { valid: false, error: 'Value must be an integer' };
    }
    
    if (options.min !== undefined && value < options.min) {
      return { valid: false, error: `Value must be at least ${options.min}` };
    }
    
    if (options.max !== undefined && value > options.max) {
      return { valid: false, error: `Value must be at most ${options.max}` };
    }
    
    return { valid: true, value: value };
  }

  /**
   * Validates boolean
   */
  validateBoolean(bool, options = {}) {
    if (typeof bool === 'boolean') {
      return { valid: true, value: bool };
    }
    
    if (typeof bool === 'string') {
      const lowerStr = bool.toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(lowerStr)) {
        return { valid: true, value: true };
      }
      if (['false', '0', 'no', 'off'].includes(lowerStr)) {
        return { valid: true, value: false };
      }
    }
    
    if (typeof bool === 'number') {
      if (bool === 1) return { valid: true, value: true };
      if (bool === 0) return { valid: true, value: false };
    }
    
    return { valid: false, error: 'Value must be a boolean (true/false)' };
  }

  /**
   * Rate limiting system
   */
  checkRateLimit(identifier, customLimit = null) {
    if (!this.rateLimitConfig.rateLimitEnabled) {
      return { allowed: true, remaining: Infinity };
    }
    
    const now = Date.now();
    const limit = customLimit || this.rateLimitConfig.maxRequests;
    const window = this.rateLimitConfig.windowMs;
    
    // Clean old entries
    this.cleanOldRateLimitEntries(now, window);
    
    const requests = this.rateLimitStore.get(identifier) || [];
    const recentRequests = requests.filter(time => now - time < window);
    
    // Check if blocked
    if (this.blockedIPs.has(identifier)) {
      return { allowed: false, remaining: 0, blocked: true };
    }
    
    // Check limit
    if (recentRequests.length >= limit) {
      this.blockIP(identifier, 'Rate limit exceeded');
      return { allowed: false, remaining: 0, rateLimited: true };
    }
    
    // Record request
    recentRequests.push(now);
    this.rateLimitStore.set(identifier, recentRequests);
    
    return { 
      allowed: true, 
      remaining: limit - recentRequests.length,
      resetTime: now + window
    };
  }

  /**
   * Cleans old rate limit entries
   */
  cleanOldRateLimitEntries(now, window) {
    const cutoff = now - (window * 2); // Keep entries for 2 windows
    
    for (const [identifier, requests] of this.rateLimitStore.entries()) {
      const recentRequests = requests.filter(time => time > cutoff);
      if (recentRequests.length === 0) {
        this.rateLimitStore.delete(identifier);
      } else {
        this.rateLimitStore.set(identifier, recentRequests);
      }
    }
  }

  /**
   * Blocks an IP address
   */
  blockIP(ip, reason = 'Security violation') {
    this.blockedIPs.add(ip);
    this.logManager?.warn('IP blocked', { ip, reason });
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.unblockIP(ip);
    }, this.rateLimitConfig.blockDuration);
  }

  /**
   * Unblocks an IP address
   */
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.logManager?.info('IP unblocked', { ip });
  }

  /**
   * Checks if an IP is blocked
   */
  isIPBlocked(ip) {
    return this.blockedIPs.has(ip);
  }

  /**
   * Gets security statistics
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
   * Resets security counters
   */
  resetSecurityCounters() {
    this.rateLimitStore.clear();
    this.csrfTokens.clear();
    this.blockedIPs.clear();
    this.logManager?.info('Security counters reset');
  }

  /**
   * Generates secure random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hashes sensitive data
   */
  hashData(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
    return {
      hash: hash.toString('hex'),
      salt: actualSalt
    };
  }

  /**
   * Verifies hashed data
   */
  verifyHash(data, hash, salt) {
    const computed = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
    return computed.toString('hex') === hash;
  }
}

module.exports = SecurityManager; 