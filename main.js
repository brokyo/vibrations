const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
require(path.join(__dirname, '/app/server/server.js'))

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 1200,
    fullscreen:true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadURL('http://localhost:3000/')
  // mainWindow.webContents.openDevTools()
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
