import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import Usuario from '../models/Usuario.js'
import { respuestaError } from '../utils/helpers.js'

// Verificar JWT y extraer usuario
export const validarJWT = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json(respuestaError('Token no proporcionado'))
    }

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret)

    // Buscar usuario
    const usuario = Usuario.buscarPorId(decoded.id)

    if (!usuario || !usuario.activo) {
      return res.status(401).json(respuestaError('Usuario no válido o inactivo'))
    }

    // Agregar usuario a request
    req.usuario = usuario
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(respuestaError('Token expirado'))
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(respuestaError('Token inválido'))
    }
    return res.status(500).json(respuestaError('Error al validar token'))
  }
}

// Validar roles permitidos
export const validarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json(respuestaError('No autenticado'))
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json(
        respuestaError('No tiene permisos para realizar esta acción')
      )
    }

    next()
  }
}

// Validar que el usuario es el contable principal o el mismo usuario
export const validarPropietarioOContable = (req, res, next) => {
  const { usuario } = req
  const targetUserId = parseInt(req.params.id || req.params.usuarioId)

  // Administrador tiene acceso total
  if (usuario.rol === 'administrador') {
    return next()
  }

  // Es el mismo usuario
  if (usuario.id === targetUserId) {
    return next()
  }

  // Es el contable principal del usuario
  const targetUser = Usuario.buscarPorId(targetUserId)
  if (targetUser && targetUser.contablePrincipalId === usuario.id) {
    return next()
  }

  return res.status(403).json(
    respuestaError('No tiene permisos para acceder a este recurso')
  )
}

// Validar que el cliente pertenece al contador
export const validarClienteDelContador = (req, res, next) => {
  const { usuario } = req
  const clienteId = parseInt(req.params.id || req.params.clienteId)

  // Esto se debe implementar verificando en la base de datos
  // Por ahora, permitir si es contable o administrador
  if (['administrador', 'contable', 'contador'].includes(usuario.rol)) {
    return next()
  }

  return res.status(403).json(
    respuestaError('No tiene permisos para acceder a este cliente')
  )
}

// Validar subordinado
export const validarSubordinado = (req, res, next) => {
  const { usuario } = req
  const subordinadoId = parseInt(req.params.id || req.params.usuarioId)

  // Administrador tiene acceso
  if (usuario.rol === 'administrador') {
    return next()
  }

  // Verificar relación jerárquica
  const esSubordinado = Usuario.esSubordinado(subordinadoId, usuario.id)
  
  if (!esSubordinado) {
    return res.status(403).json(
      respuestaError('No tiene permisos sobre este usuario')
    )
  }

  next()
}

// Middleware opcional - no falla si no hay token
export const validarJWTOpcional = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      return next()
    }

    const decoded = jwt.verify(token, config.jwt.secret)
    const usuario = Usuario.buscarPorId(decoded.id)

    if (usuario && usuario.activo) {
      req.usuario = usuario
    }

    next()
  } catch (error) {
    // Ignorar errores y continuar sin usuario
    next()
  }
}

export default {
  validarJWT,
  validarRol,
  validarPropietarioOContable,
  validarClienteDelContador,
  validarSubordinado,
  validarJWTOpcional,
}
