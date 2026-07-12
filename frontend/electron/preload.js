import { contextBridge, ipcRenderer } from 'electron';

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

contextBridge.exposeInMainWorld('electronAPI', Object.freeze({
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  saveFile: (options) => {
    assertObject(options, 'saveFile options');
    return ipcRenderer.invoke('dialog:saveFile', {
      defaultName: String(options.defaultName || '').slice(0, 128),
      dataUrl: String(options.dataUrl || ''),
    });
  },
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  showNotification: (options) => {
    assertObject(options, 'notification options');
    return ipcRenderer.invoke('notification:show', {
      title: String(options.title || '').slice(0, 80),
      body: String(options.body || '').slice(0, 240),
    });
  },
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', String(url)),
  onDeepLink: (callback) => {
    if (typeof callback !== 'function') throw new TypeError('callback must be a function');
    const listener = (_, url) => callback(String(url));
    ipcRenderer.on('deep-link', listener);
    return () => ipcRenderer.removeListener('deep-link', listener);
  },
  isElectron: true,
}));
