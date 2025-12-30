import Joi from 'joi'
import { respuestaError } from '../utils/helpers.js'

// Middleware genérico de validación
export const validar = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    })

    if (error) {
      const detalles = error.details.map(detail => ({
        campo: detail.path.join('.'),
        mensaje: detail.message,
      }))

      return res.status(400).json(
        respuestaError('Error de validación', detalles)
      )
    }

    // Reemplazar con valores validados y sanitizados
    req[property] = value
    next()
  }
}

// Esquemas de validación comunes

// Usuario
export const schemaRegistroUsuario = Joi.object({
  nombreUsuario: Joi.string().min(3).max(50),
  nombre: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  telefono: Joi.string().max(20),
  rol: Joi.string().valid('contable', 'contador', 'colaborador', 'administrador'),
  contablePrincipalId: Joi.number().integer().positive(),
})

export const schemaLoginUsuario = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
})

export const schemaActualizarUsuario = Joi.object({
  nombreUsuario: Joi.string().min(3).max(50),
  nombre: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  telefono: Joi.string().max(20),
  rol: Joi.string().valid('contable', 'contador', 'colaborador', 'administrador'),
  configuracion: Joi.object(),
})

export const schemaCambiarPassword = Joi.object({
  passwordActual: Joi.string().required(),
  passwordNuevo: Joi.string().min(6).required(),
})

// Cliente/Negocio
export const schemaCrearCliente = Joi.object({
  nombre: Joi.string().min(2).max(200).required(),
  telefono: Joi.string().max(20).required(),
  direccion: Joi.string().min(5).max(500).required(),
  configuracionInventario: Joi.object({
    habilitado: Joi.boolean(),
    buscarProductos: Joi.boolean(),
    inventarioAutomatico: Joi.boolean(),
    preferenciaInventario: Joi.string(),
    numeroInventario: Joi.number(),
    inventarioSecundario: Joi.number(),
  }),
  proximaVisita: Joi.string(),
  notas: Joi.string().allow('', null),
})

export const schemaActualizarCliente = Joi.object({
  nombre: Joi.string().min(2).max(200),
  telefono: Joi.string().max(20),
  direccion: Joi.string().min(5).max(500),
  configuracionInventario: Joi.object(),
  proximaVisita: Joi.string().allow('', null),
  notas: Joi.string().allow('', null),
})

// Producto General
export const schemaCrearProductoGeneral = Joi.object({
  nombre: Joi.string().min(2).max(200).required(),
  descripcion: Joi.string().max(500).allow('', null),
  categoria: Joi.string().valid(
    'General', 'Alimentos General', 'Enlatados', 'Mercado',
    'Embutidos', 'Carnes', 'Bebidas', 'Desechables',
    'Electricidad', 'Dulce'
  ),
  unidad: Joi.string().valid(
    'unidad', 'faldo', 'cajon', 'saco', 'pieza', 'kg', 'lb',
    'gr', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete',
    'docena', 'par', 'otro'
  ),
  costoBase: Joi.number().min(0),
  tipoContenedor: Joi.string().valid('ninguno', 'caja', 'paquete', 'saco', 'fardo', 'cajon'),
  tieneUnidadesInternas: Joi.boolean(),
  unidadesInternas: Joi.object(),
  tipoPeso: Joi.string().valid('ninguno', 'lb', 'kg', 'gr'),
  codigoBarras: Joi.string().max(50).allow('', null),
  proveedor: Joi.string().max(200).allow('', null),
  notas: Joi.string().allow('', null),
})

// Producto Cliente
export const schemaCrearProductoCliente = Joi.object({
  nombre: Joi.string().min(2).max(200).required(),
  descripcion: Joi.string().max(500).allow('', null),
  costo: Joi.number().min(0).required(),
  unidad: Joi.string().required(),
  sku: Joi.string().max(50).allow('', null),
  categoria: Joi.string(),
  tipoContenedor: Joi.string(),
  tieneUnidadesInternas: Joi.boolean(),
  unidadesInternas: Joi.object(),
  tipoPeso: Joi.string(),
  codigoBarras: Joi.string().max(50).allow('', null),
  proveedor: Joi.string().max(200).allow('', null),
  configuracion: Joi.object(),
})

// Sesión Inventario
export const schemaCrearSesion = Joi.object({
  clienteNegocioId: Joi.number().integer().positive().required(),
  fecha: Joi.date().iso(),
  configuracion: Joi.object(),
})

export const schemaAgregarProducto = Joi.object({
  productoClienteId: Joi.number().integer().positive().required(),
  cantidadContada: Joi.number().min(0).required(),
  notas: Joi.string().allow('', null),
})

export const schemaDatosFinancieros = Joi.object({
  efectivoEnCajaYBanco: Joi.number().min(0),
  cuentasPorCobrar: Joi.number().min(0),
  cuentasPorPagar: Joi.number().min(0),
  activosFijos: Joi.number().min(0),
  ventasDelMes: Joi.number().min(0),
  gastosGenerales: Joi.number().min(0),
})

// Invitaciones
export const schemaCrearInvitacion = Joi.object({
  expiraEnHoras: Joi.number().integer().positive().max(168), // Max 7 días
  metadata: Joi.object(),
})

// Solicitudes de conexión
export const schemaCrearSolicitud = Joi.object({
  contableId: Joi.number().integer().positive(),
  codigoNumerico: Joi.string(),
  nombreColaborador: Joi.string().min(2).max(100).required(),
  metadata: Joi.object(),
  dispositivoId: Joi.string(),
  dispositivoInfo: Joi.object(),
}).or('contableId', 'codigoNumerico')

export default {
  validar,
  schemaRegistroUsuario,
  schemaLoginUsuario,
  schemaActualizarUsuario,
  schemaCambiarPassword,
  schemaCrearCliente,
  schemaActualizarCliente,
  schemaCrearProductoGeneral,
  schemaCrearProductoCliente,
  schemaCrearSesion,
  schemaAgregarProducto,
  schemaDatosFinancieros,
  schemaCrearInvitacion,
  schemaCrearSolicitud,
}
