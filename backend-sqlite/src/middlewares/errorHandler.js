import logger from '../utils/logger.js'
import { respuestaError } from '../utils/helpers.js'

// Middleware para capturar errores no manejados
export const errorHandler = (err, req, res, next) => {
  // Registrar error en logs
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.usuario?.id,
  })

  // Errores de validación de Joi
  if (err.isJoi) {
    return res.status(400).json(
      respuestaError(
        'Error de validación',
        err.details.map(d => d.message)
      )
    )
  }

  // Errores de SQLite
  if (err.code === 'SQLITE_CONSTRAINT') {
    let mensaje = 'Violación de restricción de base de datos'
    
    if (err.message.includes('UNIQUE')) {
      mensaje = 'Ya existe un registro con ese valor único'
    } else if (err.message.includes('FOREIGN KEY')) {
      mensaje = 'Referencia a registro inexistente'
    }

    return res.status(400).json(respuestaError(mensaje))
  }

  // Error de base de datos
  if (err.name === 'SqliteError') {
    return res.status(500).json(
      respuestaError('Error de base de datos', 
        process.env.NODE_ENV === 'development' ? err.message : undefined
      )
    )
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(respuestaError('Token inválido'))
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(respuestaError('Token expirado'))
  }

  // Error personalizado con código de estado
  if (err.statusCode) {
    return res.status(err.statusCode).json(respuestaError(err.message))
  }

  // Error genérico
  const mensaje = process.env.NODE_ENV === 'development'
    ? err.message
    : 'Error interno del servidor'

  res.status(500).json(respuestaError(mensaje))
}

// Middleware para rutas no encontradas
export const notFoundHandler = (req, res) => {
  res.status(404).json(
    respuestaError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`)
  )
}

// Clase de error personalizado
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AppError'
  }
}

export default {
  errorHandler,
  notFoundHandler,
  AppError,
}
