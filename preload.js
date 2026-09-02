const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('qwenDesktop', {
  // Window controls for the custom title bar
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Platform info
  platform: process.platform,
});
