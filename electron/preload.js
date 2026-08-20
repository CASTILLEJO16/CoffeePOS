const { contextBridge, ipcRenderer } = require('electron');

// Exponer función de impresión al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  printHTML: (htmlContent) => ipcRenderer.invoke('print-html', htmlContent)
});
