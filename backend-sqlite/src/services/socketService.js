import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import Usuario from '../models/Usuario.js'
import logger from '../utils/logger.js'

let io = null

// Inicializar Socket.IO
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.cors.allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error('Token requerido'))
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret)
      const usuario = Usuario.buscarPorId(decoded.id)

      if (!usuario || !usuario.activo) {
        return next(new Error('Usuario no válido'))
      }

      socket.usuario = usuario
      next()
    } catch (error) {
      return next(new Error('Token inválido'))
    }
  })

  // Manejo de conexiones
  io.on('connection', (socket) => {
    logger.info(`Usuario conectado: ${socket.usuario.nombre} (${socket.usuario.id})`)

    // Unirse a sala del contable
    if (socket.usuario.contablePrincipalId) {
      socket.join(`contable_${socket.usuario.contablePrincipalId}`)
    } else {
      socket.join(`contable_${socket.usuario.id}`)
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
    socket.on('disconnect', () => {
      logger.info(`Usuario desconectado: ${socket.usuario.nombre} (${socket.usuario.id})`)
    })

    // Manejo de errores
    socket.on('error', (error) => {
      logger.error(`Error en socket ${socket.usuario.nombre}:`, error)
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
