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
        language: 'en'
      },
      history: {
        recentPorts: [8080, 3000, 9000]
      }
    };
    this.config = null;
  }

  /**
   * Initializes and loads configuration
   */
  async initialize() {
    try {
      await this.loadConfig();
      console.log('✅ Configuration loaded:', this.configPath);
    } catch (error) {
      console.error('❌ Config loading error:', error.message);
      await this.resetToDefault();
    }
  }

  /**
   * Loads configuration from file
   */
  async loadConfig() {
    try {
      const configExists = await this.fileExists(this.configPath);
      
      if (!configExists) {
        console.log('📄 Creating new configuration');
        await this.saveConfig(this.defaultConfig);
        this.config = { ...this.defaultConfig };
        return;
      }

      const data = await fs.readFile(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(data);
      
      // Merge with default config to handle new keys
      this.config = this.mergeWithDefault(loadedConfig);
      
      // Basic validation
      this.validateConfig();
      
    } catch (error) {
      console.warn('⚠️ Corrupt config, restoring backup');
      await this.restoreFromBackup();
    }
  }

  /**
   * Saves configuration
   */
  async saveConfig(newConfig = null) {
    try {
      const configToSave = newConfig || this.config;
      
      // Backup before save
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
      
      console.log('💾 Configuration saved');
      
    } catch (error) {
      console.error('❌ Config save error:', error.message);
      throw error;
    }
  }

  /**
   * Gets a configuration value
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
   * Sets a configuration value
   */
  async set(keyPath, value) {
    if (!this.config) {
      this.config = { ...this.defaultConfig };
    }
    
    const keys = keyPath.split('.');
    let target = this.config;
    
    // Navigate to parent
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    // Set value
    const lastKey = keys[keys.length - 1];
    target[lastKey] = value;
    
    // Auto save
    await this.saveConfig();
  }

  /**
   * Updates multiple values at once
   */
  async updateMultiple(updates) {
    if (!this.config) {
      this.config = { ...this.defaultConfig };
    }
    
    for (const [keyPath, value] of Object.entries(updates)) {
      const keys = keyPath.split('.');
      let target = this.config;
      
      // Navigate to parent
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }
      
      // Set value
      const lastKey = keys[keys.length - 1];
      target[lastKey] = value;
    }
    
    await this.saveConfig();
  }

  /**
   * Resets configuration to default
   */
  async resetToDefault() {
    this.config = { ...this.defaultConfig };
    await this.saveConfig();
    console.log('🔄 Configuration reset to default');
  }

  /**
   * Exports configuration
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Imports configuration
   */
  async importConfig(configString) {
    try {
      const importedConfig = JSON.parse(configString);
      const mergedConfig = this.mergeWithDefault(importedConfig);
      
      await this.saveConfig(mergedConfig);
      console.log('📥 Configuration imported successfully');
      
    } catch (error) {
      console.error('❌ Config import error:', error.message);
      throw new Error('Invalid configuration format');
    }
  }

  // === PRIVATE METHODS ===

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
      console.warn('⚠️ Cannot create backup:', error.message);
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
        console.log('🔄 Configuration restored from backup');
      } else {
        throw new Error('No backup available');
      }
      
    } catch (error) {
      console.warn('⚠️ Invalid backup, resetting to default');
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
    // Port validation
    const port = this.get('server.port');
    if (typeof port !== 'number' || port < 1024 || port > 65535) {
      console.warn('⚠️ Invalid port, auto-correcting');
      this.config.server.port = 8080;
    }
    
    // Window validation
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