const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('companion', {
  onState: callback => ipcRenderer.on('companion:state', (_event, state) => callback(state)),
  onError: callback => ipcRenderer.on('companion:error', (_event, message) => callback(message)),
  control: action => ipcRenderer.send('companion:control', action),
  window: action => ipcRenderer.send('companion:window', action)
});
