const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.backupPath = path.join(app.getPath('userData'), 'config.backup.json');
    this.defaultConfig = {
      server: {
        port: 8080,
        hostname: '127.0.0.1',
        autoStart: false,
        enableLan: false
      },
      window: {
        width: 1200,
        height: 800,
        x: null,
        y: null
      },
      ui: {
        theme: 'light',
        language: 'fr'
      },
      history: {
        recentPorts: [8080, 3000, 9000]
      }
    };
    this.config = null;
  }

  /**
   * Initialise et charge la configuration
   */
  async initialize() {
    try {
      await this.loadConfig();
      console.log('✅ Configuration chargée:', this.configPath);
    } catch (error) {
      console.error('❌ Erreur chargement config:', error.message);
      await this.resetToDefault();
    }
  }

  /**
   * Charge la configuration depuis le fichier
   */
  async loadConfig() {
    try {
      const configExists = await this.fileExists(this.configPath);
      
      if (!configExists) {
        console.log('📄 Création nouvelle configuration');
        await this.saveConfig(this.defaultConfig);
        this.config = { ...this.defaultConfig };
        return;
      }

      const data = await fs.readFile(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(data);
      
      // Merge avec la config par défaut pour gérer les nouvelles clés
      this.config = this.mergeWithDefault(loadedConfig);
      
      // Validation basique
      this.validateConfig();
      
    } catch (error) {
      console.warn('⚠️ Config corrompue, restauration backup');
      await this.restoreFromBackup();
    }
  }

  /**
   * Sauvegarde la configuration
   */
  async saveConfig(newConfig = null) {
    try {
      const configToSave = newConfig || this.config;
      
      // Backup avant sauvegarde
      if (await this.fileExists(this.configPath)) {
        await this.createBackup();
      }
      
      await fs.writeFile(
        this.configPath, 
        JSON.stringify(configToSave, null, 2), 
        'utf8'
      );
      
      if (newConfig) {
        this.config = { ...newConfig };
      }
      
      console.log('💾 Configuration sauvegardée');
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde config:', error.message);
      throw error;
    }
  }

  /**
   * Récupère une valeur de configuration
   */
  get(keyPath, defaultValue = null) {
    if (!this.config) {
      return defaultValue;
    }
    
    const keys = keyPath.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Définit une valeur de configuration
   */
  async set(keyPath, value) {
    if (!this.config) {
      this.config = { ...this.defaultConfig };
    }
    
    const keys = keyPath.split('.');
    let target = this.config;
    
    // Navigue jusqu'au dernier objet
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    // Définit la valeur finale
    target[keys[keys.length - 1]] = value;
    
    // Sauvegarde automatique
    await this.saveConfig();
  }

  /**
   * Met à jour plusieurs valeurs à la fois
   */
  async updateMultiple(updates) {
    if (!this.config) {
      this.config = { ...this.defaultConfig };
    }
    
    for (const [keyPath, value] of Object.entries(updates)) {
      const keys = keyPath.split('.');
      let target = this.config;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }
      
      target[keys[keys.length - 1]] = value;
    }
    
    await this.saveConfig();
  }

  /**
   * Remet la configuration par défaut
   */
  async resetToDefault() {
    this.config = { ...this.defaultConfig };
    await this.saveConfig();
    console.log('🔄 Configuration remise par défaut');
  }

  /**
   * Exporte la configuration
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Importe une configuration
   */
  async importConfig(configString) {
    try {
      const importedConfig = JSON.parse(configString);
      const mergedConfig = this.mergeWithDefault(importedConfig);
      
      await this.saveConfig(mergedConfig);
      console.log('📥 Configuration importée avec succès');
      
    } catch (error) {
      console.error('❌ Erreur import config:', error.message);
      throw new Error('Format de configuration invalide');
    }
  }

  // === MÉTHODES PRIVÉES ===

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async createBackup() {
    try {
      await fs.copyFile(this.configPath, this.backupPath);
    } catch (error) {
      console.warn('⚠️ Impossible de créer backup:', error.message);
    }
  }

  async restoreFromBackup() {
    try {
      const backupExists = await this.fileExists(this.backupPath);
      
      if (backupExists) {
        const backupData = await fs.readFile(this.backupPath, 'utf8');
        const backupConfig = JSON.parse(backupData);
        this.config = this.mergeWithDefault(backupConfig);
        await this.saveConfig();
        console.log('🔄 Configuration restaurée depuis backup');
      } else {
        throw new Error('Pas de backup disponible');
      }
      
    } catch (error) {
      console.warn('⚠️ Backup invalide, reset par défaut');
      await this.resetToDefault();
    }
  }

  mergeWithDefault(loadedConfig) {
    const merge = (defaultObj, loadedObj) => {
      const result = { ...defaultObj };
      
      for (const key in loadedObj) {
        if (loadedObj.hasOwnProperty(key)) {
          if (
            typeof defaultObj[key] === 'object' && 
            defaultObj[key] !== null && 
            !Array.isArray(defaultObj[key]) &&
            typeof loadedObj[key] === 'object' && 
            loadedObj[key] !== null && 
            !Array.isArray(loadedObj[key])
          ) {
            result[key] = merge(defaultObj[key], loadedObj[key]);
          } else {
            result[key] = loadedObj[key];
          }
        }
      }
      
      return result;
    };
    
    return merge(this.defaultConfig, loadedConfig);
  }

  validateConfig() {
    // Validation du port
    const port = this.get('server.port');
    if (typeof port !== 'number' || port < 1024 || port > 65535) {
      console.warn('⚠️ Port invalide, correction automatique');
      this.config.server.port = 8080;
    }
    
    // Validation fenêtre
    const width = this.get('window.width');
    const height = this.get('window.height');
    if (typeof width !== 'number' || width < 400) {
      this.config.window.width = 1200;
    }
    if (typeof height !== 'number' || height < 300) {
      this.config.window.height = 800;
    }
  }
}

module.exports = ConfigManager; 