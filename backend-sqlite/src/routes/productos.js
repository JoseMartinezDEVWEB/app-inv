import express from 'express'
import productosController from '../controllers/productosController.js'
import { validarJWT, validarRol } from '../middlewares/auth.js'
import { validar, schemaCrearProductoGeneral, schemaCrearProductoCliente } from '../middlewares/validation.js'

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(validarJWT)

// ===== PRODUCTOS GENERALES =====
router.get('/generales', productosController.listarProductosGenerales)
router.get('/generales/categorias', productosController.obtenerCategorias)
router.get('/generales/buscar/codigo-barras/:codigo', productosController.buscarPorCodigoBarras)
router.get('/generales/:id', productosController.obtenerProductoGeneral)
router.post(
  '/generales',
  validarRol('contable', 'contador', 'administrador'),
  validar(schemaCrearProductoGeneral),
  productosController.crearProductoGeneral
)
router.put(
  '/generales/:id',
  validarRol('contable', 'contador', 'administrador'),
  productosController.actualizarProductoGeneral
)
router.delete(
  '/generales/:id',
  validarRol('contable', 'contador', 'administrador'),
  productosController.desactivarProductoGeneral
)

// ===== PRODUCTOS DE CLIENTE =====
router.get('/cliente/:clienteId', productosController.listarProductosCliente)
router.post(
  '/cliente/:clienteId',
  validar(schemaCrearProductoCliente),
  productosController.crearProductoCliente
)
router.post('/cliente/:clienteId/asignar', productosController.asignarProductosGenerales)
router.get('/:id', productosController.obtenerProductoCliente)
router.put('/:id', productosController.actualizarProductoCliente)
router.delete('/:id', productosController.eliminarProductoCliente)

export default router
