import SolicitudConexion from '../models/SolicitudConexion.js'
import { respuestaExito } from '../utils/helpers.js'
import { AppError } from '../middlewares/errorHandler.js'

export const crearSolicitud = async (req, res) => {
  const solicitud = SolicitudConexion.crear(req.body)

  res.status(201).json(respuestaExito(solicitud, 'Solicitud creada'))
}

export const verificarEstado = async (req, res) => {
  const { solicitudId } = req.params

  const solicitud = SolicitudConexion.buscarPorId(solicitudId)

  if (!solicitud) {
    throw new AppError('Solicitud no encontrada', 404)
  }

  res.json(respuestaExito({ estado: solicitud.estado, solicitud }))
}

export const agregarProductoOffline = async (req, res) => {
  const { solicitudId } = req.params
  const { productoData } = req.body

  const productoId = SolicitudConexion.agregarProductoOffline(solicitudId, productoData)

  res.status(201).json(respuestaExito({ id: productoId }, 'Producto agregado'))
}

export const listarPendientes = async (req, res) => {
  const solicitudes = SolicitudConexion.buscarPendientes(req.usuario.id)

  res.json(respuestaExito(solicitudes))
}

export const listarConectados = async (req, res) => {
  const { sesionId } = req.query
  const solicitudes = SolicitudConexion.buscarConectados(req.usuario.id)

  res.json(respuestaExito(solicitudes))
}

export const aceptarSolicitud = async (req, res) => {
  const { solicitudId } = req.params

  const solicitud = SolicitudConexion.buscarPorId(solicitudId)

  if (!solicitud) {
    throw new AppError('Solicitud no encontrada', 404)
  }

  if (solicitud.contableId !== req.usuario.id && req.usuario.rol !== 'administrador') {
    throw new AppError('No tiene permisos', 403)
  }

  const solicitudAceptada = SolicitudConexion.aceptar(solicitudId)

  res.json(respuestaExito(solicitudAceptada, 'Solicitud aceptada'))
}

export const rechazarSolicitud = async (req, res) => {
  const { solicitudId } = req.params

  const solicitud = SolicitudConexion.buscarPorId(solicitudId)

  if (!solicitud) {
    throw new AppError('Solicitud no encontrada', 404)
  }

  if (solicitud.contableId !== req.usuario.id && req.usuario.rol !== 'administrador') {
    throw new AppError('No tiene permisos', 403)
  }

  const solicitudRechazada = SolicitudConexion.rechazar(solicitudId)

  res.json(respuestaExito(solicitudRechazada, 'Solicitud rechazada'))
}

export const obtenerProductosOffline = async (req, res) => {
  const { solicitudId } = req.params

  const solicitud = SolicitudConexion.buscarPorId(solicitudId)

  if (!solicitud) {
    throw new AppError('Solicitud no encontrada', 404)
  }

  const productos = SolicitudConexion.obtenerProductosOffline(solicitudId)

  res.json(respuestaExito(productos))
}

export const sincronizarProductos = async (req, res) => {
  const { solicitudId } = req.params
  const { temporalIds } = req.body

  SolicitudConexion.sincronizarProductos(solicitudId, temporalIds)

  res.json(respuestaExito(null, 'Productos sincronizados'))
}

export const desconectarColaborador = async (req, res) => {
  const { solicitudId } = req.params

  const solicitudDesconectada = SolicitudConexion.desconectar(solicitudId)

  res.json(respuestaExito(solicitudDesconectada, 'Colaborador desconectado'))
}

export default {
  crearSolicitud,
  verificarEstado,
  agregarProductoOffline,
  listarPendientes,
  listarConectados,
  aceptarSolicitud,
  rechazarSolicitud,
  obtenerProductosOffline,
  sincronizarProductos,
  desconectarColaborador,
}
