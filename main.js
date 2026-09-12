const {
  app,
  BrowserWindow,
  Menu,
  shell,
  ipcMain,
  nativeTheme,
  Tray,
  nativeImage,
  dialog,
  session
} = require('electron');
const path = require('path');
const os = require('os');
const { checkForUpdates, getLocalVersion } = require('./updater');

// ─── Windows GPU / cache permission fixes ────────────────────────────────────
// Must be called BEFORE app.whenReady()
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-program-cache');
app.commandLine.appendSwitch('disk-cache-size', '0');
app.commandLine.appendSwitch('no-sandbox');
// Suppress verbose Chromium logs on Windows
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Keep a global reference to avoid garbage collection
let mainWindow;
let tray;
let isQuitting = false;

function createMainWindow() {
  // Use a persistent session so cookies/localStorage are saved between launches
  const ses = session.fromPartition('persist:qwen', { cache: true });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Qwen Desktop',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    backgroundColor: '#0d0d0d',
    show: false,
    frame: false,         // Custom frameless window for a premium look
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      session: ses,
      spellcheck: true,
    },
  });

  // Load Qwen chat
  mainWindow.loadURL('https://chat.qwen.ai/', {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  });

  // Show the window once it's ready (avoids white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Inject title bar + CSS on every page load
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.insertCSS(getCustomCSS());
    mainWindow.webContents.executeJavaScript(getTitleBarScript());
  });

  // Handle new-window / link opens → open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('https://chat.qwen.ai') && !url.startsWith('https://qwen.ai')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Intercept navigation that leaves Qwen
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const qwenHosts = ['chat.qwen.ai', 'qwen.ai', 'tongyi.aliyun.com'];
    const urlObj = new URL(url);
    if (!qwenHosts.some(h => urlObj.hostname.endsWith(h))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Page title → window title
  mainWindow.webContents.on('page-title-updated', (event, title) => {
    mainWindow.setTitle(title || 'Qwen Desktop');
  });

  // Prevent app from closing when user clicks X; hide to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
  createTray();

  // Comprobar actualizaciones automáticamente en segundo plano tras iniciar
  setTimeout(() => {
    checkForUpdates({ silent: true, parentWindow: mainWindow });
  }, 3500);
}

// ─── Custom CSS injected into the Qwen web page ──────────────────────────────
function getCustomCSS() {
  return `
    /* Smooth scrolling everywhere */
    * { scroll-behavior: smooth; }

    /* Thin custom scrollbars */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.5); }

    /* Push page content below our custom title bar */
    #qwen-titlebar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 36px;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 0 14px;
      background: rgba(15, 15, 15, 0.88);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      -webkit-app-region: drag;
      user-select: none;
      box-sizing: border-box;
    }
    #qwen-titlebar .tb-title {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      letter-spacing: 0.03em;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    #qwen-titlebar .tb-title svg {
      opacity: 0.85;
    }
    #qwen-titlebar .tb-controls {
      display: flex;
      align-items: center;
      gap: 0;
      -webkit-app-region: no-drag;
      height: 36px;
    }
    #qwen-titlebar .tb-btn {
      width: 46px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      color: rgba(255,255,255,0.7);
      transition: background 0.15s ease, color 0.15s ease;
      outline: none;
    }
    #qwen-titlebar .tb-btn:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,1);
    }
    #qwen-titlebar .tb-btn.tb-close:hover {
      background: #e81123;
      color: #fff;
    }
    #qwen-titlebar .tb-btn svg {
      width: 11px;
      height: 11px;
      fill: currentColor;
    }
    /* Offset the Qwen page content so it doesn't hide under the bar */
    body { padding-top: 36px !important; }
  `;
}

