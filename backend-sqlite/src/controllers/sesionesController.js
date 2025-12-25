import SesionInventario from '../models/SesionInventario.js'
import HistorialSesion from '../models/HistorialSesion.js'
import { respuestaExito } from '../utils/helpers.js'
import { AppError } from '../middlewares/errorHandler.js'
import dbManager from '../config/database.js'

// Listar sesiones
export const listarSesiones = async (req, res) => {
  const {
    pagina = 1,
    limite = 20,
    estado,
    fechaDesde,
    fechaHasta,
    clienteId,
  } = req.query

  const resultado = SesionInventario.buscar({
    pagina: parseInt(pagina),
    limite: parseInt(limite),
    contadorId: req.usuario.id,
    estado,
    fechaDesde,
    fechaHasta,
    clienteId: clienteId ? parseInt(clienteId) : null,
  })

  res.json(respuestaExito(resultado))
}

// Obtener sesión por ID
export const obtenerSesion = async (req, res) => {
  const { id } = req.params

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  // Verificar permisos
  if (sesion.contadorId !== req.usuario.id && req.usuario.rol !== 'administrador') {
    throw new AppError('No tiene permisos para ver esta sesión', 403)
  }

  res.json(respuestaExito(sesion))
}

// Crear nueva sesión
export const crearSesion = async (req, res) => {
  const datosSesion = {
    ...req.body,
    contadorId: req.usuario.id,
  }

  const sesion = SesionInventario.crear(datosSesion)

  // Registrar en historial
  HistorialSesion.registrar({
    sesionId: sesion.id,
    usuarioId: req.usuario.id,
    accion: 'sesion_creada',
    descripcion: 'Sesión de inventario creada',
  })

  res.status(201).json(respuestaExito(sesion, 'Sesión creada'))
}

// Agregar producto a sesión
export const agregarProducto = async (req, res) => {
  const { id } = req.params
  const datosProducto = {
    ...req.body,
    agregadoPorId: req.usuario.id,
  }

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  if (sesion.estado === 'completada' || sesion.estado === 'cancelada') {
    throw new AppError('No se puede modificar una sesión completada o cancelada', 400)
  }

  const productoId = SesionInventario.agregarProductoContado(id, datosProducto)

  // Registrar en historial
  HistorialSesion.registrar({
    sesionId: id,
    usuarioId: req.usuario.id,
    accion: 'producto_agregado',
    descripcion: `Producto agregado a la sesión`,
    metadata: { productoId },
  })

  const sesionActualizada = SesionInventario.buscarPorId(id)

  res.json(respuestaExito(sesionActualizada, 'Producto agregado'))
}

// Actualizar producto en sesión
export const actualizarProducto = async (req, res) => {
  const { id, productoId } = req.params

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  if (sesion.estado === 'completada' || sesion.estado === 'cancelada') {
    throw new AppError('No se puede modificar una sesión completada o cancelada', 400)
  }

  // El productoId en la URL es el ID del producto contado (productos_contados.id)
  // Necesitamos obtener el productoClienteId desde el producto contado
  const db = dbManager.getDatabase()
  const productoContadoStmt = db.prepare(`
    SELECT productoClienteId FROM productos_contados 
    WHERE id = ? AND sesionInventarioId = ?
  `)
  const productoContado = productoContadoStmt.get(parseInt(productoId), parseInt(id))

  if (!productoContado) {
    throw new AppError('Producto no encontrado en la sesión', 404)
  }

  // Agregar o actualizar (reutilizar la misma función)
  const datosProducto = {
    ...req.body,
    productoClienteId: req.body.productoClienteId || productoContado.productoClienteId,
    agregadoPorId: req.usuario.id,
  }

  SesionInventario.agregarProductoContado(id, datosProducto)

  // Registrar en historial
  HistorialSesion.registrar({
    sesionId: id,
    usuarioId: req.usuario.id,
    accion: 'producto_actualizado',
    descripcion: `Producto actualizado`,
    metadata: { productoId },
  })

  const sesionActualizada = SesionInventario.buscarPorId(id)

  res.json(respuestaExito(sesionActualizada, 'Producto actualizado'))
}

// Remover producto de sesión
export const removerProducto = async (req, res) => {
  const { id, productoId } = req.params

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  if (sesion.estado === 'completada' || sesion.estado === 'cancelada') {
    throw new AppError('No se puede modificar una sesión completada o cancelada', 400)
  }

  const eliminado = SesionInventario.removerProductoContado(id, productoId)

  if (!eliminado) {
    throw new AppError('Producto no encontrado en la sesión', 404)
  }

  // Registrar en historial
  HistorialSesion.registrar({
    sesionId: id,
    usuarioId: req.usuario.id,
    accion: 'producto_removido',
    descripcion: `Producto removido de la sesión`,
    metadata: { productoId },
  })

  const sesionActualizada = SesionInventario.buscarPorId(id)

  res.json(respuestaExito(sesionActualizada, 'Producto removido'))
}

// Actualizar datos financieros
export const actualizarDatosFinancieros = async (req, res) => {
  const { id } = req.params

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  if (sesion.estado === 'completada') {
    throw new AppError('No se puede modificar una sesión completada', 400)
  }

  const sesionActualizada = SesionInventario.actualizarDatosFinancieros(id, req.body)

  // Registrar en historial
  HistorialSesion.registrar({
    sesionId: id,
    usuarioId: req.usuario.id,
    accion: 'datos_financieros_actualizados',
    descripcion: 'Datos financieros actualizados',
  })

  res.json(respuestaExito(sesionActualizada, 'Datos financieros actualizados'))
}

