import ClienteNegocio from '../models/ClienteNegocio.js'
import { respuestaExito, respuestaError } from '../utils/helpers.js'
import { AppError } from '../middlewares/errorHandler.js'

// Listar clientes del contador
export const listarClientes = async (req, res) => {
  const contadorId = req.usuario.id
  const { pagina = 1, limite = 50, buscar, soloActivos = 'true' } = req.query

  const resultado = ClienteNegocio.buscarPorContador(contadorId, {
    pagina: parseInt(pagina),
    limite: parseInt(limite),
    buscar,
    soloActivos: soloActivos === 'true',
  })

  res.json(respuestaExito(resultado))
}

// Obtener cliente por ID
export const obtenerCliente = async (req, res) => {
  const { id } = req.params

  const cliente = ClienteNegocio.buscarPorId(id)

  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404)
  }

  // Verificar que el cliente pertenezca al contador
  if (cliente.contadorAsignadoId !== req.usuario.id && req.usuario.rol !== 'administrador') {
    throw new AppError('No tiene permisos para ver este cliente', 403)
  }

  res.json(respuestaExito(cliente))
}

// Crear nuevo cliente
export const crearCliente = async (req, res) => {
  try {
    // Calcular business_id (el admin principal del negocio)
    const businessId = req.usuario.contablePrincipalId || req.usuario.id

    const datosCliente = {
      ...req.body,
      contadorAsignadoId: req.usuario.id,
      business_id: businessId,
      created_by: req.usuario.id,
      // Si el frontend envía uuid, lo usamos; si no, se genera en el modelo
      uuid: req.body.uuid || req.body.id_uuid || null,
    }

    const cliente = ClienteNegocio.crear(datosCliente)

    if (!cliente) {
      throw new AppError('Error al crear el cliente', 500)
    }

    res.status(201).json(respuestaExito(cliente, 'Cliente creado exitosamente'))
  } catch (error) {
    console.error('❌ Error al crear cliente:', error)
    if (error instanceof AppError) {
      throw error
    }
    throw new AppError('Error interno al crear cliente: ' + error.message, 500)
  }
}

// Actualizar cliente
export const actualizarCliente = async (req, res) => {
  const { id } = req.params

  const clienteExistente = ClienteNegocio.buscarPorId(id)

  if (!clienteExistente) {
    throw new AppError('Cliente no encontrado', 404)
  }

  // Verificar permisos
  if (clienteExistente.contadorAsignadoId !== req.usuario.id && req.usuario.rol !== 'administrador') {
    throw new AppError('No tiene permisos para actualizar este cliente', 403)
  }

  const clienteActualizado = ClienteNegocio.actualizar(id, req.body)

  res.json(respuestaExito(clienteActualizado, 'Cliente actualizado'))
}

// Desactivar cliente
export const desactivarCliente = async (req, res) => {
  const { id } = req.params

  const cliente = ClienteNegocio.buscarPorId(id)

  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404)
  }

  // Verificar permisos
  if (cliente.contadorAsignadoId !== req.usuario.id && req.usuario.rol !== 'administrador') {
    throw new AppError('No tiene permisos para desactivar este cliente', 403)
  }

  ClienteNegocio.desactivar(id)

  res.json(respuestaExito(null, 'Cliente desactivado'))
}

// Activar cliente
export const activarCliente = async (req, res) => {
  const { id } = req.params

  const clienteActivado = ClienteNegocio.activar(id)

  if (!clienteActivado) {
    throw new AppError('Cliente no encontrado', 404)
  }

  res.json(respuestaExito(clienteActivado, 'Cliente activado'))
}

// Obtener estadísticas del cliente
export const obtenerEstadisticas = async (req, res) => {
  const { id } = req.params

  const cliente = ClienteNegocio.buscarPorId(id)

  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404)
  }

  const estadisticas = ClienteNegocio.obtenerEstadisticas(id)

  res.json(respuestaExito(estadisticas))
}

// Actualizar configuración de inventario
export const actualizarConfiguracion = async (req, res) => {
  const { id } = req.params

  const cliente = ClienteNegocio.buscarPorId(id)

  if (!cliente) {
    throw new AppError('Cliente no encontrado', 404)
  }

  const configuracion = {
    ...cliente.configuracionInventario,
    ...req.body,
  }

  const clienteActualizado = ClienteNegocio.actualizar(id, {
    configuracionInventario: configuracion,
  })

  res.json(respuestaExito(clienteActualizado, 'Configuración actualizada'))
}

export default {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  desactivarCliente,
  activarCliente,
  obtenerEstadisticas,
  actualizarConfiguracion,
}
