const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ConversionGraph = require('./core/ConversionGraph.cjs');
const SharpHandler = require('./handlers/SharpHandler.cjs');
const FfmpegHandler = require('./handlers/FfmpegHandler.cjs');

// Initialize the universal conversion graph
const graph = new ConversionGraph();
graph.registerHandler(new SharpHandler());
graph.registerHandler(new FfmpegHandler());


let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#f8fafc',
    },
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:7777');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('get-target-formats', async (event, filePath, mimeType, extension) => {
  const ext = extension.toLowerCase().replace('.', '');
  return graph.getReachableFormats(ext).filter(f => f !== ext);
});

ipcMain.handle('convert-file', async (event, inputPath, targetExt) => {
  const parsedPath = path.parse(inputPath);
  const outFileName = `${parsedPath.name}_converted.${targetExt}`;
  
  const saveDialogResult = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Converted File',
    defaultPath: path.join(parsedPath.dir, outFileName),
    filters: [
      { name: targetExt.toUpperCase(), extensions: [targetExt] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (saveDialogResult.canceled || !saveDialogResult.filePath) {
    return { success: false, error: 'User canceled' };
  }

  const outputPath = saveDialogResult.filePath;
  const inExt = parsedPath.ext.toLowerCase().replace('.', '');

  try {
    await graph.executeConversion(inputPath, targetExt, outputPath);
    return { success: true, outputPath };
  } catch (error) {
    console.error('Conversion Graph Error:', error);
    return { success: false, error: error.message };
  }
});
