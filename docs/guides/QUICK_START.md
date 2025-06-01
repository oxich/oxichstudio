# ⚡ Quick Start - 5 Minutes

**Get your standalone web server application running with OxichStudio in 5 minutes.**

---

## 🎯 **What You'll Build**

A **professional standalone web server** application with:
- ✅ Desktop control interface built with Electron
- ✅ Full Next.js development environment
- ✅ Integrated server management
- ✅ Single distributable application for end users

---

## 🚀 **5-Minute Setup**

### **Step 1: Install (2 minutes)**

```bash
# Clone OxichStudio
git clone https://github.com/yourusername/oxichstudio.git
cd oxichstudio
npm install
```

### **Step 2: Start Development (1 minute)**

```bash
# Start the Next.js development server
npm run dev
```

🎉 **Your development environment is running!**
- ✅ Next.js server at http://localhost:3000
- ✅ Hot reload enabled
- ✅ Standard web development workflow

### **Step 3: Test Desktop Controller (1 minute)**

```bash
# Test the desktop interface (in a new terminal)
npm run electron:dev
```

🎯 **OxichStudio desktop controller opens!**
- ✅ Native desktop control interface
- ✅ Server management dashboard
- ✅ Professional desktop experience

### **Step 4: Create Your Application (1 minute)**

Edit `src/app/page.tsx`:

```tsx
export default function MyServerApp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          My Standalone Web Server
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Built with OxichStudio - Professional Web Server Development Platform
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Server Dashboard</h2>
            <p className="text-gray-600">Your server management interface</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Application Features</h2>
            <p className="text-gray-600">Your custom web application</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Save the file** → See changes instantly!

---

## 💻 **Development Workflow**

### **Daily Development**
```bash
# Keep this running for web development
npm run dev
```
- Develop in `src/` folder like a normal Next.js app
- Use browser DevTools
- Hot reload works automatically
- Access at http://localhost:3000

### **Testing Desktop Controller**
```bash
# Test the desktop controller interface
npm run electron:dev
```
- Opens OxichStudio desktop controller
- Test server management features
- Verify user experience
- Close when done testing

### **Production Build**
```bash
# Create standalone server application
npm run build
```
- Creates executable in `dist/` folder
- Includes embedded web server
- Ready for end-user distribution

---

## 📁 **Project Structure**

**Focus on application development in `src/`:**

```
src/
├── app/
│   ├── page.tsx           # ← Your main application
│   ├── layout.tsx         # ← App layout
│   └── globals.css        # ← Application styling
├── components/            # ← Your React components
└── lib/                   # ← Utility functions
```

**OxichStudio system files (don't modify):**
- `electron/` - Desktop controller configuration
- `.next/` - Build cache
- `dist/` - Distribution files

---

## ⚙️ **Essential Commands**

| Command | Purpose | When to use |
|---------|---------|-------------|
| `npm run dev` | **Web development** | Daily development |
| `npm run electron:dev` | **Test controller** | Check desktop interface |
| `npm run build` | **Create application** | Ready for distribution |
| `npm run lint` | **Code quality** | Before committing |

---

## 🎨 **Customization**

### **Application Branding**
Edit `package.json`:
```json
{
  "name": "my-server-app",
  "productName": "My Business Server",
  "description": "Professional standalone web server application"
}
```

### **Development Features**
- Full Next.js 15.3.3 with App Router
- TypeScript and Tailwind CSS included
- React 19 with latest features
- Hot reload and fast refresh
- Professional build system

---

## 🚨 **Troubleshooting**

| Problem | Solution |
|---------|----------|
| **Port 3000 busy** | Stop other development servers |
| **Electron won't start** | Ensure `npm run dev` is running first |
| **Build fails** | Check for TypeScript errors in `src/` |
| **Empty desktop window** | Verify `src/app/page.tsx` exists |
| **Network access issues** | Check firewall settings |

---

## ✅ **Success Checklist**

- [ ] `npm install` completed without errors
- [ ] `npm run dev` opens http://localhost:3000
- [ ] You can edit `src/app/page.tsx` and see changes
- [ ] `npm run electron:dev` opens desktop controller
- [ ] Desktop interface shows server controls
- [ ] `npm run build` creates executable in `dist/`

---

## 🎯 **Next Steps**

1. **Develop your web application** - Edit files in `src/`
2. **Test regularly** - Use `npm run electron:dev`
3. **Customize branding** - Update `package.json`
4. **Build for production** - Use `npm run build`
5. **Distribute to users** - Share the standalone executable file

---

## 📚 **Learn More**

- [**User Guide**](./USER_GUIDE.md) - Complete feature overview
- [**Development Guide**](./DEVELOPMENT.md) - Advanced development
- [**Packaging Guide**](./PACKAGING.md) - Distribution options
- [**Troubleshooting**](./TROUBLESHOOTING.md) - Common issues

---

**🚀 Start building your standalone web server with OxichStudio!**
**Run `npm run dev` and edit `src/app/page.tsx` to begin.** 