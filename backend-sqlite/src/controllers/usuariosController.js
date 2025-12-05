import Usuario from '../models/Usuario.js'
import { respuestaExito } from '../utils/helpers.js'
import { AppError } from '../middlewares/errorHandler.js'

export const obtenerSubordinados = async (req, res) => {
  const subordinados = Usuario.buscarSubordinados(req.usuario.id)

  res.json(respuestaExito(subordinados))
}

export const crearUsuario = async (req, res) => {
  const datosUsuario = {
    ...req.body,
    contablePrincipalId: req.usuario.id,
  }

  const usuario = Usuario.crear(datosUsuario)

  res.status(201).json(respuestaExito(usuario, 'Usuario creado'))
}

export const obtenerUsuario = async (req, res) => {
  const { id } = req.params

  const usuario = Usuario.buscarPorId(id)

  if (!usuario) {
    throw new AppError('Usuario no encontrado', 404)
  }

  res.json(respuestaExito(usuario))
}

export const actualizarUsuario = async (req, res) => {
  const { id } = req.params

  const usuarioActualizado = Usuario.actualizar(id, req.body)

  res.json(respuestaExito(usuarioActualizado, 'Usuario actualizado'))
}

export const cambiarPasswordUsuario = async (req, res) => {
  const { id } = req.params
  const { password } = req.body

  Usuario.actualizarPassword(id, password)

  res.json(respuestaExito(null, 'Contraseña actualizada'))
}

export const desactivarUsuario = async (req, res) => {
  const { id } = req.params

  Usuario.desactivar(id)

  res.json(respuestaExito(null, 'Usuario desactivado'))
}

export default {
  obtenerSubordinados,
  crearUsuario,
  obtenerUsuario,
  actualizarUsuario,
  cambiarPasswordUsuario,
  desactivarUsuario,
}
