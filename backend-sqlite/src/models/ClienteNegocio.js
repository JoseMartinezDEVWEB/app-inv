import dbManager from '../config/database.js'

class ClienteNegocio {
  // Crear nuevo cliente
  static crear(datos) {
    const db = dbManager.getDatabase()

    const {
      nombre,
      telefono,
      direccion,
      contadorAsignadoId,
      configuracionInventario = {},
      proximaVisita = null,
      notas = null,
    } = datos

    const stmt = db.prepare(`
      INSERT INTO clientes_negocios (
        nombre, telefono, direccion, contadorAsignadoId,
        configuracionInventario, proximaVisita, notas, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const info = stmt.run(
      nombre,
      telefono,
      direccion,
      contadorAsignadoId,
      JSON.stringify(configuracionInventario),
      proximaVisita,
      notas,
      1
    )

    return ClienteNegocio.buscarPorId(info.lastInsertRowid)
  }

  // Buscar cliente por ID
  static buscarPorId(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT 
        cn.*,
        u.nombre as nombreContador,
        u.email as emailContador
      FROM clientes_negocios cn
      INNER JOIN usuarios u ON cn.contadorAsignadoId = u.id
      WHERE cn.id = ?
    `)
    const cliente = stmt.get(id)

    if (cliente) {
      cliente.configuracionInventario = JSON.parse(cliente.configuracionInventario || '{}')
      cliente.estadisticas = JSON.parse(cliente.estadisticas || '{}')
      // Alias para compatibilidad con frontend que espera _id
      cliente._id = cliente.id
    }

    return cliente
  }

  // Buscar clientes de un contador (con paginación)
  static buscarPorContador(contadorId, opciones = {}) {
    const db = dbManager.getDatabase()

    const {
      limite = 50,
      pagina = 1,
      buscar = null,
      soloActivos = true,
    } = opciones

    const offset = (pagina - 1) * limite

    let whereConditions = ['cn.contadorAsignadoId = ?']
    let params = [contadorId]

    if (soloActivos) {
      whereConditions.push('cn.activo = 1')
    }

    if (buscar) {
      whereConditions.push('(cn.nombre LIKE ? OR cn.telefono LIKE ?)')
      const searchTerm = `%${buscar}%`
      params.push(searchTerm, searchTerm)
    }

    const whereClause = whereConditions.join(' AND ')

    // Contar total
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM clientes_negocios cn
      WHERE ${whereClause}
    `)
    const { total } = countStmt.get(...params)

    // Obtener clientes
    const stmt = db.prepare(`
      SELECT 
        cn.*,
        u.nombre as nombreContador
      FROM clientes_negocios cn
      INNER JOIN usuarios u ON cn.contadorAsignadoId = u.id
      WHERE ${whereClause}
      ORDER BY cn.nombre
      LIMIT ? OFFSET ?
    `)

    const clientes = stmt.all(...params, limite, offset).map(cliente => ({
      ...cliente,
      ...cliente,
      configuracionInventario: JSON.parse(cliente.configuracionInventario || '{}'),
      estadisticas: JSON.parse(cliente.estadisticas || '{}'),
      // Alias para compatibilidad con frontend que espera _id
      _id: cliente.id,
    }))

    return {
      datos: clientes,
      paginacion: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    }
  }

  // Buscar clientes con inventario habilitado
  static buscarConInventarioHabilitado(contadorId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT 
        cn.*,
        u.nombre as nombreContador
      FROM clientes_negocios cn
      INNER JOIN usuarios u ON cn.contadorAsignadoId = u.id
      WHERE cn.contadorAsignadoId = ? AND cn.activo = 1
      ORDER BY cn.nombre
    `)

    const clientes = stmt.all(contadorId).map(cliente => {
      const configuracion = JSON.parse(cliente.configuracionInventario || '{}')
      cliente.configuracionInventario = configuracion
      cliente.estadisticas = JSON.parse(cliente.estadisticas || '{}')
      // Alias para compatibilidad con frontend que espera _id
      cliente._id = cliente.id
      return cliente
    }).filter(cliente => cliente.configuracionInventario.habilitado === true)

