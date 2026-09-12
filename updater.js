let electron;
try {
  electron = require('electron');
} catch (e) {
  electron = {};
}
const { app = {}, dialog = {}, shell = {}, BrowserWindow = {} } = electron;
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const REPO_OWNER = 'cuervodev';
const REPO_NAME = 'qwen-desktop';
const RAW_VERSION_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/version.json`;
const GITHUB_RELEASES_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const GITHUB_RELEASES_PAGE = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

let isChecking = false;
let isDownloading = false;

/**
 * Obtiene la versión actual local instalada.
 */
function getLocalVersion() {
  try {
    const versionFilePath = path.join(__dirname, 'version.json');
    if (fs.existsSync(versionFilePath)) {
      const data = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'));
      if (data.version) return data.version;
    }
  } catch (err) {
    console.warn('[Updater] No se pudo leer version.json local:', err.message);
  }
  return app.getVersion();
}

/**
 * Compara dos cadenas de versión semántica (ej. '1.0.1' y '1.0.0').
 * Devuelve 1 si v1 > v2, -1 si v1 < v2, y 0 si son iguales.
 */
function compareVersions(v1, v2) {
  const clean1 = (v1 || '').replace(/^v/, '').trim();
  const clean2 = (v2 || '').replace(/^v/, '').trim();

  const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0);

  const length = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < length; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Consulta la versión remota más reciente desde GitHub.
 */
async function fetchRemoteVersionInfo() {
  let remoteInfo = null;

  // 1. Intentar consultar version.json remoto
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(RAW_VERSION_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': `${REPO_NAME}-updater` },
    });
    clearTimeout(timeout);

    if (res.ok) {
      remoteInfo = await res.json();
    }
  } catch (e) {
    console.log('[Updater] Consulta a version.json fallida o pendiente, verificando Releases API...');
  }

  // 2. Consultar GitHub Releases API para obtener la versión oficial y los assets binarios
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(GITHUB_RELEASES_API, {
      signal: controller.signal,
      headers: {
        'User-Agent': `${REPO_NAME}-updater`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const release = await res.json();
      const releaseVersion = (release.tag_name || release.name || '').replace(/^v/, '').trim();

      if (!remoteInfo) {
        remoteInfo = {
          version: releaseVersion,
          releaseNotes: release.body || '',
          downloadUrl: release.html_url || GITHUB_RELEASES_PAGE,
        };
      } else {
        // Enriquecer remoteInfo con datos de la release
        remoteInfo.releaseNotes = remoteInfo.releaseNotes || release.body || '';
        remoteInfo.downloadUrl = release.html_url || remoteInfo.downloadUrl || GITHUB_RELEASES_PAGE;
      }

      remoteInfo.assets = release.assets || [];
    }
  } catch (e) {
    console.warn('[Updater] No se pudo consultar GitHub Releases API:', e.message);
  }

  return remoteInfo;
}

/**
 * Encuentra el asset adecuado para la plataforma actual (Windows, Mac, Linux).
 */
function findPlatformAsset(assets) {
  if (!assets || !Array.isArray(assets) || assets.length === 0) return null;

  if (process.platform === 'win32') {
    // Preferir instalador setup .exe, luego cualquier .exe
    return (
      assets.find(a => /setup.*\.exe$/i.test(a.name)) ||
      assets.find(a => /\.exe$/i.test(a.name)) ||
      null
    );
  } else if (process.platform === 'darwin') {
    return assets.find(a => /\.dmg$/i.test(a.name)) || null;
  } else if (process.platform === 'linux') {
    return (
      assets.find(a => /\.AppImage$/i.test(a.name)) ||
      assets.find(a => /\.deb$/i.test(a.name)) ||
      null
    );
  }
  return null;
}

/**
 * Crea una ventana moderna y elegante para mostrar el progreso de descarga.
 */
function createDownloadProgressWindow(parentWindow, versionName) {
  const win = new BrowserWindow({
    width: 460,
    height: 190,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    show: false,
    modal: !!parentWindow,
    parent: parentWindow || undefined,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #0f0f11;
          color: #f3f4f6;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .icon {
          width: 22px;
          height: 22px;
          color: #00B4D8;
        }
        .title {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .progress-wrapper {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .progress-bar {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #00B4D8, #7C3AED);
          transition: width 0.15s ease;
          border-radius: 4px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: rgba(255,255,255,0.6);
        }
      </style>
    </head>
    <body>
      <div class="header">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span class="title">Descargando Qwen Desktop v${versionName}...</span>
      </div>
      <div class="progress-wrapper">
        <div id="bar" class="progress-bar"></div>
      </div>
      <div class="footer">
        <span id="status">Iniciando descarga...</span>
        <span id="percent">0%</span>
      </div>
      <script>
        window.updateProgress = function(percent, statusText) {
          const bar = document.getElementById('bar');
          const p = document.getElementById('percent');
          const s = document.getElementById('status');
          if (bar) bar.style.width = percent + '%';
          if (p) p.innerText = percent + '%';
          if (s && statusText) s.innerText = statusText;
        };
      </script>
    </body>
    </html>
  `;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  win.once('ready-to-show', () => win.show());
  return win;
}

/**
 * Descarga el archivo de actualización y ejecuta el instalador.
 */
