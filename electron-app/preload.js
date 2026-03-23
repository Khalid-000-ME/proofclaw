const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  checkOllama: () => ipcRenderer.invoke('check-ollama'),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  
  startProvider: (config) => ipcRenderer.invoke('start-provider', config),
  stopProvider: () => ipcRenderer.invoke('stop-provider'),
  
  onLog: (callback) => ipcRenderer.on('provider-log', (event, log) => callback(log)),
  offLog: (callback) => ipcRenderer.removeListener('provider-log', callback)
});