    return clientes
  }

  // Actualizar cliente
  static actualizar(id, datos) {
    const db = dbManager.getDatabase()

    const campos = []
    const valores = []

    if (datos.nombre !== undefined) {
      campos.push('nombre = ?')
      valores.push(datos.nombre)
    }
    if (datos.telefono !== undefined) {
      campos.push('telefono = ?')
      valores.push(datos.telefono)
    }
    if (datos.direccion !== undefined) {
      campos.push('direccion = ?')
      valores.push(datos.direccion)
    }
    if (datos.configuracionInventario !== undefined) {
      campos.push('configuracionInventario = ?')
      valores.push(JSON.stringify(datos.configuracionInventario))
    }
    if (datos.proximaVisita !== undefined) {
      campos.push('proximaVisita = ?')
      valores.push(datos.proximaVisita)
    }
    if (datos.notas !== undefined) {
      campos.push('notas = ?')
      valores.push(datos.notas)
    }

    if (campos.length === 0) {
      return ClienteNegocio.buscarPorId(id)
    }

    valores.push(id)

    const stmt = db.prepare(`
      UPDATE clientes_negocios 
      SET ${campos.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...valores)
    return ClienteNegocio.buscarPorId(id)
  }

  // Desactivar cliente
  static desactivar(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare('UPDATE clientes_negocios SET activo = 0 WHERE id = ?')
    stmt.run(id)
    return true
  }

  // Activar cliente
  static activar(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare('UPDATE clientes_negocios SET activo = 1 WHERE id = ?')
    stmt.run(id)
    return ClienteNegocio.buscarPorId(id)
  }

  // Incrementar contador de inventarios
  static incrementarContadorInventario(id) {
    const db = dbManager.getDatabase()

    // Obtener cliente actual
    const cliente = ClienteNegocio.buscarPorId(id)
    if (!cliente) return null

    const estadisticas = cliente.estadisticas || {}
    estadisticas.totalInventarios = (estadisticas.totalInventarios || 0) + 1
    estadisticas.ultimoInventario = new Date().toISOString()

    const stmt = db.prepare(`
      UPDATE clientes_negocios 
      SET estadisticas = ?
      WHERE id = ?
    `)

    stmt.run(JSON.stringify(estadisticas), id)
    return ClienteNegocio.buscarPorId(id)
  }

  // Actualizar estadísticas
  static actualizarEstadisticas(id, valorInventario) {
    const db = dbManager.getDatabase()

    const cliente = ClienteNegocio.buscarPorId(id)
    if (!cliente) return null

    const estadisticas = cliente.estadisticas || {}
    estadisticas.totalInventarios = (estadisticas.totalInventarios || 0) + 1
    estadisticas.ultimoInventario = new Date().toISOString()

    // Calcular valor promedio
    const totalAnterior = estadisticas.totalInventarios - 1
    const valorPromedioAnterior = estadisticas.valorPromedioInventario || 0
    estadisticas.valorPromedioInventario =
      (valorPromedioAnterior * totalAnterior + valorInventario) / estadisticas.totalInventarios

    const stmt = db.prepare(`
      UPDATE clientes_negocios 
      SET estadisticas = ?
      WHERE id = ?
    `)

    stmt.run(JSON.stringify(estadisticas), id)
    return ClienteNegocio.buscarPorId(id)
  }

  // Obtener estadísticas del cliente
  static obtenerEstadisticas(id) {
    const db = dbManager.getDatabase()

    // Estadísticas de sesiones
    const sesionesStmt = db.prepare(`
      SELECT 
        COUNT(*) as totalSesiones,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as sesionesCompletadas,
        MAX(fecha) as ultimaSesion
      FROM sesiones_inventario
      WHERE clienteNegocioId = ?
    `)
    const sesiones = sesionesStmt.get(id)

    // Estadísticas de productos
    const productosStmt = db.prepare(`
      SELECT COUNT(*) as totalProductos
      FROM productos_cliente
      WHERE clienteNegocioId = ? AND activo = 1
    `)
    const productos = productosStmt.get(id)

    return {
      ...sesiones,
      ...productos,
    }
  }
}

export default ClienteNegocio
