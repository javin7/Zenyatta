const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fsAPI', {
  getTargetFormats: (filePath, mimeType, extension) => 
    ipcRenderer.invoke('get-target-formats', filePath, mimeType, extension),
  convertFile: (filePath, targetExt) => 
    ipcRenderer.invoke('convert-file', filePath, targetExt),
});