// Completar sesión
export const completarSesion = async (req, res) => {
  const { id } = req.params

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  if (sesion.estado === 'completada') {
    throw new AppError('La sesión ya está completada', 400)
  }

  const sesionCompletada = SesionInventario.completarSesion(id)

  // Registrar en historial
  HistorialSesion.registrar({
    sesionId: id,
    usuarioId: req.usuario.id,
    accion: 'sesion_completada',
    descripcion: 'Sesión completada',
  })

  res.json(respuestaExito(sesionCompletada, 'Sesión completada'))
}

// Cancelar sesión
export const cancelarSesion = async (req, res) => {
  const { id } = req.params

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  if (sesion.estado === 'completada' || sesion.estado === 'cancelada') {
    throw new AppError('La sesión ya está finalizada', 400)
  }

  const sesionCancelada = SesionInventario.cancelarSesion(id)

  // Registrar en historial
  HistorialSesion.registrar({
    sesionId: id,
    usuarioId: req.usuario.id,
    accion: 'sesion_cancelada',
    descripcion: 'Sesión cancelada',
  })

  res.json(respuestaExito(sesionCancelada, 'Sesión cancelada'))
}

// Pausar timer
export const pausarTimer = async (req, res) => {
  const { id } = req.params

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  SesionInventario.pausarTimer(id)

  const sesionActualizada = SesionInventario.buscarPorId(id)

  res.json(respuestaExito(sesionActualizada, 'Timer pausado'))
}

// Reanudar timer
export const reanudarTimer = async (req, res) => {
  const { id } = req.params

  const sesion = SesionInventario.buscarPorId(id)

  if (!sesion) {
    throw new AppError('Sesión no encontrada', 404)
  }

  SesionInventario.reanudarTimer(id)

  const sesionActualizada = SesionInventario.buscarPorId(id)

  res.json(respuestaExito(sesionActualizada, 'Timer reanudado'))
}

// Obtener sesiones de un cliente
export const obtenerSesionesPorCliente = async (req, res) => {
  const { clienteId } = req.params
  const { limite = 10 } = req.query

  const sesiones = SesionInventario.buscarPorCliente(clienteId, parseInt(limite))

  res.json(respuestaExito(sesiones))
}

// Obtener resumen de agenda
export const obtenerAgendaResumen = async (req, res) => {
  const contadorId = req.usuario.id
  const { mes } = req.query // Formato: "YYYY-MM"

  if (!mes) {
    throw new AppError('El parámetro "mes" es requerido (formato: YYYY-MM)', 400)
  }

  const [year, month] = mes.split('-').map(Number)
  const fechaDesde = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const fechaHasta = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const db = dbManager.getDatabase()
  
  // Obtener conteo de sesiones por día del mes
  const query = `
    SELECT 
      DATE(fecha) as fecha,
      COUNT(*) as total
    FROM sesiones_inventario
    WHERE contadorId = ? 
      AND DATE(fecha) >= ? 
      AND DATE(fecha) <= ?
    GROUP BY DATE(fecha)
    ORDER BY fecha ASC
  `

  const resumen = db.prepare(query).all(contadorId, fechaDesde, fechaHasta)

  res.json(respuestaExito({ resumen }))
}

// Obtener sesiones del día
export const obtenerAgendaDia = async (req, res) => {
  const contadorId = req.usuario.id
  const { fecha = new Date().toISOString().split('T')[0] } = req.query

  const db = dbManager.getDatabase()
  
  // Obtener sesiones del día específico con información del cliente
  const query = `
    SELECT 
      s.*,
      c.id as cliente_id,
      c.nombre as cliente_nombre,
      c.tipo as cliente_tipo
    FROM sesiones_inventario s
    LEFT JOIN clientes_negocios c ON s.clienteId = c.id
    WHERE s.contadorId = ? 
      AND DATE(s.fecha) = ?
    ORDER BY s.createdAt DESC
  `

  const sesionesRaw = db.prepare(query).all(contadorId, fecha)
  
  // Formatear las sesiones
  const sesiones = sesionesRaw.map(s => ({
    _id: s.id,
    id: s.id,
    numeroSesion: s.numeroSesion,
    nombre: s.nombre,
    descripcion: s.descripcion,
    fecha: s.fecha,
    estado: s.estado,
    contadorId: s.contadorId,
    clienteId: s.clienteId,
    clienteNegocio: s.cliente_id ? {
      _id: s.cliente_id,
      id: s.cliente_id,
      nombre: s.cliente_nombre,
      tipo: s.cliente_tipo,
    } : null,
    totales: JSON.parse(s.totales || '{}'),
    configuracion: JSON.parse(s.configuracion || '{}'),
    duracionSegundos: s.duracionSegundos,
    pausas: JSON.parse(s.pausas || '[]'),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }))

  res.json(respuestaExito({ sesiones }))
}

export default {
  listarSesiones,
  obtenerSesion,
  crearSesion,
  agregarProducto,
  actualizarProducto,
  removerProducto,
  actualizarDatosFinancieros,
  completarSesion,
  cancelarSesion,
  pausarTimer,
  reanudarTimer,
  obtenerSesionesPorCliente,
  obtenerAgendaResumen,
  obtenerAgendaDia,
}
