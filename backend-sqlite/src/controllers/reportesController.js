import PDFDocument from 'pdfkit'
import dbManager from '../config/database.js'
import logger from '../utils/logger.js'
import SesionInventario from '../models/SesionInventario.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class ReportesController {
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

      const statsStmt = db.prepare(`
        SELECT 
          COUNT(*) as totalSesiones,
          SUM(CAST(json_extract(totales, '$.valorTotalInventario') AS REAL)) as valorTotalInventarios,
          SUM(CAST(json_extract(totales, '$.totalProductosContados') AS INTEGER)) as totalProductosContados
        FROM sesiones_inventario
        ${whereClause}
      `)

      const stats = statsStmt.get(...params)
      return res.status(200).json({
        exito: true,
        datos: {
          estadisticasGenerales: {
            totalSesiones: stats.totalSesiones || 0,
            valorTotalInventarios: stats.valorTotalInventarios || 0,
            totalProductosContados: stats.totalProductosContados || 0,
            valorPromedioInventario: (stats.totalSesiones || 0) > 0 ? stats.valorTotalInventarios / stats.totalSesiones : 0
          }
        }
      })
    } catch (error) {
      logger.error('Error estadísticas:', error)
      return res.status(500).json({ exito: false, mensaje: 'Error' })
    }
  }

  obtenerBalance = async (req, res) => {
    const { sesionId } = req.params
    try {
      const sesion = SesionInventario.buscarPorId(sesionId)
      return res.status(200).json({ exito: true, datos: sesion })
    } catch (error) {
      return res.status(500).json({ exito: false, mensaje: 'Error' })
    }
  }

  obtenerInventario = async (req, res) => {
    const { sesionId } = req.params
    try {
      const sesion = SesionInventario.buscarPorId(sesionId)
      return res.status(200).json({ exito: true, datos: sesion?.productosContados || [] })
    } catch (error) {
      return res.status(500).json({ exito: false, mensaje: 'Error' })
    }
  }

  /**
   * REPORTE UNIFICADO
   * POST /api/reportes/inventario/:sesionId/pdf
   */
  descargarInventarioPDF = async (req, res) => {
    const { sesionId } = req.params
    const options = req.body || {}

    try {
      const sesion = SesionInventario.buscarPorId(sesionId)
      if (!sesion) return res.status(404).json({ exito: false, mensaje: 'Sesión no encontrada' })

      const doc = new PDFDocument({ margin: 40, size: 'LETTER', bufferPages: true })
      const filename = `Reporte_${sesion.numeroSesion}.pdf`

      res.setHeader('Content-disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-type', 'application/pdf')
      doc.pipe(res)

      const tealHeader = '#0f766e' // teal-700
      const blueAccent = '#1d4ed8' // blue-700
      const redAccent = '#b91c1c'  // red-700
      const darkText = '#111827'
      const grayText = '#4b5563'
      const lightGray = '#f3f4f6'
      const appTitle = 'TECH STOCK J4-PRO'

      // Path al logo
      const logoPath = path.join(__dirname, '..', '..', '..', 'frontend-desktop', 'src', 'img', 'logo_transparent.png')
      const hasLogo = fs.existsSync(logoPath)

      const isCompleto = options.tipoDocumento === 'completo'
      const isTotal = options.tipoDocumento === 'total' // Portada + Balance + Distribución
      const isProductos = options.tipoDocumento === 'productos'

      // --- 1. PORTADA ---
      if (isCompleto || isTotal || options.tipoDocumento === 'portada') {
        // Estilo Portada Modal
        doc.fillColor(grayText).fontSize(10).font('Helvetica').text('Inventario elaborado por:', 50, 60)
        doc.moveDown(0.2)
        doc.fillColor(darkText).fontSize(20).font('Helvetica-Bold').text((options.contadorData?.nombre || 'ADMINISTRADOR').toUpperCase())

        doc.moveDown(4)
        doc.fillColor(darkText).fontSize(36).font('Helvetica-Bold').text((sesion.nombreCliente || 'CLIENTE').toUpperCase(), { align: 'center' })

        if (hasLogo) {
          doc.moveDown(2)
          doc.image(logoPath, (doc.page.width / 2) - 80, doc.y, { width: 160 })
          doc.moveDown(8)
        } else {
          doc.moveDown(10)
        }

        const coverFooterY = 650
        doc.moveTo(50, coverFooterY).lineTo(562, coverFooterY).stroke('#e5e7eb')

        doc.fontSize(11).font('Helvetica-Bold').fillColor(grayText).text('Fecha Inventario', 50, coverFooterY + 15)
        doc.fontSize(14).font('Helvetica').fillColor(darkText).text(new Date(sesion.fecha).toLocaleDateString(), 50, coverFooterY + 30)

        doc.fontSize(11).font('Helvetica-Bold').fillColor(grayText).text('Costo del Servicio', 400, coverFooterY + 15, { align: 'right', width: 160 })
        doc.fontSize(16).font('Helvetica-Bold').fillColor(tealHeader).text(`RD$ ${Number(options.contadorData?.costoServicio || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 400, coverFooterY + 30, { align: 'right', width: 160 })

        if (isCompleto || isTotal) doc.addPage()
      }

      // --- 2. BALANCE GENERAL ---
      if (isCompleto || isTotal || options.tipoDocumento === 'balance') {
        this._drawBalancePage(doc, sesion, options, tealHeader, blueAccent, redAccent, darkText, grayText, lightGray, appTitle)
        if (isCompleto || isTotal) doc.addPage()
      }

      // --- 3. DISTRIBUCION DE SALDO ---
      if (isCompleto || isTotal || (options.tipoDocumento === 'reporte' && options.incluirDistribucion)) {
        this._drawDistribucionPage(doc, sesion, options, tealHeader, darkText, grayText, lightGray, redAccent)
        if (isCompleto) doc.addPage()
      }

      // --- 4. LISTADO DE PRODUCTOS ---
      if (isCompleto || isProductos) {
        this._drawProductosPages(doc, sesion, options, tealHeader, darkText, grayText, lightGray)
      }

      // Global Footer for all pages
      const pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)
        doc.fontSize(8).fillColor('#9ca3af').text(
          `Página ${i + 1} de ${pages.count} | Generado por TECH STOCK J4-PRO`,
          0, 760, { align: 'center', width: 612 }
        )
      }

      doc.end()
    } catch (error) {
      logger.error('Error unificado PDF:', error)
      return res.status(500).json({ exito: false, mensaje: 'Error al generar PDF' })
    }
  }

  /** HELPERS PARA DIBUJAR SECCIONES **/

  _drawBalancePage(doc, sesion, options, teal, blue, red, dark, gray, light, app) {
    // Header sutil (línea superior)
    doc.rect(0, 0, 612, 12).fill(teal)
    doc.moveDown(2)

    doc.fillColor(dark).fontSize(22).font('Helvetica-Bold').text((sesion.nombreCliente || 'CLIENTE').toUpperCase(), { align: 'center' })
    doc.fillColor(teal).fontSize(14).font('Helvetica-Bold').text('Balance General', { align: 'center' })
    doc.fillColor(gray).fontSize(10).font('Helvetica').text(`Al ${new Date(sesion.fecha).toLocaleDateString()}`, { align: 'center' })
    doc.fontSize(8).text('(En RD $)', { align: 'center' })

    doc.moveDown(2)
    doc.moveTo(40, doc.y).lineTo(572, doc.y).stroke('#e5e7eb')
    doc.moveDown(2)

    const f = sesion.datosFinancieros || {}
    const t = sesion.totales || {}
    const col1X = 40
    const col2X = 310
    const startY = doc.y

    // Activos
    doc.fillColor(blue).font('Helvetica-Bold').fontSize(12).text('ACTIVOS', col1X, startY)
    doc.moveTo(col1X, doc.y + 2).lineTo(290, doc.y + 2).stroke(blue)
    doc.moveDown(1)

    const drawRow = (label, value, x, bold = false, fontSize = 9, color = dark) => {
      const curY = doc.y
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).text(label, x + 5, curY)
      doc.text(`RD$ ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, x + 160, curY, { align: 'right', width: 85 })
      doc.moveDown(1)
    }

    doc.fillColor(dark).font('Helvetica-Bold').fontSize(10).text('CORRIENTES', col1X + 5)
    doc.moveDown(0.5)
    drawRow('EFECTIVO Y CAJA', f.efectivoEnCajaYBanco || 0, col1X)
    drawRow('CUENTAS POR COBRAR', f.cuentasPorCobrar || 0, col1X)
    drawRow('INVENTARIO DE MERCANCIA', t.valorTotalInventario || 0, col1X)
    drawRow('DEUDA A NEGOCIO', f.deudaANegocio || 0, col1X)

    doc.moveDown(0.5)
    doc.rect(col1X, doc.y - 5, 255, 18).fill(light)
    doc.fillColor(dark)
    drawRow('TOTAL CORRIENTES', (f.efectivoEnCajaYBanco || 0) + (f.cuentasPorCobrar || 0) + (t.valorTotalInventario || 0) + (f.deudaANegocio || 0), col1X, true)

    doc.moveDown(1)
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(10).text('FIJOS', col1X + 5)
    doc.moveDown(0.5)
    drawRow('ACTIVOS FIJOS', f.activosFijos || 0, col1X)
    doc.moveDown(0.5)
    doc.rect(col1X, doc.y - 5, 255, 18).fill(light)
    doc.fillColor(dark)
    drawRow('TOTAL FIJOS', f.activosFijos || 0, col1X, true)

    doc.moveDown(2)
    doc.moveTo(col1X, doc.y).lineTo(295, doc.y).stroke(dark, 1.5)
    doc.moveDown(0.5)
    drawRow('TOTAL ACTIVOS', t.totalActivos || 0, col1X, true, 11)

    // Pasivos y Capital
    const middleY = doc.y // Save Y for after right column
    doc.y = startY
    doc.fillColor(red).font('Helvetica-Bold').fontSize(12).text('PASIVOS Y CAPITAL', col2X, startY)
    doc.moveTo(col2X, doc.y + 2).lineTo(570, doc.y + 2).stroke(red)
    doc.moveDown(1)

    doc.fillColor(dark).font('Helvetica-Bold').fontSize(10).text('PASIVOS', col2X + 5)
    doc.moveDown(0.5)
    drawRow('CUENTAS POR PAGAR', f.cuentasPorPagar || 0, col2X)
    doc.moveDown(0.5)
    doc.rect(col2X, doc.y - 5, 255, 18).fill(light)
    doc.fillColor(dark)
    drawRow('TOTAL PASIVOS', f.cuentasPorPagar || 0, col2X, true)

    doc.moveDown(1)
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(10).text('CAPITAL', col2X + 5)
    doc.moveDown(0.5)
    drawRow('CAPITAL CONTABLE', t.capitalContable || 0, col2X, true)

    doc.moveDown(2)
    doc.moveTo(col2X, doc.y).lineTo(565, doc.y).stroke(dark, 1.5)
    doc.moveDown(0.5)
    drawRow('TOTAL PASIVOS + CAPITAL', t.totalActivos || 0, col2X, true, 11)

    // Ventas y Gastos Box with improved accuracy
    doc.moveDown(2)
    const boxY = doc.y
    doc.rect(col2X, boxY, 255, 115).fill('#eff6ff') // bg-blue-50
    doc.rect(col2X, boxY, 255, 115).stroke('#dbeafe') // border-blue-100

    doc.fillColor(blue).font('Helvetica-Bold').fontSize(11).text('VENTAS Y GASTOS', col2X + 10, boxY + 10)
    doc.moveTo(col2X + 10, boxY + 25).lineTo(col2X + 245, boxY + 25).stroke('#dbeafe')

    doc.y = boxY + 35
    drawRow('VENTAS DEL MES', f.ventasDelMes || 0, col2X + 5, true, 9, '#15803d')

    // Gastos with parentheses for negative/expense visual
    const gastosVal = f.gastosGenerales || 0
    const curY = doc.y
    doc.fillColor(red).font('Helvetica-Bold').fontSize(9).text('GASTOS GENERALES', col2X + 10, curY)
    doc.text(`(RD$ ${Number(gastosVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`, col2X + 160, curY, { align: 'right', width: 85 })
    doc.moveDown(1)

    doc.moveTo(col2X + 10, doc.y + 2).lineTo(col2X + 245, doc.y + 2).stroke('#dbeafe')
    doc.moveDown(1)

    const utilidades = (f.ventasDelMes || 0) - (f.gastosGenerales || 0)
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(11).text('UTILIDAD NETA', col2X + 15, doc.y)
    doc.text(`RD$ ${Number(utilidades).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, col2X + 150, doc.y, { align: 'right', width: 95 })

    // Contador Info
    doc.y = Math.max(middleY, doc.y + 60)
    doc.fillColor(gray).fontSize(9).font('Helvetica-Bold').text(`Contador: ${options.contadorData?.nombre || 'ADMINISTRADOR'}`, { align: 'center' })
    if (options.contadorData?.telefono) doc.fontSize(8).font('Helvetica').text(`Teléfono: ${options.contadorData.telefono}`, { align: 'center' })

    // Disclaimer
    doc.moveDown(4)
    doc.fontSize(7).fillColor('#9ca3af').font('Helvetica-Oblique').text(
      'Solo somos responsables de los datos introducidos en el inventario de mercancía. Los resultados del balance del negocio son responsabilidad del propietario del negocio resultados del inventario y reconocimiento del propietario estos datos numéricos reales según su desempeño del negocio en el periodo evaluado.',
      40, 710, { align: 'center', width: 532 }
    )
  }

  _drawDistribucionPage(doc, sesion, options, teal, dark, gray, light, red) {
    // Header sutil
    doc.rect(0, 0, 612, 12).fill(teal)
    doc.moveDown(2)

    doc.fillColor(dark).fontSize(22).font('Helvetica-Bold').text((sesion.nombreCliente || 'CLIENTE').toUpperCase(), { align: 'center' })
    doc.fillColor(teal).fontSize(14).font('Helvetica-Bold').text('Distribución de Saldo', { align: 'center' })
    doc.fillColor(gray).fontSize(10).font('Helvetica').text(`Al ${new Date(sesion.fecha).toLocaleDateString()}`, { align: 'center' })
    doc.fontSize(8).text('(En RD $)', { align: 'center' })

    doc.moveDown(2)
    const d = options.distribucionData || {}
    const socios = d.socios || []

    // Resumen box
    doc.rect(40, doc.y, 532, 35).fill(light)
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(10).text('Total de Utilidades Netas:', 55, doc.y + 12)
    doc.text(`RD$ ${Number(d.utilidadesNetas || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 190, doc.y - 12)

    doc.text('Número de Socios:', 400, doc.y - 12)
    doc.font('Helvetica-Bold').text(socios.length || 0, 500, doc.y - 12)
    doc.moveDown(2)

    doc.fillColor(dark).font('Helvetica-Bold').fontSize(11).text('Distribución por Socios')
    doc.moveDown(0.5)

    // Table Header
    const colX = [40, 100, 180, 280, 380, 480]
    doc.rect(40, doc.y, 532, 25).fill(light)
    doc.fillColor(gray).font('Helvetica-Bold').fontSize(8)
    doc.text('SOCIO', colX[0] + 5, doc.y + 8)
    doc.text('PORCENTAJE', colX[1], doc.y - 8, { align: 'center', width: 70 })
    doc.text('UTIL. PERIODO', colX[2], doc.y - 8, { align: 'right', width: 90 })
    doc.text('UTIL. ACUM.', colX[3], doc.y - 8, { align: 'right', width: 90 })
    doc.text('CTA ADEUDADA', colX[4], doc.y - 8, { align: 'right', width: 90 })
    doc.text('SALDO NETO', colX[5], doc.y - 8, { align: 'right', width: 90 })
    doc.moveDown(1.5)

    // Table Content
    socios.forEach((s) => {
      const curY = doc.y
      const utilidadSocio = (d.utilidadesNetas * (s.porcentaje / 100)) || 0
      const deuda = s.deuda || 0
      const saldo = utilidadSocio - deuda

      doc.fillColor(dark).font('Helvetica-Bold').fontSize(9).text(s.nombre || 'Socio', colX[0] + 5, curY)
      doc.fillColor(gray).font('Helvetica').text(`${Number(s.porcentaje).toFixed(2)}%`, colX[1], curY, { align: 'center', width: 70 })
      doc.fillColor(dark).font('Helvetica-Bold').text(Number(utilidadSocio).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX[2], curY, { align: 'right', width: 90 })
      doc.text(Number(utilidadSocio).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX[3], curY, { align: 'right', width: 90 })
      doc.fillColor(red).text(Number(deuda).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX[4], curY, { align: 'right', width: 90 })

      doc.fillColor(saldo >= 0 ? '#16a34a' : red)
      doc.text(Number(saldo).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX[5], curY, { align: 'right', width: 90 })

      doc.moveTo(40, curY + 15).lineTo(572, curY + 15).stroke('#f3f4f6')
      doc.moveDown(1.2)
    })

    // Total Row
    doc.rect(40, doc.y, 532, 25).fill(dark)
    doc.fillColor('#ffffff').font('Helvetica-Bold').text('TOTAL', colX[0] + 5, doc.y + 8)
    doc.text('100.00%', colX[1], doc.y - 8, { align: 'center', width: 70 })
    doc.text(Number(d.utilidadesNetas || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX[2], doc.y - 8, { align: 'right', width: 90 })
    doc.text(Number(d.utilidadesNetas || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX[3], doc.y - 8, { align: 'right', width: 90 })

    const totalDeuda = socios.reduce((sum, s) => sum + (s.deuda || 0), 0)
    doc.text(Number(totalDeuda).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX[4], doc.y - 8, { align: 'right', width: 90 })
    doc.text(Number((d.utilidadesNetas || 0) - totalDeuda).toLocaleString(undefined, { minimumFractionDigits: 2 }), colX[5], doc.y - 8, { align: 'right', width: 90 })

    // Signatures
    doc.moveDown(6)
    const sigY = doc.y
    doc.fillColor(dark).font('Helvetica-Bold').fontSize(11).text('Firmas', 40, sigY)
    doc.moveDown(4)

    const sigColWidth = 150
    const sigX1 = 100
    const sigX2 = 350
    const sigLineY = doc.y

    doc.moveTo(sigX1, sigLineY).lineTo(sigX1 + sigColWidth, sigLineY).stroke(gray)
    doc.moveTo(sigX2, sigLineY).lineTo(sigX2 + sigColWidth, sigLineY).stroke(gray)

    doc.fontSize(9).fillColor(gray).font('Helvetica')
    doc.text('Socio 1', sigX1, sigLineY + 5, { align: 'center', width: sigColWidth })
    doc.text('Firma y Cédula', sigX1, sigLineY + 18, { align: 'center', width: sigColWidth })

    doc.text('Socio 2', sigX2, sigLineY + 5, { align: 'center', width: sigColWidth })
    doc.text('Firma y Cédula', sigX2, sigLineY + 18, { align: 'center', width: sigColWidth })
  }

  _drawProductosPages(doc, sesion, options, teal, dark, gray, light) {
    const prods = sesion.productosContados || []
    const PER_PAGE = 30 // Reduced for Portrait and Footer
    const totalPages = Math.ceil(prods.length / PER_PAGE) || 1

    for (let pIdx = 0; pIdx < totalPages; pIdx++) {
      if (pIdx > 0 || doc.page) doc.addPage({ size: 'LETTER', layout: 'portrait' })

      // Header sutil
      doc.rect(0, 0, 612, 12).fill(teal)
      doc.moveDown(2)

      doc.fillColor(dark).fontSize(20).font('Helvetica-Bold').text('Listado de Productos', { align: 'center' })
      doc.fillColor(gray).fontSize(10).font('Helvetica').text(`${sesion.nombreCliente} - ${new Date(sesion.fecha).toLocaleDateString()}`, { align: 'center' })

      doc.moveDown(2)

      const tableTop = 100
      doc.rect(40, tableTop, 532, 25).fill(light)
      doc.fillColor(gray).font('Helvetica-Bold').fontSize(9)
      doc.text('Producto', 50, tableTop + 8)
      doc.text('Cant.', 300, tableTop + 8, { align: 'center', width: 60 })
      doc.text('Costo', 380, tableTop + 8, { align: 'right', width: 80 })
      doc.text('Total', 480, tableTop + 8, { align: 'right', width: 85 })

      let curY = tableTop + 30
      const pageItems = prods.slice(pIdx * PER_PAGE, (pIdx + 1) * PER_PAGE)
      let pageTotal = 0

      pageItems.forEach((item) => {
        const itemTotal = item.valorTotal || (item.cantidadContada * (item.costoProducto || 0))
        pageTotal += itemTotal

        doc.fillColor(dark).font('Helvetica').fontSize(9)
        doc.text(item.nombreProducto || 'N/A', 50, curY, { width: 240, truncate: true })

        doc.fillColor(gray).rect(300, curY - 2, 60, 14).fill('#f9fafb')
        doc.fillColor(dark).text(Number(item.cantidadContada).toFixed(2), 300, curY, { align: 'center', width: 60 })

        doc.fillColor(dark).text(Number(item.costoProducto).toFixed(2), 380, curY, { align: 'right', width: 80 })
        doc.font('Helvetica-Bold').text(Number(itemTotal).toLocaleString(undefined, { minimumFractionDigits: 2 }), 480, curY, { align: 'right', width: 85 })

        doc.moveTo(40, curY + 11).lineTo(572, curY + 11).stroke('#f9fafb')
        curY += 15
      })

      // Table Footer matching modal
      const footerY = 700
      doc.moveTo(40, footerY).lineTo(572, footerY).stroke(dark, 1.5)

      doc.fontSize(8).fillColor(gray).font('Helvetica')
      doc.text(`Usuario: ${sesion?.usuario?.nombre || 'ADMINISTRADOR'}`, 50, footerY + 5)
      doc.text(`Teléfono: ${sesion?.usuario?.telefono || '1234567890'}`, 50, footerY + 15)

      doc.fillColor(dark).fontSize(9)
      doc.text(`Líneas ${(pIdx * PER_PAGE) + 1} a ${(pIdx * PER_PAGE) + pageItems.length}`, 400, footerY + 5, { align: 'right', width: 160 })

      doc.font('Helvetica-Bold')
      doc.text(`Total Página: RD$ ${Number(pageTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 400, footerY + 15, { align: 'right', width: 160 })
      doc.text(`Total Reporte: RD$ ${Number(sesion.totales?.valorTotalInventario || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 400, footerY + 28, { align: 'right', width: 160 })

      doc.fontSize(8).fillColor(gray).font('Helvetica')
      doc.text(`Pág. ${pIdx + 1} de ${totalPages}`, 400, footerY + 45, { align: 'right', width: 160 })
    }
  }

  descargarBalancePDF = async (req, res) => {
    // Reutiliza la lógica o llama a descargarInventarioPDF con tipoDocumento: 'balance'
    req.body = { tipoDocumento: 'balance' }
    return this.descargarInventarioPDF(req, res)
  }
}

export default new ReportesController()
