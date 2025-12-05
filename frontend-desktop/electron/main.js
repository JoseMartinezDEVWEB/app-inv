import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import backendServer from './backend-server.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// Detectar si estamos en desarrollo basándonos en si existe node_modules
const isDev = !app.isPackaged

// Mantener una referencia global del objeto window
let mainWindow
let backendReady = false

function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../src/img/logo_transparent.png'),
    show: false,
    title: 'Gestor de Inventario J4 Pro - Desktop',
    frame: false,
    backgroundColor: '#f3f4f6'
  })

  // Cargar la aplicación
  if (isDev) {
    // Vite usa puerto 3000 (configurado en vite.config.js)
    mainWindow.loadURL('http://localhost:3000')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Mostrar la ventana cuando esté lista y maximizarla
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  // Manejar el cierre de la ventana
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Manejar enlaces externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Ocultar menú (se puede mostrar con Alt)
  Menu.setApplicationMenu(null)
}

// Eventos de la aplicación
app.whenReady().then(async () => {
  try {
    console.log('🚀 Iniciando backend embebido...')
    await backendServer.start()
    backendReady = true
    console.log(`✅ Backend listo en: ${backendServer.getApiUrl()}`)
  } catch (error) {
    console.error('❌ Error al iniciar backend:', error)
    dialog.showErrorBox(
      'Error al iniciar',
      'No se pudo iniciar el servidor local. La aplicación se cerrará.'
    )
    app.quit()
    return
  }
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    backendServer.stop()
    app.quit()
  }
})

app.on('before-quit', () => {
  console.log('🛑 Cerrando aplicación...')
  backendServer.stop()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// Manejar comandos IPC
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

// Controles de ventana
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close()
})

// Obtener URL del backend
ipcMain.handle('get-backend-url', () => {
  return backendServer.getApiUrl()
})

ipcMain.handle('is-backend-ready', () => {
  return backendReady
})
