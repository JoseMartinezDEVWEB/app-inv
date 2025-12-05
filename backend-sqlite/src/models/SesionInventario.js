import dbManager from '../config/database.js'
import ProductoCliente from './ProductoCliente.js'

class SesionInventario {
  // Generar número único de sesión
  static generarNumeroSesion() {
    const db = dbManager.getDatabase()
    const ahora = new Date()
    const fecha = ahora.toISOString().slice(0, 10).replace(/-/g, '')

    // Obtener contador del día
    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM sesiones_inventario
      WHERE DATE(createdAt) = DATE('now')
    `)
    const { count } = stmt.get()

    const numero = (count + 1).toString().padStart(3, '0')
    return `INV-${fecha}-${numero}`
  }

  // Crear nueva sesión
  static crear(datos) {
    const db = dbManager.getDatabase()

    const {
      clienteNegocioId,
      contadorId,
      fecha = new Date().toISOString(),
      configuracion = {},
    } = datos

    const numeroSesion = SesionInventario.generarNumeroSesion()

    const stmt = db.prepare(`
      INSERT INTO sesiones_inventario (
        clienteNegocioId, contadorId, fecha, numeroSesion, configuracion
      ) VALUES (?, ?, ?, ?, ?)
    `)

    const info = stmt.run(
      clienteNegocioId,
      contadorId,
      fecha,
      numeroSesion,
      JSON.stringify(configuracion)
    )

    return SesionInventario.buscarPorId(info.lastInsertRowid)
  }

  // Buscar sesión por ID
  static buscarPorId(id) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT 
        si.*,
        cn.nombre as nombreCliente,
        cn.telefono as telefonoCliente,
        cn.direccion as direccionCliente,
        u.nombre as nombreContador,
        u.email as emailContador
      FROM sesiones_inventario si
      INNER JOIN clientes_negocios cn ON si.clienteNegocioId = cn.id
      INNER JOIN usuarios u ON si.contadorId = u.id
      WHERE si.id = ?
    `)
    const sesion = stmt.get(id)

    if (sesion) {
      sesion.datosFinancieros = JSON.parse(sesion.datosFinancieros || '{}')
      sesion.totales = JSON.parse(sesion.totales || '{}')
      sesion.configuracion = JSON.parse(sesion.configuracion || '{}')
      sesion.timerEnMarcha = Boolean(sesion.timerEnMarcha)
      // Alias para compatibilidad con frontend que espera _id
      sesion._id = sesion.id


      // Obtener colaboradores
      sesion.colaboradores = SesionInventario.obtenerColaboradores(id)

      // Obtener productos contados
      sesion.productosContados = SesionInventario.obtenerProductosContados(id)
    }