// ─── Title bar injection script ───────────────────────────────────────────────
function getTitleBarScript() {
  return `
    (function() {
      // Remove any existing bar (handles page navigations)
      const existing = document.getElementById('qwen-titlebar');
      if (existing) existing.remove();

      const bar = document.createElement('div');
      bar.id = 'qwen-titlebar';
      bar.innerHTML = \`
        <div class="tb-title">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#00B4D8" stroke-width="2"/>
            <path d="M8 12a4 4 0 0 1 8 0" stroke="#7C3AED" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Qwen Desktop
        </div>
        <div class="tb-controls">
          <button class="tb-btn tb-min" title="Minimizar">
            <svg viewBox="0 0 11 11"><rect y="5" width="11" height="1"/></svg>
          </button>
          <button class="tb-btn tb-max" title="Maximizar / Restaurar">
            <svg viewBox="0 0 11 11"><rect x="0.5" y="0.5" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1"/></svg>
          </button>
          <button class="tb-btn tb-close" title="Cerrar">
            <svg viewBox="0 0 11 11"><line x1="0" y1="0" x2="11" y2="11" stroke="currentColor" stroke-width="1.3"/><line x1="11" y1="0" x2="0" y2="11" stroke="currentColor" stroke-width="1.3"/></svg>
          </button>
        </div>
      \`;

      document.documentElement.prepend(bar);

      bar.querySelector('.tb-min').addEventListener('click', () => {
        window.qwenDesktop.minimize();
      });
      bar.querySelector('.tb-max').addEventListener('click', () => {
        window.qwenDesktop.maximize();
      });
      bar.querySelector('.tb-close').addEventListener('click', () => {
        window.qwenDesktop.close();
      });
    })();
  `;
}

// ─── Application menu ────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'Qwen',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.loadURL('https://chat.qwen.ai/'),
        },
        { type: 'separator' },
        {
          label: 'Clear Session & Log Out',
          click: async () => {
            const { response } = await dialog.showMessageBox(mainWindow, {
              type: 'question',
              buttons: ['Cancel', 'Clear & Log Out'],
              defaultId: 0,
              title: 'Clear Session',
              message: 'This will clear all cookies and log you out of Qwen.',
            });
            if (response === 1) {
              const ses = session.fromPartition('persist:qwen');
              await ses.clearStorageData();
              await ses.clearCache();
              mainWindow.loadURL('https://chat.qwen.ai/');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Quit Qwen Desktop',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        {
          label: 'Toggle DevTools',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle Dark/Light Mode',
          click: () => {
            nativeTheme.themeSource =
              nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
          },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        {
          label: 'Always on Top',
          type: 'checkbox',
          checked: false,
          click: (item) => mainWindow?.setAlwaysOnTop(item.checked),
        },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => checkForUpdates({ silent: false, parentWindow: mainWindow }),
        },
        {
          label: 'Changelog',
          click: () => shell.openExternal('https://github.com/cuervodev/qwen-desktop/blob/main/CHANGELOG.md'),
        },
        { type: 'separator' },
        {
          label: 'Visit Qwen Website',
          click: () => shell.openExternal('https://qwen.ai/'),
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/cuervodev/qwen-desktop/issues'),
        },
        { type: 'separator' },
        {
          label: 'About Qwen Desktop',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Qwen Desktop',
              message: `Qwen Desktop v${getLocalVersion()}`,
              detail: 'Desktop application for Qwen AI with persistent sessions.\n\nDeveloped by CuervoDev\nLicensed under MIT.',
              buttons: ['OK', 'GitHub Repository'],
              defaultId: 0,
            }).then(({ response }) => {
              if (response === 1) {
                shell.openExternal('https://github.com/cuervodev/qwen-desktop');
              }
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── System Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Qwen Desktop',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'New Chat',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.loadURL('https://chat.qwen.ai/');
      },
    },
    {
      label: 'Check for Updates...',
      click: () => checkForUpdates({ silent: false, parentWindow: mainWindow }),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Qwen Desktop');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.focus();
    } else {
      mainWindow?.show();
    }
  });
}

// ─── IPC handlers for the custom title bar ───────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.hide());

// ─── Single instance lock ────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(createMainWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  else mainWindow?.show();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
});