async function downloadAndInstallUpdate(asset, versionName, parentWindow) {
  if (isDownloading) return;
  isDownloading = true;

  const downloadUrl = asset.browser_download_url;
  const fileName = asset.name || `Qwen-Desktop-Setup-${versionName}.exe`;
  const destPath = path.join(os.tmpdir(), fileName);

  const progressWin = createDownloadProgressWindow(parentWindow, versionName);

  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const totalBytes = parseInt(res.headers.get('content-length'), 10) || 0;
    let receivedBytes = 0;

    const fileStream = fs.createWriteStream(destPath);
    const reader = res.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.length;
      fileStream.write(Buffer.from(value));

      if (totalBytes > 0 && progressWin && !progressWin.isDestroyed()) {
        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        const receivedMb = (receivedBytes / (1024 * 1024)).toFixed(1);
        const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
        const text = `${receivedMb} MB de ${totalMb} MB`;
        progressWin.webContents.executeJavaScript(
          `if (window.updateProgress) window.updateProgress(${percent}, ${JSON.stringify(text)});`
        ).catch(() => {});
      }
    }

    await new Promise((resolve, reject) => {
      fileStream.end();
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    if (progressWin && !progressWin.isDestroyed()) {
      progressWin.close();
    }

    // Notificar al usuario e instalar
    const { response } = await dialog.showMessageBox(parentWindow || null, {
      type: 'info',
      title: 'Actualización lista',
      message: `La versión v${versionName} de Qwen Desktop se ha descargado correctamente.`,
      detail: 'La aplicación se cerrará ahora para iniciar la instalación.',
      buttons: ['Instalar y Reiniciar', 'Instalar más tarde'],
      defaultId: 0,
    });

    if (response === 0) {
      if (process.platform === 'win32') {
        spawn(destPath, [], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      } else {
        shell.openPath(destPath);
      }
      app.isQuitting = true;
      app.quit();
    }
  } catch (err) {
    if (progressWin && !progressWin.isDestroyed()) {
      progressWin.close();
    }
    console.error('[Updater] Error durante la descarga:', err);
    dialog.showMessageBox(parentWindow || null, {
      type: 'error',
      title: 'Error de descarga',
      message: 'No se pudo completar la descarga automática.',
      detail: `${err.message}\n\nPuedes descargar la actualización directamente desde GitHub.`,
      buttons: ['Abrir página de descarga', 'Cerrar'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        shell.openExternal(GITHUB_RELEASES_PAGE);
      }
    });
  } finally {
    isDownloading = false;
  }
}

/**
 * Comprueba si hay actualizaciones disponibles.
 * @param {Object} options
 * @param {boolean} options.silent - Si es true, no muestra diálogo cuando no hay actualizaciones.
 * @param {BrowserWindow} options.parentWindow - Ventana padre para diálogos modales.
 */
async function checkForUpdates({ silent = true, parentWindow = null } = {}) {
  if (isChecking || isDownloading) return;
  isChecking = true;

  try {
    const localVersion = getLocalVersion();
    const remoteInfo = await fetchRemoteVersionInfo();

    if (!remoteInfo || !remoteInfo.version) {
      if (!silent) {
        await dialog.showMessageBox(parentWindow || null, {
          type: 'info',
          title: 'Qwen Desktop',
          message: 'No se pudo obtener información sobre nuevas actualizaciones.',
          detail: 'Por favor, comprueba tu conexión a internet e inténtalo más tarde.',
          buttons: ['Aceptar'],
        });
      }
      return;
    }

    const hasUpdate = compareVersions(remoteInfo.version, localVersion) > 0;

    if (hasUpdate) {
      const asset = findPlatformAsset(remoteInfo.assets);
      const notes = remoteInfo.releaseNotes ? `\n\nNovedades:\n${remoteInfo.releaseNotes.substring(0, 300)}...` : '';

      const { response } = await dialog.showMessageBox(parentWindow || null, {
        type: 'info',
        title: 'Actualización disponible',
        message: `¡Hay una nueva versión disponible de Qwen Desktop (v${remoteInfo.version})!`,
        detail: `Tu versión actual es v${localVersion}.${notes}\n\n¿Deseas descargar e instalar la actualización?`,
        buttons: ['Actualizar ahora', 'Ver notas en GitHub', 'Más tarde'],
        defaultId: 0,
        cancelId: 2,
      });

      if (response === 0) {
        if (asset) {
          await downloadAndInstallUpdate(asset, remoteInfo.version, parentWindow);
        } else {
          // Si no hay asset binario directo, abrir la página de release
          shell.openExternal(remoteInfo.downloadUrl || GITHUB_RELEASES_PAGE);
        }
      } else if (response === 1) {
        shell.openExternal(remoteInfo.downloadUrl || GITHUB_RELEASES_PAGE);
      }
    } else {
      if (!silent) {
        await dialog.showMessageBox(parentWindow || null, {
          type: 'info',
          title: 'Qwen Desktop al día',
          message: `Tienes instalada la versión más reciente (v${localVersion}).`,
          detail: 'No hay nuevas actualizaciones disponibles en este momento.',
          buttons: ['Aceptar'],
        });
      }
    }
  } catch (err) {
    console.error('[Updater] Error al comprobar actualizaciones:', err);
    if (!silent) {
      await dialog.showMessageBox(parentWindow || null, {
        type: 'error',
        title: 'Error de comprobación',
        message: 'Ocurrió un error al verificar actualizaciones.',
        detail: err.message,
        buttons: ['Aceptar'],
      });
    }
  } finally {
    isChecking = false;
  }
}

module.exports = {
  checkForUpdates,
  getLocalVersion,
  compareVersions,
};
