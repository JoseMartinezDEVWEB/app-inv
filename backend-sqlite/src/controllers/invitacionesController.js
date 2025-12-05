import Invitacion from '../models/Invitacion.js'
import { respuestaExito } from '../utils/helpers.js'
import { AppError } from '../middlewares/errorHandler.js'
import QRCode from 'qrcode'
import config from '../config/env.js'
import Usuario from '../models/Usuario.js'

export const generarInvitacion = async (req, res) => {
  const datosInvitacion = {
    ...req.body,
    contableId: req.usuario.id,
    expiraEnHoras: req.body.expiraEnHoras || config.qr.expirationHours,
  }

  const invitacion = Invitacion.crear(datosInvitacion)

  res.status(201).json(respuestaExito(invitacion, 'Invitación creada'))
}

// Crear invitación y devolver QR y código numérico (para compatibilidad con frontend)
export const generarInvitacionQR = async (req, res) => {
  const expiraEnMinutos = Number(req.body?.expiraEnMinutos || 1440)
  const expiraEnHoras = Math.max(1, Math.ceil(expiraEnMinutos / 60))

  const datosInvitacion = {
    contableId: req.usuario.id,
    expiraEnHoras,
    metadata: {
      rol: req.body?.rol || 'colaborador',
      email: req.body?.email || null,
      nombre: req.body?.nombre || null,
      duracionMinutos: expiraEnMinutos,
    },
  }

  const invitacion = Invitacion.crear(datosInvitacion)

  // Generar un código numérico de 6 dígitos a partir del token
  const base = invitacion.codigoQR || ''
  const hash = Array.from(base).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const codigoNumerico = String(hash % 1000000).padStart(6, '0')

  const qrDataUrl = await QRCode.toDataURL(base)

  const payload = {
    invitacionId: invitacion.id,
    qrDataUrl,
    codigoNumerico,
    codigo: base,
    rol: datosInvitacion.metadata.rol,
    nombre: datosInvitacion.metadata.nombre,
    expiraEn: invitacion.expiraEn,
    duracionMinutos: expiraEnMinutos,
  }

  res.status(201).json(respuestaExito(payload, 'Invitación generada'))
}

export const listarActivas = async (req, res) => {
  const invitaciones = Invitacion.buscarActivas(req.usuario.id)

  res.json(respuestaExito(invitaciones))
}

// Alias para compatibilidad con frontend: "mis-invitaciones"
export const listarMisInvitaciones = async (req, res) => {
  const invitaciones = Invitacion.buscarActivas(req.usuario.id)
  const datos = invitaciones.map((inv) => ({
    _id: inv.id,
    rol: inv.metadata?.rol || 'colaborador',
    nombre: inv.metadata?.nombre || null,
    email: inv.metadata?.email || null,
    estado:
      inv.estado === 'activa' ? 'pendiente' : inv.estado === 'usada' ? 'consumida' : inv.estado,
    expiraEn: inv.expiraEn,
    consumidaPor: inv.usadaPor ? { nombre: inv.usadaPor } : null,
  }))
  res.json(respuestaExito(datos))
}

export const validarCodigo = async (req, res) => {
  const { codigo } = req.body

  const invitacion = Invitacion.buscarPorCodigo(codigo)

  if (!invitacion) {
    throw new AppError('Código inválido', 404)
  }

  if (invitacion.estado !== 'activa') {
    throw new AppError('Invitación no válida', 400)
  }

  if (new Date(invitacion.expiraEn) < new Date()) {
    throw new AppError('Invitación expirada', 400)
  }

  res.json(respuestaExito({ valido: true, invitacion }))
}

export const usarInvitacion = async (req, res) => {
  const { codigo, nombreColaborador } = req.body

  const invitacion = Invitacion.buscarPorCodigo(codigo)

  if (!invitacion || invitacion.estado !== 'activa') {
    throw new AppError('Invitación no válida', 400)
  }

  Invitacion.marcarComoUsada(invitacion.id, nombreColaborador)

  res.json(respuestaExito(null, 'Invitación usada exitosamente'))
}

export const cancelarInvitacion = async (req, res) => {
  const { id } = req.params

  const invitacion = Invitacion.buscarPorId(id)

  if (!invitacion) {
    throw new AppError('Invitación no encontrada', 404)
  }

  if (invitacion.contableId !== req.usuario.id && req.usuario.rol !== 'administrador') {
    throw new AppError('No tiene permisos', 403)
  }

  Invitacion.cancelar(id)

  res.json(respuestaExito(null, 'Invitación cancelada'))
}

export const generarQR = async (req, res) => {
  const { id } = req.params

  const invitacion = Invitacion.buscarPorId(id)

  if (!invitacion) {
    throw new AppError('Invitación no encontrada', 404)
  }

  const qrData = await QRCode.toDataURL(invitacion.codigoQR)

  res.json(respuestaExito({ qrCode: qrData, codigo: invitacion.codigoQR }))
}

// Listar colaboradores (subordinados) del contable autenticado
export const listarColaboradores = async (req, res) => {
  const subordinados = Usuario.buscarSubordinados(req.usuario.id) || []
  // Compat: agregar _id utilizado por el frontend
  const datos = subordinados.map((u) => ({ ...u, _id: u.id }))
  res.json(respuestaExito(datos))
}

// Activar/desactivar colaborador subordinado
export const toggleColaborador = async (req, res) => {
  const id = Number(req.params.id)
  const esAdmin = req.usuario?.rol === 'administrador'

  const user = Usuario.buscarPorId(id)
  if (!user) throw new AppError('Colaborador no encontrado', 404)

  // Solo permitir si es subordinado del contable o si es administrador
  if (!esAdmin && !Usuario.esSubordinado(id, req.usuario.id)) {
    throw new AppError('No tiene permisos para modificar este colaborador', 403)
  }

  if (user.activo) {
    Usuario.desactivar(id)
  } else {
    Usuario.activar(id)
  }

  const actualizado = Usuario.buscarPorId(id)
  res.json(respuestaExito({ id, activo: actualizado.activo }, 'Estado de colaborador actualizado'))
}

// Generar QR para colaborador (para compatibilidad con frontend)
export const qrColaborador = async (req, res) => {
  const id = Number(req.params.id)
  const user = Usuario.buscarPorId(id)
  if (!user) throw new AppError('Colaborador no encontrado', 404)

  // Solo si es subordinado o admin
  const esAdmin = req.usuario?.rol === 'administrador'
  if (!esAdmin && !Usuario.esSubordinado(id, req.usuario.id)) {
    throw new AppError('No tiene permisos', 403)
  }

  const payloadRaw = `COLAB:${id}`
  const qrDataUrl = await QRCode.toDataURL(payloadRaw)

  const codigoNumerico = String((id * 9973) % 1000000).padStart(6, '0')
  const expiraEn = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const payload = {
    qrDataUrl,
    codigoNumerico,
    rol: 'colaborador',
    nombre: user.nombre,
    expiraEn,
    duracionMinutos: 10,
  }

  res.json(respuestaExito(payload))
}

export default {
  generarInvitacion,
  generarInvitacionQR,
  listarActivas,
  listarMisInvitaciones,
  validarCodigo,
  usarInvitacion,
  cancelarInvitacion,
  generarQR,
  listarColaboradores,
  toggleColaborador,
  qrColaborador,
}
