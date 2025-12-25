import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import Usuario from '../models/Usuario.js'
import logger from '../utils/logger.js'

let io = null

// Inicializar Socket.IO con configuración mejorada
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.cors.allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000, // 60 segundos
    pingInterval: 25000, // 25 segundos
    upgradeTimeout: 30000, // 30 segundos
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
  })

  // Middleware de autenticación con logging mejorado
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    const clientType = socket.handshake.auth.clientType || 'unknown'

    if (!token) {
      logger.warn(`Intento de conexión sin token desde ${clientType}`)
      return next(new Error('Token requerido'))
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret)
      
      // Verificar si el token ha expirado
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        logger.warn(`Token expirado para usuario ID: ${decoded.id}`)
        return next(new Error('Token expirado'))
      }

      const usuario = Usuario.buscarPorId(decoded.id)

      if (!usuario) {
        logger.warn(`Usuario no encontrado con ID: ${decoded.id}`)
        return next(new Error('Usuario no encontrado'))
      }

      if (!usuario.activo) {
        logger.warn(`Usuario inactivo intentó conectar: ${usuario.nombre} (${usuario.id})`)
        return next(new Error('Usuario inactivo'))
      }

      socket.usuario = usuario
      socket.clientType = clientType
      next()
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warn('Token expirado en WebSocket')
        return next(new Error('Token expirado'))
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('Token JWT inválido en WebSocket')
        return next(new Error('Token inválido'))
      } else {
        logger.error('Error verificando token en WebSocket:', error)
        return next(new Error('Error de autenticación'))
      }
    }
  })

  // Manejo de conexiones
  io.on('connection', (socket) => {
    logger.info(`✅ WebSocket conectado: ${socket.usuario.nombre} (${socket.usuario.id}) [${socket.clientType}]`)

    // Unirse a sala del contable con manejo de errores
    try {
      if (socket.usuario.contablePrincipalId) {
        socket.join(`contable_${socket.usuario.contablePrincipalId}`)
      } else {
        socket.join(`contable_${socket.usuario.id}`)
      }
    } catch (error) {
      logger.error('Error al unirse a sala de contable:', error)
    }

    // Unirse a sesión de inventario
    socket.on('join_session', (data) => {
      const { sessionId } = data
      socket.join(`session_${sessionId}`)
      logger.info(`Usuario ${socket.usuario.nombre} se unió a sesión ${sessionId}`)

      // Notificar a otros usuarios en la sesión
      socket.to(`session_${sessionId}`).emit('usuario_conectado', {
        usuario: {
          id: socket.usuario.id,
          nombre: socket.usuario.nombre,
          rol: socket.usuario.rol,
        },
        timestamp: new Date().toISOString(),
      })
    })

    // Salir de sesión
    socket.on('leave_session', (data) => {
      const { sessionId } = data
      socket.leave(`session_${sessionId}`)
      logger.info(`Usuario ${socket.usuario.nombre} salió de sesión ${sessionId}`)

      // Notificar a otros usuarios
      socket.to(`session_${sessionId}`).emit('usuario_desconectado', {
        usuario: {
          id: socket.usuario.id,
          nombre: socket.usuario.nombre,
        },
        timestamp: new Date().toISOString(),
      })
    })

    // Producto actualizado en sesión
    socket.on('producto_actualizado', (data) => {
      const { sessionId, producto } = data
      
      // Emitir a todos los usuarios en la sesión excepto al remitente
      socket.to(`session_${sessionId}`).emit('producto_actualizado', {
        producto,
        usuario: {
          id: socket.usuario.id,
          nombre: socket.usuario.nombre,
        },
        timestamp: new Date().toISOString(),
      })

      logger.info(`Producto actualizado en sesión ${sessionId} por ${socket.usuario.nombre}`)
    })

    // Datos financieros actualizados
    socket.on('financieros_actualizados', (data) => {
      const { sessionId, datosFinancieros } = data
      
      socket.to(`session_${sessionId}`).emit('financieros_actualizados', {
        datosFinancieros,
        usuario: {
          id: socket.usuario.id,
          nombre: socket.usuario.nombre,
        },
        timestamp: new Date().toISOString(),
      })
    })

    // Sesión completada
    socket.on('sesion_completada', (data) => {
      const { sessionId } = data
      
      io.to(`session_${sessionId}`).emit('sesion_completada', {
        sessionId,
        usuario: {
          id: socket.usuario.id,
          nombre: socket.usuario.nombre,
        },
        timestamp: new Date().toISOString(),
      })
    })

    // Desconexión
    socket.on('disconnect', (reason) => {
      logger.info(`❌ WebSocket desconectado: ${socket.usuario.nombre} (${socket.usuario.id}) - Razón: ${reason}`)
    })

    // Manejo de errores
    socket.on('error', (error) => {
      logger.error(`💥 Error en socket ${socket.usuario.nombre}:`, error.message || error)
    })

    // Timeout de ping/pong para detectar conexiones muertas
    socket.on('ping', () => {
      socket.emit('pong')
    })
  })

  logger.info('Socket.IO inicializado')

  return io
}

// Obtener instancia de Socket.IO
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO no ha sido inicializado')
  }
  return io
}

// Emitir evento a una sala específica
export const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data)
  }
}

// Emitir evento a un usuario específico
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user_${userId}`).emit(event, data)
  }
}

export default {
  initializeSocket,
  getIO,
  emitToRoom,
  emitToUser,
}
