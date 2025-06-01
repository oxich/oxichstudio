# 🌐 User Guide - Network Features

**Simple guide** to using OxichStudio's network management and LAN sharing features.

---

## 🎯 **Quick Overview (30 Seconds)**

### **✨ What's New**
- ✅ **No configuration needed** - App detects everything automatically
- ✅ **Easy sharing** - Copy buttons for instant URL sharing  
- ✅ **Security guaranteed** - Full control over network access
- ✅ **Clear interface** - Everything in the "Server Access" section

### **🚀 How to Use**
1. **Launch app** → IPs are detected automatically
2. **Click 📋** → Copies IP or URL to clipboard
3. **Share** → Paste on other devices to access
4. **Secure** → Uncheck "Network access" to block LAN

---

## 🎛️ **"Server Access" Interface**

### **📍 Where to Find It**
In the desktop controller interface, **🌐 Server Access** section:

```
🌐 Server Access
┌─────────────────────────────────────────────┐
│ Local IP:     127.0.0.1              [📋]  │
│ Network IP:   192.168.1.100          [📋]  │  
│ Local URL:    http://127.0.0.1:8080  [📋]  │
│ Network URL:  http://192.168.1.100:8080[📋]│
└─────────────────────────────────────────────┘
```

### **📋 Copy Buttons**
Each line has a **📋** button:
- **Click** → Copies to clipboard
- **Green message** → Copy confirmation
- **No typing** → No typos possible!

---

## 🔒 **Network Access Control**

### **⚙️ "Allow network access (LAN)" Option**

| State | Meaning | Access Available |
|-------|---------|------------------|
| **☑️ Checked** | LAN enabled | ✅ Your machine + other network devices |
| **☐ Unchecked** | LAN disabled | ✅ Your machine only |

### **🔄 Automatic Change**
When you change this option:
1. **⚠️ Message** - "Restart required"
2. **🔄 Server** restarts automatically
3. **✅ Confirmation** - New configuration active

### **💡 Security Tip**
- **🏠 Personal use** → LAN disabled (safer)
- **👥 Family/office sharing** → LAN enabled temporarily
- **🎁 Client demo** → LAN enabled during presentation

---

## 📱 **Sharing with Mobile Devices**

### **📋 Quick Method**
1. **Enable** "Allow network access (LAN)"
2. **Click** 📋 next to "Network URL"
3. **Send** via message/email to your phone/tablet
4. **Open** the URL on mobile device

### **📲 Real Example**
```
You copy: http://192.168.1.100:8080
You send via WhatsApp to your phone
You open the link → App displays on mobile!
```

### **⚠️ Important**
- All devices must be on the **same WiFi**
- IP may change if you switch networks
- Disable LAN access when finished

---

## 🔍 **Understanding IP Addresses**

### **🏠 Local IP (127.0.0.1)**
- **Usage**: Your machine only
- **Security**: ✅ Always safe
- **Works**: Even without internet

### **🌐 Network IP (192.168.x.x)**
- **Usage**: Other devices on your network
- **Security**: ⚠️ Local to WiFi/Ethernet network
- **Requires**: Same WiFi network

### **📊 Family Network Example**
```
Your PC: 192.168.1.100
iPhone: 192.168.1.101  
iPad: 192.168.1.102
Tablet: 192.168.1.103

All can access: http://192.168.1.100:8080
```

---

## 🚨 **Troubleshooting**

### **❓ "No network IP detected"**
**Cause**: Not connected to WiFi/Ethernet  
**Solution**: 
1. Check internet connection
2. Connect to WiFi
3. Restart application

### **❓ "URL doesn't work on mobile"**
**Cause**: LAN disabled or different network  
**Solution**:
1. ✅ Check "Allow network access (LAN)"
2. ✅ Verify mobile on same WiFi
3. ✅ Re-copy exact URL with 📋

### **❓ "IP keeps changing"**
**Cause**: Automatic DHCP (normal)  
**Solution**: 
- ✅ Use 📋 buttons to copy current IP
- ✅ Re-copy if it changes
- ✅ Configure static IP on router (advanced)

### **❓ "Security error message"**
**Cause**: Antivirus or firewall  
**Solution**:
1. Allow application in firewall
2. Add antivirus exception
3. Use local IP (127.0.0.1) if urgent

---

## 🎯 **Common Use Cases**

### **💼 Work from Home**
```
Configuration: LAN disabled
Advantage: Maximum security
Usage: Personal development
```

### **👨‍👩‍👧‍👦 Family Sharing**
```
Configuration: LAN enabled temporarily
Usage: Show app on kids' tablet
Action: Copy network URL → Share → Disable LAN
```

### **🎁 Client Presentation**
```
Configuration: LAN enabled
Usage: Client tests on their phone during meeting
Advantage: Impressive interactive demo
```

### **🏢 Team Training**
```
Configuration: LAN enabled
Usage: Team tests simultaneously on their machines
Action: Share network URL at training start
```

---

## 🔄 **Migration from Previous Version**

### **📝 What Changes for You**
- **❌ No more "Hostname" field** → Automatic
- **❌ No more typing errors** → Automatic copying
- **✅ Clearer interface** → Dedicated section
- **✅ Enhanced security** → Real LAN control

### **🎯 Actions Needed**
**None!** 🎉
- ✅ Configuration automatically migrated
- ✅ Interface adapts automatically
- ✅ Your habits remain compatible

---

## ⚡ **Useful Shortcuts**

### **⌨️ Keyboard Shortcuts**
- **Ctrl+C** after IP selection → Manual copy
- **F12** → Technical debug (developers)
- **F5** → Refresh interface

### **🖱️ Mouse Shortcuts**
- **📋 Click** → Instant copy
- **Double-click IP** → Full selection
- **Right-click** → Context menu (browser dependent)

---

## 🆘 **Support and Help**

### **📚 Complete Documentation**
- **[🔧 Technical Guide](./NETWORK_GUIDE.md)** - For developers
- **[📝 Changelog](../reference/CHANGELOG.md)** - All changes
- **[📖 README](../../README.md)** - Overview

### **🔍 Debugging**
If problems persist:
1. **Note** the exact error displayed
2. **Check** logs section at bottom of interface
3. **Consult** technical documentation
4. **Restart** application as last resort

---

## 🎉 **Enjoy the New Features!**

These improvements make OxichStudio:
- **🚀 Faster** to configure
- **🔒 Safer** by default  
- **📱 Easier** to share
- **🎯 More intuitive** to use

**Don't hesitate to explore and test all the new possibilities!** ✨ 