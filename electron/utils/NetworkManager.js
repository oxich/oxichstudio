const net = require('net');
const os = require('os');

class NetworkManager {
  constructor() {
    this.preferredPorts = [8080, 3000, 9000, 5000, 8000];
    this.currentPort = null;
    this.localIP = null;
  }

  /**
   * Trouve un port disponible
   */
  async findAvailablePort(startPort = 8080) {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(startPort, (err) => {
        if (err) {
          server.close();
          // Essayer le port suivant
          this.findAvailablePort(startPort + 1)
            .then(resolve)
            .catch(reject);
        } else {
          const port = server.address().port;
          server.close(() => {
            resolve(port);
          });
        }
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          // Port occupé, essayer le suivant
          this.findAvailablePort(startPort + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Vérifie si un port spécifique est disponible
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, (err) => {
        if (err) {
          resolve(false);
        } else {
          server.close(() => {
            resolve(true);
          });
        }
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Trouve le meilleur port parmi les préférés
   */
  async findPreferredPort(configuredPort = null) {
    try {
      // Essayer d'abord le port configuré
      if (configuredPort && await this.isPortAvailable(configuredPort)) {
        return configuredPort;
      }
      
      // Essayer les ports préférés dans l'ordre
      for (const port of this.preferredPorts) {
        if (await this.isPortAvailable(port)) {
          return port;
        }
      }
      
      // Si aucun préféré n'est disponible, chercher automatiquement
      return await this.findAvailablePort(8080);
      
    } catch (error) {
      console.error('❌ Erreur recherche port:', error);
      throw error;
    }
  }

  /**
   * Détecte l'adresse IP locale principale (réseau privé)
   */
  getLocalIPAddress() {
    try {
      const interfaces = os.networkInterfaces();
      
      // Priorité aux interfaces Ethernet/WiFi
      const priorityInterfaces = ['Ethernet', 'Wi-Fi', 'en0', 'eth0', 'wlan0'];
      
      // D'abord, chercher dans les interfaces prioritaires
      for (const interfaceName of priorityInterfaces) {
        const interfaceInfo = interfaces[interfaceName];
        if (interfaceInfo) {
          for (const alias of interfaceInfo) {
            if (alias.family === 'IPv4' && !alias.internal && this.isPrivateIP(alias.address)) {
              this.localIP = alias.address;
              return alias.address;
            }
          }
        }
      }
      
      // Fallback : chercher dans toutes les interfaces (seulement IPs privées)
      for (const interfaceName in interfaces) {
        const interfaceInfo = interfaces[interfaceName];
        for (const alias of interfaceInfo) {
          if (alias.family === 'IPv4' && !alias.internal && this.isPrivateIP(alias.address)) {
            this.localIP = alias.address;
            return alias.address;
          }
        }
      }
      
      // Derniers recours
      this.localIP = '127.0.0.1';
      return '127.0.0.1';
      
    } catch (error) {
      console.error('❌ Erreur détection IP locale:', error);
      this.localIP = '127.0.0.1';
      return '127.0.0.1';
    }
  }

  /**
   * Obtient toutes les adresses IP locales
   */
  getAllLocalIPs() {
    try {
      const interfaces = os.networkInterfaces();
      const ips = [];
      
      for (const interfaceName in interfaces) {
        const interfaceInfo = interfaces[interfaceName];
        for (const alias of interfaceInfo) {
          if (alias.family === 'IPv4' && !alias.internal) {
            ips.push({
              interface: interfaceName,
              address: alias.address,
              netmask: alias.netmask
            });
          }
        }
      }
      
      return ips;
      
    } catch (error) {
      console.error('❌ Erreur énumération IPs:', error);
      return [];
    }
  }

  /**
   * Teste la connectivité réseau
   */
  async testNetworkConnectivity() {
    return new Promise((resolve) => {
      const timeout = 3000;
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);
      
      socket.connect(80, 'www.google.com', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  /**
   * Teste si le serveur répond sur un port
   */
  async testServerResponse(port, hostname = 'localhost') {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 2000;
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, timeout);
      
      socket.connect(port, hostname, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
  }

  /**
   * Génère les URLs d'accès
   */
  generateAccessUrls(port, enableLan = false) {
    const urls = {
      local: `http://localhost:${port}`,
      localhost: `http://127.0.0.1:${port}`
    };
    
    if (enableLan) {
      const localIP = this.getLocalIPAddress();
      if (localIP && localIP !== '127.0.0.1') {
        urls.lan = `http://${localIP}:${port}`;
      }
    }
    
    return urls;
  }

  /**
   * Détecte si le port nécessite des privilèges administrateur
   */
  requiresAdminPrivileges(port) {
    return port < 1024;
  }

  /**
   * Vérifie si une adresse IP est privée (RFC 1918)
   */
  isPrivateIP(ip) {
    try {
      const parts = ip.split('.').map(num => parseInt(num, 10));
      
      // Vérifications des plages privées RFC 1918
      return (
        // 10.0.0.0/8 (10.0.0.0 à 10.255.255.255)
        (parts[0] === 10) ||
        
        // 172.16.0.0/12 (172.16.0.0 à 172.31.255.255)
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        
        // 192.168.0.0/16 (192.168.0.0 à 192.168.255.255)
        (parts[0] === 192 && parts[1] === 168) ||
        
        // 169.254.0.0/16 (Link-local)
        (parts[0] === 169 && parts[1] === 254)
      );
    } catch (error) {
      console.error('❌ Erreur validation IP privée:', error);
      return false;
    }
  }

  /**
   * Obtient les informations réseau complètes avec distinction locale/réseau
   */
  getNetworkInfo(port, enableLan = false) {
    try {
      const networkInfo = {
        port: port,
        enableLan: enableLan,
        localIP: '127.0.0.1', // IP locale (loopback)
        networkIP: null, // IP réseau (LAN)
        urls: {
          local: `http://127.0.0.1:${port}`,
          network: null
        }
      };

      // Détecter l'IP réseau (LAN) privée
      const networkIP = this.getLocalIPAddress();
      if (networkIP && networkIP !== '127.0.0.1' && this.isPrivateIP(networkIP)) {
        networkInfo.networkIP = networkIP;
        networkInfo.urls.network = `http://${networkIP}:${port}`;
      }

      // URLs d'accès
      networkInfo.accessUrls = [];
      networkInfo.accessUrls.push({
        type: 'local',
        label: 'Accès Local',
        url: networkInfo.urls.local,
        description: 'Accessible uniquement sur cette machine'
      });

      if (networkInfo.networkIP && enableLan) {
        networkInfo.accessUrls.push({
          type: 'network',
          label: 'Accès Réseau',
          url: networkInfo.urls.network,
          description: 'Accessible depuis d\'autres appareils sur le réseau'
        });
      }

      return networkInfo;
      
    } catch (error) {
      console.error('❌ Erreur obtention info réseau:', error);
      return {
        port: port,
        enableLan: enableLan,
        localIP: '127.0.0.1',
        networkIP: null,
        urls: {
          local: `http://127.0.0.1:${port}`,
          network: null
        },
        accessUrls: [{
          type: 'local',
          label: 'Accès Local',
          url: `http://127.0.0.1:${port}`,
          description: 'Accessible uniquement sur cette machine'
        }]
      };
    }
  }

  /**
   * Suggestions de ports alternatifs
   */
  async suggestAlternativePorts(currentPort, count = 3) {
    const suggestions = [];
    let testPort = currentPort + 1;
    let attempts = 0;
    const maxAttempts = 50;
    
    while (suggestions.length < count && attempts < maxAttempts) {
      if (await this.isPortAvailable(testPort)) {
        suggestions.push(testPort);
      }
      testPort++;
      attempts++;
    }
    
    // Ajouter quelques ports préférés si pas assez de suggestions
    if (suggestions.length < count) {
      for (const port of this.preferredPorts) {
        if (port !== currentPort && !suggestions.includes(port)) {
          if (await this.isPortAvailable(port)) {
            suggestions.push(port);
            if (suggestions.length >= count) break;
          }
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Vérifie l'état du pare-feu Windows (approximatif)
   */
  async checkFirewallStatus() {
    // Note: Detection exacte nécessiterait des modules natifs
    // Ici on fait une approximation basée sur la connectivité
    try {
      const hasInternet = await this.testNetworkConnectivity();
      const localIPs = this.getAllLocalIPs();
      
      return {
        hasInternet,
        hasLocalNetwork: localIPs.length > 0,
        recommendation: hasInternet ? 
          'Le réseau semble fonctionnel' : 
          'Vérifiez votre connexion réseau et pare-feu'
      };
      
    } catch (error) {
      return {
        hasInternet: false,
        hasLocalNetwork: false,
        recommendation: 'Impossible de déterminer l\'état du réseau',
        error: error.message
      };
    }
  }

  /**
   * Obtient des informations de debug détaillées du réseau
   */
  getNetworkDebugInfo() {
    try {
      const interfaces = os.networkInterfaces();
      const debugInfo = {
        detected: {
          localIP: '127.0.0.1',
          networkIP: this.getLocalIPAddress(),
          allInterfaces: []
        },
        analysis: {
          hasPrivateNetwork: false,
          hasPublicNetwork: false,
          recommendedInterface: null
        }
      };

      // Analyser toutes les interfaces
      for (const [name, addresses] of Object.entries(interfaces)) {
        for (const addr of addresses) {
          if (addr.family === 'IPv4' && !addr.internal) {
            const interfaceInfo = {
              name: name,
              address: addr.address,
              netmask: addr.netmask,
              isPrivate: this.isPrivateIP(addr.address),
              type: this.isPrivateIP(addr.address) ? 'LAN' : 'WAN'
            };
            
            debugInfo.detected.allInterfaces.push(interfaceInfo);
            
            if (interfaceInfo.isPrivate) {
              debugInfo.analysis.hasPrivateNetwork = true;
              if (!debugInfo.analysis.recommendedInterface) {
                debugInfo.analysis.recommendedInterface = interfaceInfo;
              }
            } else {
              debugInfo.analysis.hasPublicNetwork = true;
            }
          }
        }
      }

      return debugInfo;
      
    } catch (error) {
      console.error('❌ Erreur debug réseau:', error);
      return {
        detected: {
          localIP: '127.0.0.1',
          networkIP: '127.0.0.1',
          allInterfaces: []
        },
        analysis: {
          hasPrivateNetwork: false,
          hasPublicNetwork: false,
          recommendedInterface: null
        }
      };
    }
  }

  /**
   * Réinitialise le cache des informations réseau
   */
  refreshNetworkCache() {
    this.localIP = null;
    this.currentPort = null;
  }
}

module.exports = NetworkManager; 