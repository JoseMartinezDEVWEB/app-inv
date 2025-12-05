import { randomBytes } from 'crypto'
import dbManager from '../config/database.js'

class Invitacion {
  // Generar código único
  static generarCodigoUnico() {
    return randomBytes(16).toString('hex')
  }

  // Crear nueva invitación
  static crear(datos) {
    const db = dbManager.getDatabase()

    const {
      contableId,
      expiraEnHoras = 24,
      metadata = {},
    } = datos

    const codigoQR = Invitacion.generarCodigoUnico()
    const expiraEn = new Date(Date.now() + expiraEnHoras * 60 * 60 * 1000).toISOString()

    const stmt = db.prepare(`
      INSERT INTO invitaciones (contableId, codigoQR, expiraEn, metadata)
      VALUES (?, ?, ?, ?)
    `)

    const info = stmt.run(contableId, codigoQR, expiraEn, JSON.stringify(metadata))

    return Invitacion.buscarPorId(info.lastInsertRowid)
  }

  // Buscar invitación por ID
  static buscarPorId(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare('SELECT * FROM invitaciones WHERE id = ?')
    const invitacion = stmt.get(id)

    if (invitacion) {
      invitacion.metadata = JSON.parse(invitacion.metadata || '{}')
      // Alias para compatibilidad con frontend que espera _id
      invitacion._id = invitacion.id
    }

    return invitacion
  }

  // Buscar por código
  static buscarPorCodigo(codigo) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare('SELECT * FROM invitaciones WHERE codigoQR = ?')
    const invitacion = stmt.get(codigo)

    if (invitacion) {
      invitacion.metadata = JSON.parse(invitacion.metadata || '{}')
      // Alias para compatibilidad con frontend que espera _id
      invitacion._id = invitacion.id
    }

    return invitacion
  }

  // Buscar invitaciones activas de un contable
  static buscarActivas(contableId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT * FROM invitaciones
      WHERE contableId = ? AND estado = 'activa' AND expiraEn > datetime('now')
      ORDER BY createdAt DESC
    `)

    const invitaciones = stmt.all(contableId)

    return invitaciones.map(inv => ({
      ...inv,
      ...inv,
      metadata: JSON.parse(inv.metadata || '{}'),
      // Alias para compatibilidad con frontend que espera _id
      _id: inv.id,
    }))
  }

  // Marcar como usada
  static marcarComoUsada(id, usadaPor) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      UPDATE invitaciones
      SET estado = 'usada', usadaEn = CURRENT_TIMESTAMP, usadaPor = ?
      WHERE id = ?
    `)
    stmt.run(usadaPor, id)

    return Invitacion.buscarPorId(id)
  }

  // Cancelar invitación
  static cancelar(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      UPDATE invitaciones
      SET estado = 'cancelada'
      WHERE id = ?
    `)
    stmt.run(id)

    return Invitacion.buscarPorId(id)
  }

  // Limpiar invitaciones expiradas
  static limpiarExpiradas() {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      UPDATE invitaciones
      SET estado = 'expirada'
      WHERE estado = 'activa' AND expiraEn < datetime('now')
    `)
    const info = stmt.run()
    return info.changes
  }
}

export default Invitacion
