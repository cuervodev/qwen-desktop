# Changelog - Qwen Desktop

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.1] - 2026-09-12

### 🚀 Added

* **Automatic Update System**:

  * Automatic detection of new versions when the application starts by comparing `version.json` with the GitHub repository (`cuervodev/qwen-desktop`).
  * Assisted download and installation with a real-time visual progress window.
  * Manual update checks from the top menu (**Help > Check for Updates...**) and from the System Tray menu.

* **"About Qwen Desktop" Dialog**:

  * Displays the current version, author, repository, and help shortcuts.

* **CHANGELOG Shortcut**:

  * Direct link in the Help menu to view the changes and updates for each version.

* **Dedicated Version File**:

  * Added `version.json` to facilitate remote version checking and release notes retrieval.

### 🔧 Changed and Fixed

* **Issue Report Link**:

  * Fixed the *Report Issue* link to redirect directly to the official issue tracker: [GitHub Issues](https://github.com/cuervodev/qwen-desktop/issues) (previously redirected to the GitHub root).

* **Publishing Configuration**:

  * Added the GitHub publishing configuration to `package.json` for automated builds with `electron-builder`.

---

## [1.0.0] - 2026-09-02

### 🎉 Initial Release

* **Native Desktop Experience**:

  * Frameless window with a custom title bar and *glassmorphism* effect.
  * Integrated Minimize, Maximize/Restore, and Close controls.
  * Minimum window size set to 900×600 to ensure optimal usability.

* **Persistent Sessions**:

  * Persistent login with cookies and local cache stored in an isolated partition (`persist:qwen`).

* **System Tray**:

  * Minimize to the system tray when closing the main window.
  * Quick context menu to open the window, start a new chat, or quit the application.

* **Single Instance Lock**:

  * Prevents multiple instances from running and restores/focuses the existing window when reopening the app.

* **Smart External Link Handling**:

  * Internal navigation contained within the app for Qwen services (`chat.qwen.ai`, `qwen.ai`, `tongyi.aliyun.com`).
  * External links are automatically opened in the system's default browser.

* **Keyboard Shortcuts**:

  * `Ctrl+N`: New chat
  * `Ctrl+Q`: Quit application
  * `Ctrl+R`: Reload page
  * `Ctrl+Shift+I`: Open Developer Tools (DevTools)
  * `Ctrl + / - / 0`: Zoom controls
  * `F11`: Fullscreen

* **Custom Visual Styles**:

  * Slim, stylized scrollbars.
  * Dark startup background to prevent a white flash during the initial loading phase.
