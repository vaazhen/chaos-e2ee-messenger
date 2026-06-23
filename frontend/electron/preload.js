import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),

  saveFile: (opts) => ipcRenderer.invoke('dialog:saveFile', opts),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  showNotification: ({ title, body }) => {
    ipcRenderer.invoke('notification:show', { title, body });
  },

  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  onDeepLink: (callback) => {
    ipcRenderer.on('deep-link', (_, url) => callback(url));
  },
});
