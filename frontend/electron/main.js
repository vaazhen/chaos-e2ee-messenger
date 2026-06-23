import { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain, Notification, shell } from 'electron';
import { join, dirname } from 'node:path';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const DIST = join(__dirname, '..', 'dist');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const WINDOW_STATE_FILE = join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    if (existsSync(WINDOW_STATE_FILE)) {
      return JSON.parse(readFileSync(WINDOW_STATE_FILE, 'utf-8'));
    }
  } catch {}
  return { width: 1200, height: 800 };
}

function saveWindowState() {
  if (!mainWindow) return;
  try {
    const bounds = mainWindow.getBounds();
    writeFileSync(WINDOW_STATE_FILE, JSON.stringify({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
    }));
  } catch {}
}

function createTray() {
  const iconPath = join(__dirname, 'tray-icon.png');
  if (!existsSync(iconPath)) return;
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Chaos Messenger');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => { mainWindow?.show(); mainWindow?.focus(); }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { isQuitting = true; app.quit(); }
    },
  ]));
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width || 1200,
    height: state.height || 800,
    x: state.x,
    y: state.y,
    minWidth: 400,
    minHeight: 600,
    icon: join(__dirname, 'tray-icon.png'),
    show: false,
    title: 'Chaos Messenger',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: !isDev,
    },
  });

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!isQuitting && !isDev) {
      e.preventDefault();
      mainWindow.hide();
      return;
    }
    saveWindowState();
  });

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(DIST, 'index.html'));
  }
}

app.setAsDefaultProtocolClient('chaos');

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

app.whenReady().then(() => {
  createWindow();
  createTray();

  ipcMain.handle('dialog:saveFile', async (_, { defaultName, dataUrl }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName || 'download',
      filters: [
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    const base64 = dataUrl.split(',')[1] || dataUrl;
    const buffer = Buffer.from(base64, 'base64');
    writeFileSync(result.filePath, buffer);
    return result.filePath;
  });

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
    });
    if (result.canceled || result.filePath.length === 0) return null;
    const filePath = result.filePath[0];
    const buffer = readFileSync(filePath);
    const name = filePath.split(/[/\\]/).pop();
    return { name, dataUrl: `data:application/octet-stream;base64,${buffer.toString('base64')}` };
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPlatform', () => process.platform);
  ipcMain.handle('app:getPath', (_, name) => app.getPath(name));

  ipcMain.handle('notification:show', (_, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  ipcMain.handle('shell:openExternal', (_, url) => {
    shell.openExternal(url);
  });
});

app.on('window-all-closed', () => {
  if (!isQuitting && !isDev) return;
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});
