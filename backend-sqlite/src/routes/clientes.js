import express from 'express'
import clientesController from '../controllers/clientesController.js'
import { validarJWT, validarRol } from '../middlewares/auth.js'
import { validar, schemaCrearCliente, schemaActualizarCliente } from '../middlewares/validation.js'

const router = express.Router()

// Todas las rutas requieren autenticación y rol de contable/contador/administrador
router.use(validarJWT)
router.use(validarRol('contable', 'contador', 'administrador'))

router.get('/', clientesController.listarClientes)
router.post('/', validar(schemaCrearCliente), clientesController.crearCliente)
router.get('/:id', clientesController.obtenerCliente)
router.put('/:id', validar(schemaActualizarCliente), clientesController.actualizarCliente)
router.delete('/:id', clientesController.desactivarCliente)
router.patch('/:id/activar', clientesController.activarCliente)
router.get('/:id/estadisticas', clientesController.obtenerEstadisticas)
router.patch('/:id/configuracion', clientesController.actualizarConfiguracion)

export default router
