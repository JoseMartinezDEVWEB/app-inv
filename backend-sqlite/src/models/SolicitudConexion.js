import { randomBytes } from 'crypto'
import dbManager from '../config/database.js'

class SolicitudConexion {
  // Generar código de conexión único
  static generarCodigoConexion() {
    return randomBytes(12).toString('hex').toUpperCase()
  }

  // Crear nueva solicitud
  static crear(datos) {
    const db = dbManager.getDatabase()

    const {
      contableId,
      nombreColaborador,
      metadata = {},
    } = datos

    const codigoConexion = SolicitudConexion.generarCodigoConexion()
    const expiraEn = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 horas

    const stmt = db.prepare(`
      INSERT INTO solicitudes_conexion (contableId, nombreColaborador, codigoConexion, expiraEn, metadata)
      VALUES (?, ?, ?, ?, ?)
    `)

    const info = stmt.run(contableId, nombreColaborador, codigoConexion, expiraEn, JSON.stringify(metadata))

    return SolicitudConexion.buscarPorId(info.lastInsertRowid)
  }

  // Buscar por ID
  static buscarPorId(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare('SELECT * FROM solicitudes_conexion WHERE id = ?')
    const solicitud = stmt.get(id)

    if (solicitud) {
      solicitud.metadata = JSON.parse(solicitud.metadata || '{}')

      // Obtener productos offline
      solicitud.productosOffline = SolicitudConexion.obtenerProductosOffline(id)
      // Alias para compatibilidad con frontend que espera _id
      solicitud._id = solicitud.id
    }

    return solicitud
  }

  // Buscar por código
  static buscarPorCodigo(codigo) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare('SELECT * FROM solicitudes_conexion WHERE codigoConexion = ?')
    const solicitud = stmt.get(codigo)

    if (solicitud) {
      solicitud.metadata = JSON.parse(solicitud.metadata || '{}')
      solicitud.productosOffline = SolicitudConexion.obtenerProductosOffline(solicitud.id)
      // Alias para compatibilidad con frontend que espera _id
      solicitud._id = solicitud.id
    }

    return solicitud
  }

  // Buscar solicitudes pendientes de un contable
  static buscarPendientes(contableId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM solicitudes_conexion
      WHERE contableId = ? AND estado = 'pendiente'
      ORDER BY createdAt DESC
    `)

    const solicitudes = stmt.all(contableId)

    return solicitudes.map(sol => ({
      ...sol,
      ...sol,
      metadata: JSON.parse(sol.metadata || '{}'),
      // Alias para compatibilidad con frontend que espera _id
      _id: sol.id,
    }))
  }

  // Buscar solicitudes conectadas de un contable
  static buscarConectados(contableId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM solicitudes_conexion
      WHERE contableId = ? AND estado = 'aceptada'
      ORDER BY aceptadaEn DESC
    `)

    const solicitudes = stmt.all(contableId)

    return solicitudes.map(sol => ({
      ...sol,
      ...sol,
      metadata: JSON.parse(sol.metadata || '{}'),
      // Alias para compatibilidad con frontend que espera _id
      _id: sol.id,
    }))
  }

  // Aceptar solicitud
  static aceptar(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      UPDATE solicitudes_conexion
      SET estado = 'aceptada', aceptadaEn = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    stmt.run(id)

    return SolicitudConexion.buscarPorId(id)
  }

  // Rechazar solicitud
  static rechazar(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      UPDATE solicitudes_conexion
      SET estado = 'rechazada', rechazadaEn = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    stmt.run(id)

    return SolicitudConexion.buscarPorId(id)
  }

  // Desconectar
  static desconectar(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      UPDATE solicitudes_conexion
      SET estado = 'desconectada', desconectadaEn = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    stmt.run(id)

    return SolicitudConexion.buscarPorId(id)
  }

  // Agregar producto offline
  static agregarProductoOffline(solicitudId, productoData) {
    const db = dbManager.getDatabase()

    const {
      nombre,
      costo = 0,
      unidad = 'unidad',
      categoria = 'General',
    } = productoData

    const stmt = db.prepare(`
      INSERT INTO productos_offline (solicitudConexionId, nombre, costo, unidad, categoria)
      VALUES (?, ?, ?, ?, ?)
    `)

    const info = stmt.run(solicitudConexionId, nombre, costo, unidad, categoria)

    return info.lastInsertRowid
  }

  // Obtener productos offline
  static obtenerProductosOffline(solicitudId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM productos_offline
      WHERE solicitudConexionId = ?
      ORDER BY createdAt
    `)

    const productos = stmt.all(solicitudId)

    return productos.map(prod => ({
      ...prod,
      sincronizado: Boolean(prod.sincronizado),
    }))
  }

  // Sincronizar productos offline
  static sincronizarProductos(solicitudId, mapeoIds) {
    const db = dbManager.getDatabase()

    for (const [temporalId, productoClienteId] of Object.entries(mapeoIds)) {
      const stmt = db.prepare(`
        UPDATE productos_offline
        SET sincronizado = 1, productoClienteId = ?
        WHERE id = ? AND solicitudConexionId = ?
      `)
      stmt.run(productoClienteId, temporalId, solicitudId)
    }

    return true
  }
}

export default SolicitudConexion
