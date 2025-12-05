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

// Services
import { initializeSocket } from './services/socketService.js'

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

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { exito: false, mensaje: 'Demasiadas solicitudes, intente más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', limiter)

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

// ===== MANEJO DE ERRORES =====

// Ruta no encontrada
app.use(notFoundHandler)

// Manejador de errores global
app.use(errorHandler)

// ===== INICIAR SERVIDOR =====

const PORT = config.port

server.listen(PORT, () => {
  logger.info(`✅ Servidor iniciado en puerto ${PORT}`)
  logger.info(`🌍 Entorno: ${config.nodeEnv}`)
  logger.info(`📁 Base de datos: ${config.database.path}`)
  logger.info(`🚀 API: http://localhost:${PORT}/api`)
  logger.info(`🔌 WebSocket: http://localhost:${PORT}`)
  
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Backend SQLite - Gestor de Inventario J4 Pro`)
  console.log('='.repeat(60))
  console.log(`🌐 Servidor:     http://localhost:${PORT}`)
  console.log(`📡 API:          http://localhost:${PORT}/api`)
  console.log(`🔌 WebSockets:   http://localhost:${PORT}`)
  console.log(`📊 Salud:        http://localhost:${PORT}/api/salud`)
  console.log(`💾 Base de datos: ${config.database.path}`)
  console.log('='.repeat(60) + '\n')
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