    return sesion
  }

  // Obtener colaboradores de una sesión
  static obtenerColaboradores(sesionId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT 
        sc.*,
        u.nombre as nombreUsuario,
        u.email as emailUsuario
      FROM sesiones_colaboradores sc
      INNER JOIN usuarios u ON sc.usuarioId = u.id
      WHERE sc.sesionInventarioId = ? AND sc.activo = 1
    `)
    return stmt.all(sesionId)
  }

  // Obtener productos contados
  static obtenerProductosContados(sesionId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT 
        pc.*,
        u.nombre as nombreAgregadoPor
      FROM productos_contados pc
      LEFT JOIN usuarios u ON pc.agregadoPorId = u.id
      WHERE pc.sesionInventarioId = ?
      ORDER BY pc.createdAt DESC
    `)

    const productos = stmt.all(sesionId)

    return productos.map(producto => ({
      ...producto,
      discrepancia: JSON.parse(producto.discrepancia || '{}'),
      requiereAprobacion: Boolean(producto.requiereAprobacion),
      aprobado: Boolean(producto.aprobado),
    }))
  }

  // Buscar sesiones con filtros
  static buscar(opciones = {}) {
    const db = dbManager.getDatabase()

    const {
      limite = 20,
      pagina = 1,
      contadorId = null,
      clienteId = null,
      estado = null,
      fechaDesde = null,
      fechaHasta = null,
    } = opciones

    const offset = (pagina - 1) * limite

    let whereConditions = []
    let params = []

    if (contadorId) {
      whereConditions.push('si.contadorId = ?')
      params.push(contadorId)
    }

    if (clienteId) {
      whereConditions.push('si.clienteNegocioId = ?')
      params.push(clienteId)
    }

    if (estado) {
      whereConditions.push('si.estado = ?')
      params.push(estado)
    }

    if (fechaDesde) {
      whereConditions.push('si.fecha >= ?')
      params.push(fechaDesde)
    }

    if (fechaHasta) {
      whereConditions.push('si.fecha <= ?')
      params.push(fechaHasta)
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Contar total
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total
      FROM sesiones_inventario si
      ${whereClause}
    `)
    const { total } = countStmt.get(...params)

    // Obtener sesiones
    const stmt = db.prepare(`
      SELECT 
        si.*,
        cn.nombre as nombreCliente,
        u.nombre as nombreContador
      FROM sesiones_inventario si
      INNER JOIN clientes_negocios cn ON si.clienteNegocioId = cn.id
      INNER JOIN usuarios u ON si.contadorId = u.id
      ${whereClause}
      ORDER BY si.fecha DESC, si.createdAt DESC
      LIMIT ? OFFSET ?
    `)

    const sesiones = stmt.all(...params, limite, offset).map(sesion => ({
      ...sesion,
      datosFinancieros: JSON.parse(sesion.datosFinancieros || '{}'),
      totales: JSON.parse(sesion.totales || '{}'),
      configuracion: JSON.parse(sesion.configuracion || '{}'),
      timerEnMarcha: Boolean(sesion.timerEnMarcha),
      // Alias para compatibilidad con frontend que espera _id
      _id: sesion.id,
    }))

    return {
      datos: sesiones,
      paginacion: {
        total,
        pagina,
        limite,
        totalPaginas: Math.ceil(total / limite),
      },
    }
  }

  // Buscar sesiones de un cliente
  static buscarPorCliente(clienteId, limite = 10) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      SELECT 
        si.*,
        u.nombre as nombreContador
      FROM sesiones_inventario si
      INNER JOIN usuarios u ON si.contadorId = u.id
      WHERE si.clienteNegocioId = ?
      ORDER BY si.fecha DESC
      LIMIT ?
    `)

    const sesiones = stmt.all(clienteId, limite)

    return sesiones.map(sesion => ({
      ...sesion,
      datosFinancieros: JSON.parse(sesion.datosFinancieros || '{}'),
      totales: JSON.parse(sesion.totales || '{}'),
      configuracion: JSON.parse(sesion.configuracion || '{}'),
      timerEnMarcha: Boolean(sesion.timerEnMarcha),
      // Alias para compatibilidad con frontend que espera _id
      _id: sesion.id,
    }))
  }

  // Agregar producto contado
  static agregarProductoContado(sesionId, datosProducto) {
    const db = dbManager.getDatabase()

    const {
      productoClienteId,
      cantidadContada,
      agregadoPorId,
      notas = null,
    } = datosProducto

    // Obtener datos del producto
    const producto = ProductoCliente.buscarPorId(productoClienteId)
    if (!producto) {
      throw new Error('Producto no encontrado')
    }

    const valorTotal = cantidadContada * producto.costo

    // Verificar si ya existe en la sesión
    const existeStmt = db.prepare(`
      SELECT id FROM productos_contados
      WHERE sesionInventarioId = ? AND productoClienteId = ?
    `)
    const existe = existeStmt.get(sesionId, productoClienteId)

    if (existe) {
      // Actualizar
      const updateStmt = db.prepare(`
        UPDATE productos_contados
        SET cantidadContada = ?, valorTotal = ?, notas = ?, agregadoPorId = ?
        WHERE id = ?
      `)
      updateStmt.run(cantidadContada, valorTotal, notas, agregadoPorId, existe.id)

      // Actualizar estadísticas
      ProductoCliente.actualizarEstadisticas(productoClienteId, cantidadContada)

      // Recalcular totales
      SesionInventario.calcularTotales(sesionId)

      return existe.id
    } else {
      // Insertar nuevo
      const insertStmt = db.prepare(`
        INSERT INTO productos_contados (
          sesionInventarioId, productoClienteId, nombreProducto, unidadProducto,
          costoProducto, skuProducto, cantidadContada, valorTotal, notas, agregadoPorId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const info = insertStmt.run(
        sesionId,
        productoClienteId,
        producto.nombre,
        producto.unidad,
        producto.costo,
        producto.sku,
        cantidadContada,
        valorTotal,
        notas,
        agregadoPorId
      )

      // Actualizar estadísticas
      ProductoCliente.actualizarEstadisticas(productoClienteId, cantidadContada)

      // Recalcular totales
      SesionInventario.calcularTotales(sesionId)

      return info.lastInsertRowid
    }
  }

  // Remover producto contado
  static removerProductoContado(sesionId, productoContadoId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      DELETE FROM productos_contados 
      WHERE id = ? AND sesionInventarioId = ?
    `)
    const info = stmt.run(productoContadoId, sesionId)

    if (info.changes > 0) {
      SesionInventario.calcularTotales(sesionId)
    }

    return info.changes > 0
  }

  // Calcular totales de la sesión
  static calcularTotales(sesionId) {
    const db = dbManager.getDatabase()

    const sesion = SesionInventario.buscarPorId(sesionId)
    if (!sesion) return

    const stmt = db.prepare(`
      SELECT 
        SUM(valorTotal) as valorTotalInventario,
        COUNT(*) as totalProductosContados
      FROM productos_contados
      WHERE sesionInventarioId = ?
    `)

    const { valorTotalInventario, totalProductosContados } = stmt.get(sesionId)

    const datosFinancieros = sesion.datosFinancieros || {}

    const totalActivos = (valorTotalInventario || 0) +
      (datosFinancieros.efectivoEnCajaYBanco || 0) +
      (datosFinancieros.cuentasPorCobrar || 0) +
      (datosFinancieros.activosFijos || 0)

    const totalPasivos = datosFinancieros.cuentasPorPagar || 0
    const capitalContable = totalActivos - totalPasivos

    const totales = {
      valorTotalInventario: valorTotalInventario || 0,
      totalProductosContados: totalProductosContados || 0,
      totalActivos,
      totalPasivos,
      capitalContable,
    }

    const updateStmt = db.prepare(`
      UPDATE sesiones_inventario
      SET totales = ?
      WHERE id = ?
    `)

    updateStmt.run(JSON.stringify(totales), sesionId)
  }

  // Actualizar datos financieros
  static actualizarDatosFinancieros(sesionId, nuevosDatos) {
    const db = dbManager.getDatabase()

    const sesion = SesionInventario.buscarPorId(sesionId)
    if (!sesion) return null

    const datosActuales = sesion.datosFinancieros || {}
    const datosActualizados = { ...datosActuales, ...nuevosDatos }

    const stmt = db.prepare(`
      UPDATE sesiones_inventario
      SET datosFinancieros = ?
      WHERE id = ?
    `)

    stmt.run(JSON.stringify(datosActualizados), sesionId)

    // Recalcular totales
    SesionInventario.calcularTotales(sesionId)

    return SesionInventario.buscarPorId(sesionId)
  }

  // Reanudar timer
  static reanudarTimer(sesionId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      UPDATE sesiones_inventario
      SET timerEnMarcha = 1, timerUltimoInicio = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    stmt.run(sesionId)
  }

  // Pausar timer
  static pausarTimer(sesionId) {
    const db = dbManager.getDatabase()

    const sesion = SesionInventario.buscarPorId(sesionId)
    if (!sesion || !sesion.timerEnMarcha) return

    // Calcular segundos transcurridos
    const inicio = new Date(sesion.timerUltimoInicio)
    const ahora = new Date()
    const segundosTranscurridos = Math.floor((ahora - inicio) / 1000)

    const nuevoAcumulado = sesion.timerAcumuladoSegundos + segundosTranscurridos

    const stmt = db.prepare(`
      UPDATE sesiones_inventario
      SET timerEnMarcha = 0, 
          timerAcumuladoSegundos = ?,
          timerUltimoInicio = NULL
      WHERE id = ?
    `)
    stmt.run(nuevoAcumulado, sesionId)
  }

  // Completar sesión
  static completarSesion(sesionId) {
    const db = dbManager.getDatabase()

    // Pausar timer si está en marcha
    SesionInventario.pausarTimer(sesionId)

    // Calcular duración en minutos
    const sesion = SesionInventario.buscarPorId(sesionId)
    const duracionMinutos = Math.floor(sesion.timerAcumuladoSegundos / 60)

    const stmt = db.prepare(`
      UPDATE sesiones_inventario
      SET estado = 'completada', duracionMinutos = ?
      WHERE id = ?
    `)
    stmt.run(duracionMinutos, sesionId)

    return SesionInventario.buscarPorId(sesionId)
  }

  // Cancelar sesión
  static cancelarSesion(sesionId) {
    const db = dbManager.getDatabase()
    const stmt = db.prepare(`
      UPDATE sesiones_inventario
      SET estado = 'cancelada'
      WHERE id = ?
    `)
    stmt.run(sesionId)

    return SesionInventario.buscarPorId(sesionId)
  }

  // Obtener estadísticas del contador
  static obtenerEstadisticasContador(contadorId, fechaInicio = null, fechaFin = null) {
    const db = dbManager.getDatabase()

    let whereClause = 'WHERE contadorId = ?'
    let params = [contadorId]

    if (fechaInicio) {
      whereClause += ' AND fecha >= ?'
      params.push(fechaInicio)
    }

    if (fechaFin) {
      whereClause += ' AND fecha <= ?'
      params.push(fechaFin)
    }

    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as totalSesiones,
        SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) as sesionesCompletadas,
        AVG(duracionMinutos) as duracionPromedio
      FROM sesiones_inventario
      ${whereClause}
    `)

    return stmt.get(...params)
  }
}

export default SesionInventario
