import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import 'express-async-errors'

// Config
import config from './config/env.js'
import dbManager from './config/database.js'
import logger from './utils/logger.js'

// Middlewares
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js'

// Routes
import authRoutes from './routes/auth.js'
import clientesRoutes from './routes/clientes.js'
import productosRoutes from './routes/productos.js'
import sesionesRoutes from './routes/sesiones.js'
import invitacionesRoutes from './routes/invitaciones.js'
import solicitudesRoutes from './routes/solicitudes.js'
import usuariosRoutes from './routes/usuarios.js'
import saludRoutes from './routes/salud.js'
import integracionRoutes from './routes/integracion.js'
import reportesRoutes from './routes/reportes.js'
import syncRoutes from './routes/sync.js'

// Services
import { initializeSocket } from './services/socketService.js'
import os from 'os'

// Migraciones
import { runMigrations } from './migrations/runMigrations.js'

// Crear aplicación Express
const app = express()
const server = http.createServer(app)

// ===== INICIALIZACIÓN =====

// Inicializar base de datos
logger.info('🔧 Inicializando base de datos...')
dbManager.initialize()

// Ejecutar migraciones
logger.info('📦 Ejecutando migraciones...')
runMigrations()

// Inicializar Socket.IO
logger.info('🔌 Inicializando WebSockets...')
const io = initializeSocket(server)

// ===== MIDDLEWARES GLOBALES =====

// Seguridad
app.use(helmet())

// CORS
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, postman, etc)
    if (!origin) return callback(null, true)
    
    if (config.cors.allowedOrigins.indexOf(origin) !== -1 || config.isDevelopment) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true,
}))

// Compresión
app.use(compression())

// Body parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
if (config.isDevelopment) {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }))
}

// Rate limiting - Configuración mejorada
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: config.isDevelopment ? 10000 : 2000, // Mucho más alto en desarrollo, alto en producción
  message: "Demasiadas solicitudes, intenta más tarde",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltar rate limiting para rutas de salud en desarrollo
    return config.isDevelopment && req.path.includes('/salud')
  }
});

// Aplicar rate limiting solo si no estamos en desarrollo o con límites más altos
if (!config.isDevelopment) {
  app.use('/api/', limiter)
} else {
  // En desarrollo, usar límites muy altos pero mantener la protección básica
  app.use('/api/', limiter)
}

// ===== RUTAS =====

// Ruta de bienvenida
app.get('/', (req, res) => {
  res.json({
    mensaje: 'Backend de Inventario J4 Pro - SQLite',
    version: '1.0.0',
    estado: 'Activo',
    documentacion: '/api/salud',
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/clientes-negocios', clientesRoutes)
app.use('/api/clientes', clientesRoutes) // Alias
app.use('/api/productos', productosRoutes)
app.use('/api/sesiones-inventario', sesionesRoutes)
app.use('/api/invitaciones', invitacionesRoutes)
app.use('/api/solicitudes-conexion', solicitudesRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/salud', saludRoutes)
app.use('/api/inventario', integracionRoutes)
app.use('/api/reportes', reportesRoutes)
app.use('/api/sync', syncRoutes)

// ===== MANEJO DE ERRORES =====

// Ruta no encontrada
app.use(notFoundHandler)

// Manejador de errores global
app.use(errorHandler)

// ===== INICIAR SERVIDOR =====

const PORT = config.port
// No forzar solo IPv4. En Windows `localhost` puede resolver a ::1 (IPv6),
// y si escuchamos solo en 0.0.0.0, los checks a localhost fallan con ECONNREFUSED.
// Omitiendo HOST dejamos que Node escuche en todas las interfaces disponibles (dual-stack cuando aplique).

// Función para obtener la IP local
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Omitir direcciones internas (como 127.0.0.1) y no-ipv4
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return '0.0.0.0'
}

// Health público y simple (sin auth) para validación rápida desde Electron/clients.
// Si el cliente pide texto plano, devolvemos "OK"; si no, devolvemos JSON (compatibilidad).
app.get('/api/salud', (req, res) => {
  const accept = (req.headers.accept || '').toLowerCase()
  const wantsText = accept.includes('text/plain')
  if (wantsText) return res.status(200).type('text/plain').send('OK')

  return res.status(200).json({
    ok: true,
    estado: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

server.listen(PORT, () => {
  const localIp = getLocalIpAddress()
  logger.info(`✅ Servidor iniciado en puerto ${PORT}`)
  logger.info(`🌍 Entorno: ${config.nodeEnv}`)
  logger.info(`📁 Base de datos: ${config.database.path}`)
  logger.info(`🚀 API disponible en: http://${localIp}:${PORT}/api`)
  logger.info(`🔌 WebSocket disponible en: http://${localIp}:${PORT}`)
  
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Backend SQLite - Gestor de Inventario J4 Pro`)
  console.log('='.repeat(60))
  console.log('Servidor escuchando en TODAS las interfaces de red (host por defecto)')
  console.log(`\nPara conectar desde un dispositivo en la misma red, usa esta IP:`)
  console.log(`\n\x1b[1m\x1b[32m➡️  http://${localIp}:${PORT}  ⬅️\x1b[0m\n`)
  console.log('='.repeat(60))
  console.log(`🌐 Servidor Local: http://localhost:${PORT}`)
  console.log(`📡 API Local:      http://localhost:${PORT}/api`)
  console.log(`📊 Salud:          http://localhost:${PORT}/api/salud`)
  console.log(`💾 Base de datos:  ${config.database.path}`)
  console.log('='.repeat(60) + '\n')
})

// Manejar errores de listen (puerto ocupado, permisos, etc.)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ El puerto ${PORT} ya está en uso. Por favor, usa otro puerto o cierra la aplicación que lo está usando.`)
    logger.error(`💡 Puedes cambiar el puerto estableciendo la variable de entorno PORT`)
    console.error(`\n❌ Error: El puerto ${PORT} ya está en uso`)
    console.error(`💡 Solución: Establece PORT en el entorno o cierra la aplicación que usa el puerto\n`)
    process.exit(1)
  } else {
    logger.error('Error al iniciar el servidor:', error)
    console.error('\n❌ Error al iniciar el servidor:', error.message, '\n')
    process.exit(1)
  }
})

// Manejo de señales de terminación
const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} recibido, cerrando servidor...`)
  
  server.close(() => {
    logger.info('Servidor HTTP cerrado')
    
    // Cerrar conexión a base de datos
    dbManager.close()
    
    logger.info('Apagado completo')
    process.exit(0)
  })
  
  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    logger.error('Forzando cierre después de timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Manejo de excepciones no capturadas
process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada:', error)
  gracefulShutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', { reason, promise })
})

export default app
