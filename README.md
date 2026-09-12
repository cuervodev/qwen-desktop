# Qwen Desktop

A native **Windows desktop client for Qwen AI**, built with Electron.

Qwen Desktop brings the Qwen web experience directly to your Windows desktop, with persistent sessions, System Tray integration, keyboard shortcuts, automatic updates, and a clean native-style interface.

> **Unofficial project.** Qwen Desktop is not affiliated with or endorsed by Qwen or Alibaba.

---

## ✨ Features

* 🖥️ **Native Windows experience** — Frameless desktop window with a custom title bar.
* 🔐 **Persistent sessions** — Stay logged in between launches using locally stored cookies and session data.
* 🔔 **System Tray integration** — Minimize Qwen Desktop to the Windows system tray and keep it easily accessible.
* ⚡ **Single instance** — Prevents multiple instances from running at the same time.
* 🔗 **Smart link handling** — Qwen-related pages stay inside the application while external links open in your default browser.
* 🔄 **Automatic updates** — Detect new versions and install updates directly from GitHub.
* ⌨️ **Keyboard shortcuts** — Quickly create chats, reload the application, control zoom, open DevTools, and more.
* 🎨 **Custom UI** — Frameless window, custom controls, styled scrollbars, and a dark startup background.
* 🧹 **Easy logout** — Clear the local session and log out from the application.

---

## 🚀 Download

Download the latest **Windows installer** from the GitHub Releases section.

No separate Qwen installation is required.

---

## 🛠️ Development

### Requirements

* Windows
* Node.js 18+
* npm

### Install

```bash
git clone https://github.com/cuervodev/qwen-desktop.git
cd qwen-desktop
npm install
```

### Run

```bash
npm start
```

### Build

Create the Windows installer and portable build:

```bash
npm run build:win
```

The generated files will be available in the `dist/` directory.

---

## ⌨️ Keyboard Shortcuts

| Shortcut           | Action                |
| ------------------ | --------------------- |
| `Ctrl + N`         | New chat              |
| `Ctrl + Q`         | Quit application      |
| `Ctrl + R`         | Reload                |
| `Ctrl + Shift + I` | Open DevTools         |
| `Ctrl + + / - / 0` | Zoom in / out / reset |
| `F11`              | Toggle fullscreen     |

---

## 🔄 Automatic Updates

Qwen Desktop automatically checks for new releases when the application starts.

Updates can also be checked manually from:

**Help → Check for Updates...**

When a new version is available, Qwen Desktop provides a visual download and installation process.

Version information and release notes are managed through `version.json` and the project's GitHub releases.

---

## 🔒 Privacy

Qwen Desktop stores application session data locally on your Windows user account, including cookies, local storage, and cache required by the Qwen web experience.

Qwen Desktop does not provide its own AI backend or API. The application acts as a desktop client for Qwen's web services.

---

## 📁 Project Structure

```text
qwen-desktop/
├── main.js              # Main Electron process
├── preload.js           # Secure renderer/main bridge
├── updater.js           # Update and version checking
├── version.json         # Application version metadata
├── CHANGELOG.md         # Release history
├── package.json         # Project configuration
├── assets/
│   ├── icon.png         # Application icon
│   ├── icon.ico         # Windows icon
│   └── tray-icon.png    # System Tray icon
└── dist/                # Generated Windows builds
```

---

## 📋 Changelog

See [`CHANGELOG.md`](./CHANGELOG.md) for the complete release history.

---

## 🐛 Issues & Feature Requests

Found a bug or have an idea?

Open an issue in the GitHub repository and include as much information as possible, such as:

* Windows version
* Qwen Desktop version
* Steps to reproduce the issue
* Screenshots or error messages
* Expected vs. actual behavior

---

## 🤝 Contributing

Contributions, bug reports, and feature suggestions are welcome.

Before submitting a pull request:

1. Make sure the application starts correctly.
2. Test the affected functionality.
3. Keep changes focused and documented.
4. Update the changelog when appropriate.

---

## 📄 License

This project is licensed under the **MIT License**.

See [`LICENSE`](./LICENSE) for more information.

---

## ⭐ Support the Project

If you find Qwen Desktop useful, consider giving the repository a **Star ⭐** on GitHub.

It helps the project gain visibility and lets others discover it.

---

### Disclaimer

Qwen Desktop is an independent, unofficial desktop client.

Qwen Desktop is not affiliated with, sponsored by, or officially associated with Qwen or Alibaba.

Qwen and related trademarks belong to their respective owners.
