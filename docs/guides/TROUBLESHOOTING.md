# 🚨 Troubleshooting Guide

**Complete solutions** to common OxichStudio issues. Guide organized by category for quick diagnosis.

---

## 🔍 **Quick Diagnosis**

### **⚡ Startup Issues**
| Symptom | Probable Cause | Quick Solution |
|---------|----------------|----------------|
| **Module server.js not found** | Missing Next.js build | `npm run next:build` |
| **Port already in use** | Port conflict | Change PORT in `.env.local` |
| **Electron won't start** | Missing dependencies | `npm install` then `npm run build` |
| **White screen** | Assets not found | Check `public/` and rebuild |

### **🌐 Network Issues**
| Symptom | Probable Cause | Quick Solution |
|---------|----------------|----------------|
| **No LAN access** | Windows Firewall | Allow application in firewall |
| **IP not detected** | Inactive network interface | Check network connection |
| **Loop restart** | Corrupted configuration | Delete `config.json` |
| **Incorrect URLs** | Browser cache | Clear cache or use incognito mode |

---

## 🚀 **Startup Problems**

### **❌ Module server.js not found**

**Symptoms:**
- Error when launching Electron
- Message "Cannot find module server.js"
- Application won't start

**Diagnosis:**
```bash
# Check if standalone build exists
ls .next/standalone/server.js
```

**Solutions:**
```bash
# 1. Build Next.js in standalone mode
npm run next:build

# 2. If fails, clean and rebuild
rm -rf .next
npm run build

# 3. Check Next.js configuration
# In next.config.ts, ensure output: 'standalone' is present
```

### **❌ Port already in use**

**Symptoms:**
- Error "EADDRINUSE" or "Port already in use"
- Server won't start
- Control interface shows error

**Diagnosis:**
```bash
# Check which process uses the port
netstat -ano | findstr :3000
```

**Solutions:**
```bash
# 1. Change port in .env.local
echo "PORT=8080" >> .env.local

# 2. Or kill the process using the port
# Identify PID with netstat then:
taskkill /PID [PID_NUMBER] /F

# 3. Restart application
npm run electron:dev
```

### **❌ Electron won't start**

**Symptoms:**
- No window opens
- Process terminates immediately
- Console errors

**Diagnosis:**
```bash
# Check dependencies
npm ls electron

# Test in debug mode
npm run electron:dev
```

**Solutions:**
```bash
# 1. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 2. Check Node.js version
node --version  # Must be >= 22.16.0

# 3. Complete rebuild
npm run build
```

---

## 🌐 **Network Problems**

### **❌ No LAN access**

**Symptoms:**
- Application accessible on localhost only
- Other devices can't connect
- Connection timeout from network

**Diagnosis:**
```bash
# Check listening interface
netstat -an | findstr :3000

# Test network connectivity
ping [MACHINE_IP]
```

**Solutions:**

1. **Check Windows Firewall:**
   ```bash
   # Open Windows Firewall
   # Go to "Allow an app"
   # Add Electron executable
   ```

2. **Configure listening interface:**
   ```bash
   # In .env.local
   HOSTNAME=0.0.0.0  # Listen on all interfaces
   ```

3. **Check network configuration:**
   - Ensure "LAN access" option is enabled
   - Restart application after changes
   - Test with IP shown in interface

### **❌ IP detection fails**

**Symptoms:**
- Interface shows "IP not detected"
- Copy buttons unavailable
- LAN access impossible

**Diagnosis:**
```bash
# Check network interfaces
ipconfig /all

# Test connectivity
ping 8.8.8.8
```

**Solutions:**
```bash
# 1. Restart network interface
# Disable/enable network card in Windows

# 2. Check Internet connection
# Ensure active connection exists

# 3. Restart application
# Detection happens at startup
```

### **❌ Server loop restart**

**Symptoms:**
- Server constantly restarts
- Unstable interface
- Logs show start/stop cycles

**Diagnosis:**
- Check logs in control interface
- Identify recurring errors

**Solutions:**
```bash
# 1. Delete corrupted configuration
rm config.json

# 2. Reset settings
# Restart application with default settings

# 3. Check permissions
# Ensure app can write config.json
```

---

## 💻 **Development Issues**

### **❌ Hot reload not working**

**Symptoms:**
- Changes don't appear automatically
- Need manual refresh
- Development server issues

