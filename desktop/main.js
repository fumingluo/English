const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('node:path');
const { WebSocketServer } = require('ws');

let win;
let tray;
let server;
let latest = { type: 'state', connected: false, word: '', phonetic: '', meaning: '', example: '', segment: '', playing: false, index: 0, total: 0 };

function broadcast(payload) {
  if (!server) return;
  const data = JSON.stringify(payload);
  for (const client of server.clients) if (client.readyState === 1) client.send(data);
}
function createWindow() {
  win = new BrowserWindow({
    width: 370, height: 226, minWidth: 300, minHeight: 180,
    frame: false, transparent: true, resizable: true, alwaysOnTop: true,
    skipTaskbar: true, show: false, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, 'renderer/index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
  win.setAlwaysOnTop(true, 'floating');
}
function startBridge() {
  server = new WebSocketServer({ host: '127.0.0.1', port: 17321 });
  server.on('connection', (socket, request) => {
    const origin = request.headers.origin || '';
    if (origin && !['https://fumingluo.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173'].includes(origin)) {
      socket.close(1008, 'Origin not allowed'); return;
    }
    socket.send(JSON.stringify({ ...latest, connected: true }));
    socket.on('message', raw => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
      if (msg.type === 'state') {
        latest = { ...latest, ...msg, connected: true };
        if (win && !win.isDestroyed()) win.webContents.send('companion:state', latest);
      }
    });
    socket.on('close', () => {
      if (server.clients.size === 0) {
        latest = { ...latest, connected: false };
        if (win && !win.isDestroyed()) win.webContents.send('companion:state', latest);
      }
    });
  });
  server.on('error', err => {
    if (win && !win.isDestroyed()) win.webContents.send('companion:error', err.code === 'EADDRINUSE' ? '端口 17321 已被占用' : '本地连接启动失败');
  });
}
app.whenReady().then(() => {
  createWindow();
  startBridge();
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('English 单词悬浮助手');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示悬浮窗', click: () => win && win.show() },
    { label: '隐藏悬浮窗', click: () => win && win.hide() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]));
});
ipcMain.on('companion:control', (_event, action) => broadcast({ type: 'control', action }));
ipcMain.on('companion:window', (_event, action) => {
  if (!win) return;
  if (action === 'hide') win.hide();
  if (action === 'top') win.setAlwaysOnTop(true, 'floating');
});
app.on('window-all-closed', e => { e.preventDefault(); });
app.on('before-quit', () => { if (server) server.close(); });
