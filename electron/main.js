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

let backendRestartCount = 0;
const maxBackendRestarts = 3;
let isAppQuitting = false;

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
      PORT: '3001',
      ELECTRON_RUN_AS_NODE: '1'
    },
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('Error al iniciar el proceso backend:', err);
  });

  backendProcess.on('exit', (code, signal) => {
    console.error(`Proceso backend finalizado con código ${code} y señal ${signal}`);
    if (!isAppQuitting && backendRestartCount < maxBackendRestarts) {
      backendRestartCount++;
      console.log(`Intentando reiniciar backend (Intento ${backendRestartCount}/${maxBackendRestarts})...`);
      setTimeout(() => {
        startBackend();
      }, 2000);
    } else if (!isAppQuitting && backendRestartCount >= maxBackendRestarts) {
      dialog.showErrorBox(
        'Error del Servidor',
        'El servidor backend de Coffee POS se ha detenido inesperadamente y no fue posible reiniciarlo. Por favor reinicia la aplicación.'
      );
    }
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

  // Always use built client for consistency
  waitForBackend(() => {
    const indexPath = isDev
      ? path.join(__dirname, '../client/dist/index.html')
      : path.join(process.resourcesPath, 'client', 'dist', 'index.html');
    const formattedPath = 'file://' + indexPath.replace(/\\/g, '/');
    console.log('Loading UI from:', formattedPath);
    mainWindow.loadURL(formattedPath);
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
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
  isAppQuitting = true;
  if (backendProcess) backendProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isAppQuitting = true;
  if (backendProcess) backendProcess.kill();
});

function setupAutoUpdater() {
  // Configurar el feed URL para GitHub Releases
  // Usar provider 'github' en lugar de 'generic' para mejor compatibilidad
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'CASTILLEJO16',
    repo: 'CoffeePOS'
  });

  // Evento: Comprobando actualizaciones
  autoUpdater.on('checking-for-update', () => {
    console.log('Buscando actualizaciones...');
    // Enviar notificación al renderer si es necesario
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'checking',
        message: 'Buscando actualizaciones...'
      });
    }
  });

  // Evento: Actualización disponible
  autoUpdater.on('update-available', (info) => {
    console.log('Actualización disponible:', info);
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización disponible',
      message: `Se encontró una nueva versión (${info.version}).\nLa descarga comenzará en segundo plano.`,
      buttons: ['OK']
    });
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'available',
        message: `Actualización disponible: v${info.version}`,
        version: info.version
      });
    }
  });

  // Evento: No hay actualización disponible
  autoUpdater.on('update-not-available', (info) => {
    console.log('No hay actualizaciones disponibles. Versión actual:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'not-available',
        message: 'Estás usando la versión más reciente',
        version: info.version
      });
    }
  });

  // Evento: Progreso de descarga
  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent);
    console.log(`Descargando actualización: ${percent}%`);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'downloading',
        message: `Descargando actualización: ${percent}%`,
        percent: percent,
        bytesPerSecond: progress.bytesPerSecond,
        total: progress.total,
        transferred: progress.transferred
      });
    }
  });

  // Evento: Actualización descargada
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Actualización descargada:', info);
    dialog
      .showMessageBox({
        type: 'question',
        title: 'Actualización lista',
        message: `La actualización a la versión ${info.version} ha sido descargada.\n\n¿Deseas reiniciar la aplicación para instalarla ahora?\n\nTus datos y configuración se mantendrán seguros.`,
        buttons: ['Reiniciar ahora', 'Más tarde'],
        defaultId: 0,
        cancelId: 1
      })
      .then(result => {
        if (result.response === 0) {
          // El usuario eligió reiniciar ahora
          console.log('Reiniciando para instalar actualización...');
          autoUpdater.quitAndInstall(true, true); // true, true = forzar reinicio silencioso
        }
      });
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'downloaded',
        message: 'Actualización descargada y lista para instalar',
        version: info.version
      });
    }
  });

  // Evento: Error en actualización
  autoUpdater.on('error', (err) => {
    console.error('Error en auto-update:', err);
    dialog.showErrorBox(
      'Error de actualización',
      `Ocurrió un error al buscar o descargar actualizaciones:\n${err.message}\n\nPor favor, verifica tu conexión a internet o contacta al soporte.`
    );
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', {
        status: 'error',
        message: `Error: ${err.message}`,
        error: err
      });
    }
  });

  // Buscar actualizaciones automáticamente al inicio
  // Puedes cambiar el intervalo (en milisegundos)
  // 3600000 = 1 hora, 86400000 = 24 horas
  const checkInterval = 3600000; // 1 hora
  
  // Primera comprobación
  autoUpdater.checkForUpdates();
  
  // Comprobaciones periódicas
  setInterval(() => {
    if (!isAppQuitting) {
      autoUpdater.checkForUpdates();
    }
  }, checkInterval);
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