**Solutions:**
```bash
# 1. Restart development server
npm run dev

# 2. Check if port is correct
# Verify http://localhost:3000 is accessible

# 3. Clear browser cache
# Use Ctrl+F5 or incognito mode
```

### **❌ Build failures**

**Symptoms:**
- Build command fails
- TypeScript errors
- Missing dependencies

**Diagnosis:**
```bash
# Check for errors
npm run lint
npm run type-check

# Verify dependencies
npm audit
```

**Solutions:**
```bash
# 1. Fix linting errors
npm run lint:fix

# 2. Update dependencies
npm update

# 3. Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## 🎨 **Interface Issues**

### **❌ Control panel not loading**

**Symptoms:**
- Blank control panel
- Missing interface elements
- JavaScript errors

**Diagnosis:**
```bash
# Check Electron DevTools
# Look for console errors
# Verify file paths
```

**Solutions:**
```bash
# 1. Rebuild application
npm run build

# 2. Check file permissions
# Ensure electron/ folder is readable

# 3. Clear Electron cache
# Delete app data folder
```

### **❌ Styling issues**

**Symptoms:**
- Missing styles
- Layout problems
- CSS not loading

**Solutions:**
```bash
# 1. Check Tailwind CSS
npm run build

# 2. Verify CSS imports
# Check src/app/globals.css

# 3. Clear browser cache
```

---

## 🔧 **Configuration Issues**

### **❌ Settings not saving**

**Symptoms:**
- Configuration resets on restart
- Settings don't persist
- Permission errors

**Solutions:**
```bash
# 1. Check file permissions
# Ensure config.json is writable

# 2. Run as administrator
# If permission issues persist

# 3. Check disk space
# Ensure sufficient space for config files
```

### **❌ Environment variables not loading**

**Symptoms:**
- Default values used instead of custom
- .env.local ignored
- Configuration not applied

**Solutions:**
```bash
# 1. Check .env.local location
# Must be in project root

# 2. Verify variable names
# Check exact spelling and case

# 3. Restart application
# Changes require restart
```

---

## 🚨 **Critical Issues**

### **❌ Application crashes**

**Symptoms:**
- Sudden application termination
- Error dialogs
- Process exits unexpectedly

**Diagnosis:**
```bash
# Check logs
# Look in console output
# Check Windows Event Log
```

**Solutions:**
```bash
# 1. Run in debug mode
npm run electron:dev

# 2. Check system resources
# Memory and CPU usage

# 3. Update Electron
npm update electron
```

### **❌ Data corruption**

**Symptoms:**
- Strange behavior
- Corrupted configurations
- Unexpected errors

**Solutions:**
```bash
# 1. Reset configuration
rm config.json
rm -rf logs/

# 2. Clean reinstall
rm -rf node_modules .next dist
npm install
npm run build

# 3. Check system integrity
# Run Windows system file checker
sfc /scannow
```

---

## 🔄 **Recovery Procedures**

### **🆘 Complete Reset**

If all else fails, perform a complete reset:

```bash
# 1. Backup your src/ folder
cp -r src/ src_backup/

# 2. Clean everything
rm -rf node_modules package-lock.json .next dist
rm config.json logs/ -rf

# 3. Fresh install
npm install

# 4. Rebuild
npm run build

# 5. Test
npm run electron:dev
```

### **📋 Diagnostic Checklist**

Before asking for help, check:

- [ ] **Node.js version** >= 22.16.0
- [ ] **npm install** completed successfully  
- [ ] **npm run build** works without errors
- [ ] **Firewall** allows the application
- [ ] **Antivirus** not blocking files
- [ ] **Disk space** sufficient
- [ ] **Network connection** active

---

## 📞 **Getting Help**

### **🔍 Before Reporting Issues**

1. **Check this guide** for known solutions
2. **Try diagnostic steps** listed above
3. **Gather error messages** and logs
4. **Note system information** (OS, Node.js version)

### **📝 Reporting Issues**

When reporting issues, include:

- **Exact error message**
- **Steps to reproduce**
- **System information**
- **OxichStudio version**
- **What you tried already**

### **🔗 Quick Links**

- [User Guide](./USER_GUIDE.md) - Basic usage
- [Development Guide](./DEVELOPMENT.md) - Advanced development
- [Network Guide](./NETWORK_GUIDE.md) - Network configuration

---

**🎯 Most issues can be resolved with these solutions. Don't hesitate to consult the documentation!** 