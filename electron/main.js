const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const http = require('http');
const fs = require('fs');

let mainWindow;
let backendProcess;

// Simple file logger (production only)
function setupFileLogger() {
  if (!app.isPackaged) return;
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'app.log');

  const write = (level, args) => {
    const line = `[${new Date().toISOString()}] [${level}] ${args
      .map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' ')}\n`;
    try {
      fs.appendFileSync(logFile, line);
    } catch (_) {}
  };

  const origLog = console.log;
  const origError = console.error;
  console.log = (...args) => {
    write('INFO', args);
    origLog(...args);
  };
  console.error = (...args) => {
    write('ERROR', args);
    origError(...args);
  };
}

const isDev = !app.isPackaged;

function startBackend() {
  // In production, server is in resources folder (extraResources)
  const isProd = app.isPackaged;
  const serverPath = isProd
    ? path.join(process.resourcesPath, 'server', 'src', 'server.js')
    : path.join(__dirname, '../server/src/server.js');

  const nodeCommand = process.execPath;

  backendProcess = spawn(nodeCommand, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_USER_DATA: app.getPath('userData'),
      PORT: '3000',
      ELECTRON_RUN_AS_NODE: '1'
    },
    stdio: 'inherit'
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    waitForBackend(() => {
      const indexPath = path.join(process.resourcesPath, 'client', 'dist', 'index.html');
      const formattedPath = 'file://' + indexPath.replace(/\\/g, '/');
      console.log('Loading UI from:', formattedPath);
      mainWindow.loadURL(formattedPath);
      mainWindow.webContents.openDevTools();
    });
  }
}

app.whenReady().then(() => {
  setupFileLogger();
  startBackend();
  createWindow();
  if (!isDev) {
    setupAutoUpdater();
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});

function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización disponible',
      message: 'Se está descargando una nueva versión en segundo plano.'
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'question',
        buttons: ['Reiniciar ahora', 'Después'],
        defaultId: 0,
        message: 'Actualización lista. ¿Quieres reiniciar la aplicación ahora?'
      })
      .then(result => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on('error', err => {
    console.error('Error en auto-update:', err);
  });
}

// Wait until backend is reachable
function waitForBackend(callback, retries = 20) {
  const req = http.get('http://localhost:3000/api/health', res => {
    if (res.statusCode === 200) {
      console.log('Backend ready');
      callback();
    } else {
      retry(callback, retries);
    }
  });

  req.on('error', () => {
    retry(callback, retries);
  });
}

function retry(callback, retries) {
  if (retries <= 0) {
    console.error('Backend never started');
    callback();
    return;
  }
  setTimeout(() => waitForBackend(callback, retries - 1), 1000);
}
