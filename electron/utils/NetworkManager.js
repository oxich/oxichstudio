const net = require('net');
const os = require('os');

class NetworkManager {
  constructor() {
    this.preferredPorts = [8080, 3000, 9000, 5000, 8000];
    this.currentPort = null;
    this.localIP = null;
  }

  /**
   * Finds an available port
   */
  async findAvailablePort(startPort = 8080) {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(startPort, (err) => {
        if (err) {
          server.close();
          // Try next port
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
          // Port occupied, try next one
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
   * Checks if a specific port is available
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
   * Finds the best port among preferred ones
   */
  async findPreferredPort(configuredPort = null) {
    try {
      // Try configured port first
      if (configuredPort && await this.isPortAvailable(configuredPort)) {
        return configuredPort;
      }
      
      // Try preferred ports in order
      for (const port of this.preferredPorts) {
        if (await this.isPortAvailable(port)) {
          return port;
        }
      }
      
      // If no preferred port is available, search automatically
      return await this.findAvailablePort(8080);
      
    } catch (error) {
      console.error('❌ Port search error:', error);
      throw error;
    }
  }

  /**
   * Detects main local IP address (private network)
   */
  getLocalIPAddress() {
    try {
      const interfaces = os.networkInterfaces();
      
      // Priority to Ethernet/WiFi interfaces
      const priorityInterfaces = ['Ethernet', 'Wi-Fi', 'en0', 'eth0', 'wlan0'];
      
      // First, search in priority interfaces
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
      
      // Fallback: search in all interfaces (private IPs only)
      for (const interfaceName in interfaces) {
        const interfaceInfo = interfaces[interfaceName];
        for (const alias of interfaceInfo) {
          if (alias.family === 'IPv4' && !alias.internal && this.isPrivateIP(alias.address)) {
            this.localIP = alias.address;
            return alias.address;
          }
        }
      }
      
      // Last resort
      this.localIP = '127.0.0.1';
      return '127.0.0.1';
      
    } catch (error) {
      console.error('❌ Local IP detection error:', error);
      this.localIP = '127.0.0.1';
      return '127.0.0.1';
    }
  }

  /**
   * Gets all local IP addresses
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
      console.error('❌ IP enumeration error:', error);
      return [];
    }
  }

  /**
   * Tests network connectivity
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
   * Tests if server responds on a port
   */
  async testServerResponse(port, hostname = 'localhost') {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 2000);
      
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
   * Generates access URLs for local and network
   */
  generateAccessUrls(port, enableLan = false) {
    const localIP = this.getLocalIPAddress();
    
    const urls = {
      local: `http://127.0.0.1:${port}`,
      localIP: `http://${localIP}:${port}`,
      network: enableLan ? `http://${localIP}:${port}` : null
    };
    
    return urls;
  }

  /**
   * Checks if port requires admin privileges
   */
  requiresAdminPrivileges(port) {
    return port < 1024;
  }

  /**
   * Checks if an IP address is private (RFC 1918)
   */
  isPrivateIP(ip) {
    const parts = ip.split('.').map(Number);
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    
    return false;
  }

  /**
   * Gets complete network information with local/network distinction
   */
  getNetworkInfo(port, enableLan = false) {
    try {
      const localIP = this.getLocalIPAddress();
      const urls = this.generateAccessUrls(port, enableLan);
      
      return {
        port: port,
        localIP: localIP,
        networkIP: enableLan ? localIP : null,
        urls: urls,
        enableLan: enableLan,
        isPrivateNetwork: this.isPrivateIP(localIP),
        requiresAdmin: this.requiresAdminPrivileges(port),
        interfaces: this.getAllLocalIPs()
      };
      
    } catch (error) {
      console.error('❌ Network info error:', error);
      return {
        port: port,
        localIP: '127.0.0.1',
        networkIP: null,
        urls: {
          local: `http://127.0.0.1:${port}`,
          localIP: `http://127.0.0.1:${port}`,
          network: null
        },
        enableLan: false,
        isPrivateNetwork: true,
        requiresAdmin: this.requiresAdminPrivileges(port),
        interfaces: []
      };
    }
  }

  /**
   * Suggests alternative ports
   */
  async suggestAlternativePorts(currentPort, count = 3) {
    try {
      const alternatives = [];
      const basePort = currentPort || 8080;
      
      // Try ports around the current one
      for (let i = 1; i <= count * 2 && alternatives.length < count; i++) {
        const testPort = basePort + i;
        if (await this.isPortAvailable(testPort)) {
          alternatives.push(testPort);
        }
      }
      
      // If not enough found, try preferred ports
      if (alternatives.length < count) {
        for (const port of this.preferredPorts) {
          if (port !== currentPort && !alternatives.includes(port)) {
            if (await this.isPortAvailable(port)) {
              alternatives.push(port);
              if (alternatives.length >= count) break;
            }
          }
        }
      }
      
      return alternatives;
      
    } catch (error) {
      console.error('❌ Port suggestion error:', error);
      return [];
    }
  }

  /**
   * Checks Windows firewall status (approximate)
   */
  async checkFirewallStatus() {
    try {
      // Here we make an approximation based on connectivity
      const isConnected = await this.testNetworkConnectivity();
      
      return {
        enabled: !isConnected, // Very rough approximation
        blocking: !isConnected,
        recommendation: isConnected ? 
          'Network connectivity appears normal' : 
          'Check your network connection and firewall'
      };
      
    } catch (error) {
      return {
        enabled: true,
        blocking: true,
        recommendation: 'Unable to determine firewall status'
      };
    }
  }

  /**
   * Gets detailed network debug information
   */
  getNetworkDebugInfo() {
    try {
      const interfaces = os.networkInterfaces();
      const platform = os.platform();
      const hostname = os.hostname();
      
      const debug = {
        platform: platform,
        hostname: hostname,
        interfaces: {},
        summary: {
          totalInterfaces: 0,
          activeInterfaces: 0,
          privateIPs: [],
          publicIPs: []
        }
      };
      
      for (const [name, addresses] of Object.entries(interfaces)) {
        debug.interfaces[name] = addresses.map(addr => ({
          family: addr.family,
          address: addr.address,
          netmask: addr.netmask,
          internal: addr.internal,
          mac: addr.mac
        }));
        
        debug.summary.totalInterfaces++;
        
        const ipv4Addresses = addresses.filter(addr => addr.family === 'IPv4' && !addr.internal);
        if (ipv4Addresses.length > 0) {
          debug.summary.activeInterfaces++;
          
          ipv4Addresses.forEach(addr => {
            if (this.isPrivateIP(addr.address)) {
              debug.summary.privateIPs.push(addr.address);
            } else {
              debug.summary.publicIPs.push(addr.address);
            }
          });
        }
      }
      
      return debug;
      
    } catch (error) {
      return {
        error: error.message,
        platform: os.platform(),
        hostname: os.hostname()
      };
    }
  }

  /**
   * Finds multiple available ports
   */
  async findAvailablePorts(startPort, count = 5) {
    const ports = [];
    let currentPort = startPort;
    
    while (ports.length < count && currentPort < 65535) {
      if (await this.isPortAvailable(currentPort)) {
        ports.push(currentPort);
      }
      currentPort++;
    }
    
    return ports;
  }

  /**
   * Resets network information cache
   */
  refreshNetworkCache() {
    this.localIP = null;
    return this.getLocalIPAddress();
  }
}

module.exports = NetworkManager; 