const {app, BrowserWindow, ipcMain} = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
require(path.join(__dirname, '/app/server/server.js'))

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1200,
    // fullscreen:true,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadURL('http://localhost:3000/')
  mainWindow.webContents.openDevTools()

  mainWindow.once('ready-to-show', _ => {
    console.log('ready to show')
    autoUpdater.checkForUpdatesAndNotify()
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.on('app_version', event => {
  event.sender.send('app_version', {version: app.getVersion()})
})

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on('update-available', _ => {
  mainWindow.webContents.send('updates_available')
})

autoUpdater.on('update-downloaded', _ => {
  mainWindow.webContents.send('updates_downloaded')
})