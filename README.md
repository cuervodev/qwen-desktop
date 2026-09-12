# Qwen Desktop

A premium desktop application for [Qwen AI](https://chat.qwen.ai/) built with Electron. Access Qwen's powerful AI directly from your desktop with persistent login sessions.

## ✨ Features

- 🔐 **Persistent sessions** – Log in once, stay logged in forever (cookies saved automatically)
- 🖥️ **Native desktop experience** – Frameless window with custom title bar
- 🔔 **System tray** – Minimize to tray, always accessible
- 🌙 **Dark mode** – Native OS dark/light mode support  
- ⚡ **Single instance** – Only one window, always brought to focus
- 🔗 **External link handling** – Non-Qwen links open in your default browser
- 🧹 **Easy logout** – Clear session / log out from the menu
- 🔄 **Auto-updates** – Automatic background version checking and manual update installer from GitHub
- ⌨️ **Keyboard shortcuts** – Ctrl+N for new chat, Ctrl+Q to quit, and more

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- npm

### Install & Run

```bash
cd "Qwen Desktop"
npm install
npm start
```

### Build Installers

```bash
# Windows (.exe installer + portable)
npm run build:win

# macOS (.dmg)
npm run build:mac

# Linux (AppImage + .deb)
npm run build:linux
```

Built installers will be in the `dist/` folder.

## 📁 Project Structure

```
Qwen Desktop/
├── main.js          # Main Electron process
├── preload.js       # Secure bridge between renderer and main
├── updater.js       # Auto-update and version checking engine
├── version.json     # Application version metadata
├── CHANGELOG.md     # Release notes and history
├── package.json     # Project config & build settings
├── assets/
│   ├── icon.png     # App icon (PNG, 512×512 recommended)
│   ├── icon.ico     # Windows icon
│   └── tray-icon.png
└── dist/            # Built installers (after npm run build:*)
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New chat |
| `Ctrl+Q` | Quit |
| `Ctrl+R` | Reload |
| `Ctrl+Shift+I` | DevTools |
| `Ctrl++/-/0` | Zoom in/out/reset |
| `F11` | Fullscreen |

## 🔒 Privacy

All data (cookies, localStorage, cache) is stored locally in your OS user data directory. Nothing is sent anywhere except to Qwen's own servers.
