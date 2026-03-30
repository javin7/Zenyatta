const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('@ffmpeg-installer/ffmpeg');
const ffprobeStatic = require('@ffprobe-installer/ffprobe');
const sharp = require('sharp');

// Set ffmpeg paths
ffmpeg.setFfmpegPath(ffmpegStatic.path.replace('app.asar', 'app.asar.unpacked'));
ffmpeg.setFfprobePath(ffprobeStatic.path.replace('app.asar', 'app.asar.unpacked'));

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
  
  const imageFormats = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'tiff', 'bmp'];
  const videoFormats = ['mp4', 'webm', 'gif', 'avi', 'mov', 'mkv'];
  const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];

  if (imageFormats.includes(ext)) {
    return imageFormats.filter(f => f !== ext);
  }
  
  if (videoFormats.includes(ext)) {
    return [...videoFormats.filter(f => f !== ext), ...audioFormats];
  }

  if (audioFormats.includes(ext)) {
    return audioFormats.filter(f => f !== ext);
  }

  return [];
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
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'bmp'].includes(targetExt);
    const isInputImage = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'bmp'].includes(inExt);

    if (isImage && isInputImage) {
      await sharp(inputPath).toFile(outputPath);
      return { success: true, outputPath };
    }

    return new Promise((resolve) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .on('end', () => resolve({ success: true, outputPath }))
        .on('error', (err) => resolve({ success: false, error: err.message }))
        .run();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});
