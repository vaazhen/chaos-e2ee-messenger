import { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain, Notification, shell, session } from 'electron';
import { join, dirname, basename } from 'node:path';
import { readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const DIST = join(__dirname, '..', 'dist');
const DEV_ORIGIN = 'http://localhost:5173';
const MAX_IPC_FILE_BYTES = 25 * 1024 * 1024;
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss: ws://localhost:8080 http://localhost:8080",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

let mainWindow = null;
let tray = null;
let isQuitting = false;

const WINDOW_STATE_FILE = join(app.getPath('userData'), 'window-state.json');

function trustedRendererUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (isDev) return url.origin === DEV_ORIGIN;
    return url.protocol === 'file:' && url.pathname.startsWith(pathToFileURL(DIST).pathname);
  } catch {
    return false;
  }
}

function requireTrustedSender(event) {
  const url = event.senderFrame?.url || event.sender?.getURL?.() || '';
  if (!trustedRendererUrl(url)) throw new Error('Untrusted IPC sender');
}

function safeText(value, maxLength) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
}

function loadWindowState() {
  try {
    if (existsSync(WINDOW_STATE_FILE)) {
      const state = JSON.parse(readFileSync(WINDOW_STATE_FILE, 'utf-8'));
      return {
        width: Number.isFinite(state.width) ? Math.min(Math.max(state.width, 400), 3840) : 1200,
        height: Number.isFinite(state.height) ? Math.min(Math.max(state.height, 600), 2160) : 800,
        x: Number.isFinite(state.x) ? state.x : undefined,
        y: Number.isFinite(state.y) ? state.y : undefined,
        isMaximized: Boolean(state.isMaximized),
      };
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
    }), { mode: 0o600 });
  } catch {}
}

function createTray() {
  const iconPath = join(__dirname, 'tray-icon.png');
  if (!existsSync(iconPath)) return;
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Chaos Messenger');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]));
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function configureSessionSecurity() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const trusted = trustedRendererUrl(webContents.getURL());
    callback(trusted && ['media', 'notifications', 'display-capture'].includes(permission));
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
        'X-Content-Type-Options': ['nosniff'],
        'Referrer-Policy': ['no-referrer'],
        'Permissions-Policy': ['camera=(self), microphone=(self), display-capture=(self), geolocation=()'],
      },
    });
  });
}

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    ...state,
    minWidth: 400,
    minHeight: 600,
    icon: join(__dirname, 'tray-icon.png'),
    show: false,
    title: 'Chaos Messenger',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: true,
    },
  });

  if (state.isMaximized) mainWindow.maximize();
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!trustedRendererUrl(url)) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());

  mainWindow.on('close', (event) => {
    if (!isQuitting && !isDev) {
      event.preventDefault();
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
    mainWindow.loadURL(DEV_ORIGIN);
  } else {
    mainWindow.loadFile(join(DIST, 'index.html'));
  }
}

function registerIpcHandlers() {
  ipcMain.handle('dialog:saveFile', async (event, payload = {}) => {
    requireTrustedSender(event);
    const defaultName = safeText(payload.defaultName || 'download', 128) || 'download';
    const dataUrl = String(payload.dataUrl || '');
    const match = dataUrl.match(/^(?:data:[^;,]+;base64,)?([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error('Invalid base64 file payload');
    const buffer = Buffer.from(match[1], 'base64');
    if (buffer.length > MAX_IPC_FILE_BYTES) throw new Error('File exceeds the 25 MB desktop limit');

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: basename(defaultName),
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePath) return null;
    writeFileSync(result.filePath, buffer, { mode: 0o600 });
    return result.filePath;
  });

  ipcMain.handle('dialog:openFile', async (event) => {
    requireTrustedSender(event);
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    if (statSync(filePath).size > MAX_IPC_FILE_BYTES) throw new Error('File exceeds the 25 MB desktop limit');
    const buffer = readFileSync(filePath);
    return { name: basename(filePath), dataUrl: `data:application/octet-stream;base64,${buffer.toString('base64')}` };
  });

  ipcMain.handle('app:getVersion', (event) => { requireTrustedSender(event); return app.getVersion(); });
  ipcMain.handle('app:getPlatform', (event) => { requireTrustedSender(event); return process.platform; });
  ipcMain.handle('notification:show', (event, payload = {}) => {
    requireTrustedSender(event);
    if (Notification.isSupported()) {
      new Notification({ title: safeText(payload.title, 80), body: safeText(payload.body, 240) }).show();
    }
  });
  ipcMain.handle('shell:openExternal', async (event, rawUrl) => {
    requireTrustedSender(event);
    const url = new URL(String(rawUrl));
    if (url.protocol !== 'https:') throw new Error('Only HTTPS external links are allowed');
    await shell.openExternal(url.toString());
  });
}

app.setAsDefaultProtocolClient('chaos');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.whenReady().then(() => {
  configureSessionSecurity();
  registerIpcHandlers();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (!isQuitting && !isDev) return;
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => { isQuitting = true; });
app.on('activate', () => mainWindow?.show());
