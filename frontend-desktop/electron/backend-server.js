/**
 * Servidor Backend Embebido para Electron
 * Inicia automáticamente el backend SQLite en modo standalone
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import http from 'http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class BackendServer {
  constructor() {
    this.process = null
    this.port = 4000
    this.isRunning = false
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const server = http.createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close()
        resolve(true)
      })
      server.listen(port)
    })
  }

  async findAvailablePort(startPort = 4000) {
    let port = startPort
    while (port < startPort + 100) {
      const available = await this.checkPort(port)
      if (available) return port
      port++
    }
    throw new Error('No hay puertos disponibles')
  }

  getBackendPath() {
    // En desarrollo: usar el backend-sqlite del proyecto
    const devPath = path.join(__dirname, '../../backend-sqlite')
    if (fs.existsSync(devPath)) {
      return devPath
    }

    // En producción: usar backend empaquetado
    const prodPath = path.join(process.resourcesPath, 'backend')
    if (fs.existsSync(prodPath)) {
      return prodPath
    }

    throw new Error('Backend no encontrado')
  }

  async start() {
    if (this.isRunning) {
      console.log('⚠️ Backend ya está corriendo')
      return
    }

    try {
      const backendPath = this.getBackendPath()
      this.port = await this.findAvailablePort(4000)

      console.log('🚀 Iniciando backend local...')
      console.log('📂 Path:', backendPath)
      console.log('🔌 Puerto:', this.port)

      // Iniciar servidor backend
      this.process = spawn('node', ['src/server.js'], {
        cwd: backendPath,
        env: {
          ...process.env,
          PORT: this.port,
          NODE_ENV: 'production',
          DB_PATH: path.join(backendPath, 'database', 'inventario.db'),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      this.process.stdout.on('data', (data) => {
        console.log(`[Backend] ${data.toString().trim()}`)
      })

      this.process.stderr.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString().trim()}`)
      })

      this.process.on('error', (error) => {
        console.error('❌ Error al iniciar backend:', error)
        this.isRunning = false
      })

      this.process.on('exit', (code) => {
        console.log(`🛑 Backend detenido con código ${code}`)
        this.isRunning = false
      })

      // Esperar a que el servidor esté listo
      await this.waitForServer()
      this.isRunning = true
      console.log('✅ Backend local iniciado correctamente')
    } catch (error) {
      console.error('❌ Error al iniciar backend:', error)
      throw error
    }
  }

  async waitForServer(timeout = 10000) {
    const start = Date.now()
    const url = `http://localhost:${this.port}/api/salud`

    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(url)
        if (response.ok) {
          return true
        }
      } catch (error) {
        // Servidor aún no está listo
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error('Backend no respondió en el tiempo esperado')
  }

  stop() {
    if (this.process) {
      console.log('🛑 Deteniendo backend...')
      this.process.kill()
      this.process = null
      this.isRunning = false
    }
  }

  getApiUrl() {
    return `http://localhost:${this.port}/api`
  }

  getPort() {
    return this.port
  }
}

export default new BackendServer()
