# 🚀 OxichStudio

**Professional Standalone Web Server Development Platform**

Create powerful standalone web server applications with desktop control interface. Develop with Next.js, deploy as native desktop applications with embedded server.

---

## 🎯 **What is OxichStudio?**

OxichStudio enables you to:
- **🔧 Develop** web applications using Next.js (standard workflow)
- **🖥️ Control** via professional desktop interface built with Electron
- **📦 Deploy** as standalone executables with embedded web server
- **🌐 Share** on local networks with intelligent IP detection
- **⚡ Deliver** to end users as single standalone executable files

**Perfect for:** Business applications, local servers, development tools, network utilities

---

## ⚡ **Quick Start**

```bash
# Clone OxichStudio
git clone https://github.com/oxich/oxichstudio.git
cd oxichstudio
npm install

# Start development
npm run dev            # Next.js development server
npm run electron:dev   # Test desktop controller

# Build for production
npm run build          # Create standalone executable for distribution
```

**🎉 Ready!** Develop in `src/` like any Next.js app, test with desktop controller, then distribute.

---

## 🏗️ **Development Workflow**

### **📂 Focus Area: `src/` Directory**

```
src/
├── app/
│   ├── page.tsx         # ← Your main application
│   ├── layout.tsx       # ← App layout  
│   └── globals.css      # ← Your styles
└── components/          # ← Your React components
```

**Develop exactly like a normal Next.js application!**

### **📦 Build Process**

```bash
# Development: Next.js with hot reload
npm run dev

# Testing: Desktop controller interface  
npm run electron:dev

# Production: Standalone executable
npm run build
# → Creates distributable standalone executable in dist/
```

---

## 🚀 **Key Features**

### **🎨 For Developers**
- **Next.js 15.3.3** with App Router and React 19
- **TypeScript** and **Tailwind CSS** pre-configured
- **Hot reload** synchronized between Electron and Next.js
- **Automated build** from Next.js standalone to Electron

### **👤 For End Users**
- **Native Windows desktop** application
- **Integrated control panel** with server management
- **Smart network access** (automatic LAN/localhost detection)
- **Fast startup** (<5 seconds), low memory usage (<200MB)

### **🌐 Advanced Network Management**
- **Automatic IP detection** with LAN/WAN classification
- **Dynamic network configuration** based on environment
- **Modern control interface** for non-technical users
- **Easy network sharing** with one-click URL copying

---

## 📚 **Documentation**

### **👤 For Users**

| Step | Guide | Description |
|------|-------|-------------|
| **1. Start** | [Quick Start](./docs/guides/QUICK_START.md) | Installation and first launch |
| **2. Learn** | [User Guide](./docs/guides/USER_GUIDE.md) | Interface and features |
| **3. Fix** | [Troubleshooting](./docs/guides/TROUBLESHOOTING.md) | Common issues and solutions |

### **📖 Complete Documentation**
👉 **[Documentation Hub](./docs/README.md)** - All user guides and references

---

## ⚙️ **Configuration**

### **🏷️ Customize Your Application**
```json
// package.json
{
  "name": "your-app-name",
  "productName": "Your Application Name",
  "description": "Your application description"
}
```

### **🌍 Network Settings**
```bash
# .env.local
PORT=3000              # Your application port
HOSTNAME=127.0.0.1     # Listening interface
ELECTRON_DEBUG=false   # Debug mode
```

---

## 📊 **Use Cases**

### **🏢 Business Applications**
- Enterprise dashboards
- Internal management tools
- Monitoring applications
- Admin interfaces

### **🌐 Network Applications**
- Local servers with web interface
- Development tools
- File sharing applications
- Network configuration tools

### **💻 Desktop Applications**
- Convert web apps to desktop apps
- Browser-free distribution
- Control interface for non-technical users

---

## 🚨 **Quick Troubleshooting**

| Problem | Solution |
|---------|----------|
| **"Module server.js not found"** | Run `npm run next:build` first |
| **Port already in use** | Change `PORT` in `.env.local` |
| **App won't start** | Verify Next.js build completed |
| **No network access** | Check firewall settings |

👉 **[Complete Troubleshooting Guide](./docs/guides/TROUBLESHOOTING.md)**

---

## 🤝 **Support & Community**

### **🆘 Get Help**
1. Check [Documentation](./docs/README.md)
2. Review [Troubleshooting](./docs/guides/TROUBLESHOOTING.md)
3. Create an [Issue](../../issues) with details

### **🚀 Contribute**
Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 **License**

MIT License - See [LICENSE](./LICENSE) for details.

---

**🎯 Build professional standalone web server applications with OxichStudio!**
