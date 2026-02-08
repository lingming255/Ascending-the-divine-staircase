const { app, BrowserWindow, Menu, MenuItem, ipcMain } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow;
let cmdWindow;

function getIndexPath() {
  const fs = require('fs');
  // Check local dist first (packaged app)
  let indexPath = path.join(__dirname, 'dist/index.html');
  if (!fs.existsSync(indexPath)) {
    // Check sibling dist (dev/build local test)
    indexPath = path.join(__dirname, '../dist/index.html');
  }
  return indexPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Create custom menu
  const menu = new Menu();
  
  // File Menu
  menu.append(new MenuItem({
    label: 'File',
    submenu: [
      { 
        label: 'Start on Boot', 
        type: 'checkbox', 
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({
            openAtLogin: item.checked,
            path: process.execPath
          });
        }
      },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }));

  // View Menu
  menu.append(new MenuItem({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }));
  
  // Tools Menu
  menu.append(new MenuItem({
    label: 'Tools',
    submenu: [
        {
            label: 'Open Command Center',
            click: () => createCmdWindow()
        }
    ]
  }));

  Menu.setApplicationMenu(menu);

  // Check if we are in development mode
  const isDev = !app.isPackaged;

  if (isDev) {
    // In dev, load from the Vite dev server
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, load the index.html from the dist folder
    mainWindow.loadFile(getIndexPath());
  }
}

function createCmdWindow() {
  if (cmdWindow) {
    cmdWindow.focus();
    return;
  }

  cmdWindow = new BrowserWindow({
    width: 360,
    height: 600,
    minWidth: 300,
    minHeight: 400,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    cmdWindow.loadURL('http://localhost:5173/#/cmd-center');
  } else {
    const indexPath = getIndexPath();
    // Convert path to file URL to safely append hash
    const fileUrl = pathToFileURL(indexPath).href;
    cmdWindow.loadURL(`${fileUrl}#/cmd-center`);
  }

  cmdWindow.on('closed', () => {
    cmdWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.on('open-cmd-center', () => {
    createCmdWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
