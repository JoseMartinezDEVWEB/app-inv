import express from 'express'
import solicitudesController from '../controllers/solicitudesController.js'
import { validarJWT, validarRol } from '../middlewares/auth.js'
import { validar, schemaCrearSolicitud } from '../middlewares/validation.js'

const router = express.Router()

// Rutas públicas
router.post('/solicitar', validar(schemaCrearSolicitud), solicitudesController.crearSolicitud)
router.get('/estado/:solicitudId', solicitudesController.verificarEstado)
router.post('/:solicitudId/productos-offline', solicitudesController.agregarProductoOffline)

// Rutas protegidas
router.use(validarJWT)
router.use(validarRol('contable', 'contador', 'administrador'))

router.get('/pendientes', solicitudesController.listarPendientes)
router.get('/conectados', solicitudesController.listarConectados)
router.post('/:solicitudId/aceptar', solicitudesController.aceptarSolicitud)
router.post('/:solicitudId/rechazar', solicitudesController.rechazarSolicitud)
router.get('/:solicitudId/productos-offline', solicitudesController.obtenerProductosOffline)
router.post('/:solicitudId/sincronizar', solicitudesController.sincronizarProductos)
router.post('/:solicitudId/desconectar', solicitudesController.desconectarColaborador)

export default router
