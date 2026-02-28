import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: '#111827',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    autoHideMenuBar: true,
    frame: true,
    titleBarStyle: 'default'
  });

  // In development, load from Vite dev server
  const viteUrl = process.env.VITE_DEV_SERVER_URL;
  console.log('[ELECTRON] VITE_DEV_SERVER_URL:', viteUrl);
  
  if (viteUrl) {
    console.log('[ELECTRON] Loading from Vite dev server:', viteUrl);
    mainWindow.loadURL(viteUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    const distPath = path.join(__dirname, '../frontend/dist/index.html');
    console.log('[ELECTRON] Loading from dist:', distPath);
    mainWindow.loadFile(distPath);
  }

  // Allow toggling DevTools with F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && (input.key === 'F12' || (input.key.toLowerCase() === 'i' && input.control && input.shift))) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
