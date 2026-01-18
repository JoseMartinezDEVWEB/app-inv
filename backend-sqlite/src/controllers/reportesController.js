import dbManager from '../config/database.js'
import logger from '../utils/logger.js'
import SesionInventario from '../models/SesionInventario.js'

class ReportesController {
  /**
   * GET /api/reportes/estadisticas
   * Obtiene estadísticas generales para el dashboard y reportes
   */
  obtenerEstadisticas = async (req, res) => {
    const { fechaInicio, fechaFin } = req.query

    try {
      const db = dbManager.getDatabase()
      
      let whereClause = "WHERE estado = 'completada'"
      let params = []

      if (fechaInicio) {
        whereClause += " AND fecha >= ?"
        params.push(fechaInicio)
      }
      if (fechaFin) {
        whereClause += " AND fecha <= ?"
        params.push(fechaFin)
      }

      // 1. Estadísticas Generales
      // Necesitamos: totalSesiones, valorTotalInventarios, totalProductosContados, valorPromedioInventario
      const statsStmt = db.prepare(`
        SELECT 
          COUNT(*) as totalSesiones,
          SUM(CAST(json_extract(totales, '$.valorTotalInventario') AS REAL)) as valorTotalInventarios,
          SUM(CAST(json_extract(totales, '$.totalProductosContados') AS INTEGER)) as totalProductosContados
        FROM sesiones_inventario
        ${whereClause}
      `)
      
      const stats = statsStmt.get(...params)
      
      const totalSesiones = stats.totalSesiones || 0
      const valorTotalInventarios = stats.valorTotalInventarios || 0
      const totalProductosContados = stats.totalProductosContados || 0
      const valorPromedioInventario = totalSesiones > 0 ? valorTotalInventarios / totalSesiones : 0

      // 2. Distribución Mensual (últimos 6 meses)
      const mensualStmt = db.prepare(`
        SELECT 
          strftime('%m', fecha) as mes,
          strftime('%Y', fecha) as año,
          COUNT(*) as sesiones,
          SUM(CAST(json_extract(totales, '$.valorTotalInventario') AS REAL)) as valorTotal
        FROM sesiones_inventario
        WHERE estado = 'completada'
        GROUP BY año, mes
        ORDER BY año DESC, mes DESC
        LIMIT 6
      `)
      
      const distribucionMensualRaw = mensualStmt.all()
      const distribucionMensual = distribucionMensualRaw.map(item => ({
        _id: { mes: parseInt(item.mes), año: parseInt(item.año) },
        sesiones: item.sesiones,
        valorTotal: item.valorTotal || 0
      }))

      return res.status(200).json({
        exito: true,
        datos: {
          estadisticasGenerales: {
            totalSesiones,
            valorTotalInventarios,
            totalProductosContados,
            valorPromedioInventario
          },
          distribucionMensual
        }
      })
    } catch (error) {
      logger.error('Error obteniendo estadísticas de reportes:', error)
      return res.status(500).json({
        exito: false,
        mensaje: 'Error al obtener estadísticas de reportes',
        error: error.message
      })
    }
  }

  /**
   * GET /api/reportes/balance/:sesionId
   */
  obtenerBalance = async (req, res) => {
    const { sesionId } = req.params
    try {
      const sesion = SesionInventario.buscarPorId(sesionId)
      if (!sesion) {
        return res.status(404).json({ exito: false, mensaje: 'Sesión no encontrada' })
      }
      return res.status(200).json({ exito: true, datos: sesion })
    } catch (error) {
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener balance', error: error.message })
    }
  }

  /**
   * GET /api/reportes/inventario/:sesionId
   */
  obtenerInventario = async (req, res) => {
    const { sesionId } = req.params
    try {
      const sesion = SesionInventario.buscarPorId(sesionId)
      if (!sesion) {
        return res.status(404).json({ exito: false, mensaje: 'Sesión no encontrada' })
      }
      return res.status(200).json({ exito: true, datos: sesion.productosContados || [] })
    } catch (error) {
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener inventario', error: error.message })
    }
  }

  /**
   * GET /api/reportes/balance/:sesionId/pdf
   * (Stub para evitar 404, en un sistema real generaría un PDF)
   */
  descargarBalancePDF = async (req, res) => {
    return res.status(501).json({ exito: false, mensaje: 'Generación de PDF no implementada en esta versión SQLite' })
  }

  /**
   * POST /api/reportes/inventario/:sesionId/pdf
   * (Stub para evitar 404, en un sistema real generaría un PDF)
   */
  descargarInventarioPDF = async (req, res) => {
    return res.status(501).json({ exito: false, mensaje: 'Generación de PDF no implementada en esta versión SQLite' })
  }
}

export default new ReportesController()








