import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

const { width, height } = Dimensions.get('window')

const InventoryReportModal = ({ visible, onClose, sesionData, productosContados, datosFinancieros, contadorData, user }) => {
  const [currentPage, setCurrentPage] = useState(0)
  
  // Calcular total de páginas dinámicamente (44 en la primera, 51 en las siguientes)
  const getTotalPages = () => {
    const validProductos = Array.isArray(productosContados) ? productosContados : []
    const total = validProductos.length
    let paginasProductos = 0
    if (total > 0) {
      const primera = Math.min(44, total)
      paginasProductos = 1 + Math.ceil(Math.max(0, total - primera) / 51)
    }
    return 1 + paginasProductos + 2 // 1 portada + páginas de productos + 2 (balance + distribución)
  }
  
  const totalPages = getTotalPages()

  // Procesar datos financieros para manejar arrays y valores únicos
  const processFinancialData = () => {
    const gastosArray = Array.isArray(datosFinancieros?.gastosGenerales) 
      ? datosFinancieros.gastosGenerales 
      : (datosFinancieros?.gastosGenerales ? [{ monto: datosFinancieros.gastosGenerales, descripcion: 'Gastos generales' }] : []);
    
    const cuentasPorCobrarArray = Array.isArray(datosFinancieros?.cuentasPorCobrar) 
      ? datosFinancieros.cuentasPorCobrar 
      : (datosFinancieros?.cuentasPorCobrar ? [{ monto: datosFinancieros.cuentasPorCobrar, descripcion: 'Cuenta por cobrar' }] : []);
    
    const efectivoArray = Array.isArray(datosFinancieros?.efectivoEnCajaYBanco) 
      ? datosFinancieros.efectivoEnCajaYBanco 
      : (datosFinancieros?.efectivoEnCajaYBanco ? [{ monto: datosFinancieros.efectivoEnCajaYBanco, descripcion: 'Efectivo en caja' }] : []);

    const cuentasPorPagarArray = Array.isArray(datosFinancieros?.cuentasPorPagar) 
      ? datosFinancieros.cuentasPorPagar 
      : (datosFinancieros?.cuentasPorPagar ? [{ monto: datosFinancieros.cuentasPorPagar, descripcion: 'Cuenta por pagar' }] : []);

    const deudaANegocioArray = Array.isArray(datosFinancieros?.deudaANegocio) 
      ? datosFinancieros.deudaANegocio 
      : (datosFinancieros?.deudaANegocio ? [{ monto: datosFinancieros.deudaANegocio, descripcion: 'Deuda a negocio' }] : []);

    return {
      ventasDelMes: parseFloat(datosFinancieros?.ventasDelMes) || 0,
      gastosGenerales: gastosArray,
      gastosGeneralesTotal: gastosArray.reduce((sum, gasto) => sum + (parseFloat(gasto.monto) || 0), 0),
      cuentasPorCobrar: cuentasPorCobrarArray,
      cuentasPorCobrarTotal: cuentasPorCobrarArray.reduce((sum, cuenta) => sum + (parseFloat(cuenta.monto) || 0), 0),
      cuentasPorPagar: cuentasPorPagarArray,
      cuentasPorPagarTotal: cuentasPorPagarArray.reduce((sum, cuenta) => sum + (parseFloat(cuenta.monto) || 0), 0),
      efectivoEnCajaYBanco: efectivoArray,
      efectivoEnCajaYBancoTotal: efectivoArray.reduce((sum, efectivo) => sum + (parseFloat(efectivo.monto) || 0), 0),
      deudaANegocio: deudaANegocioArray,
      deudaANegocioTotal: deudaANegocioArray.reduce((sum, deuda) => sum + (parseFloat(deuda.monto) || 0), 0),
      activosFijos: parseFloat(datosFinancieros?.activosFijos) || 0,
    }
  }

  const financialData = processFinancialData()

  // Calcular totales del inventario
  const calcularTotales = () => {
    const validProductos = Array.isArray(productosContados) ? productosContados : []
    const totalProductos = validProductos.length || 0
    const valorTotal = validProductos.reduce((sum, producto) => {
      const cantidad = parseFloat(producto?.cantidadContada) || 0
      const costo = parseFloat(producto?.costoProducto) || 0
      return sum + (cantidad * costo)
    }, 0) || 0

    return { totalProductos, valorTotal: parseFloat(valorTotal) || 0 }
  }

  const { totalProductos, valorTotal } = calcularTotales()

  // No renderizar si el modal no está visible
  if (!visible) {
    return null
  }

  // Validar que tenemos datos válidos
  if (!sesionData || !productosContados) {
    return null
  }

  // Validar que productosContados es un array válido
  const validProductos = Array.isArray(productosContados) ? productosContados : []
  
  // Función auxiliar para convertir valores a string de forma segura
  const safeString = (value) => {
    if (value === null || value === undefined) return 'N/A'
    if (typeof value === 'object') {
      return value.nombre || value.descripcion || 'Objeto'
    }
    return String(value)
  }

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount || 0)
  }

  // Calcular próxima fecha de inventario (mismo día del siguiente mes)
  const calcularProximaFecha = () => {
    const fecha = sesionData?.fecha ? new Date(sesionData.fecha) : new Date()
    const proximaFecha = new Date(fecha)
    proximaFecha.setMonth(proximaFecha.getMonth() + 1)
    return proximaFecha.toLocaleDateString('es-DO', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  // Página 0: Portada
  const renderPortada = () => (
    <ScrollView style={styles.pageContent}>
      <View style={styles.portadaContainer}>
        {/* Información del Contador */}
        <View style={styles.portadaHeader}>
          <Text style={styles.portadaSubtitle}>
            Inventario de Mercancía y Presentación de Resultados elaborado por:
          </Text>
          <Text style={styles.portadaContadorName}>
            {user?.nombre?.toUpperCase() || 'CONTADOR'}
          </Text>
          <Text style={styles.portadaContadorInfo}>Cédula: {user?.cedula || 'No disponible'}</Text>
          <Text style={styles.portadaContadorInfo}>Teléfono: {user?.telefono || user?.phone || 'No disponible'}</Text>
          <Text style={styles.portadaContadorInfo}>Correo: {user?.email || 'No disponible'}</Text>
        </View>

        {/* Logo (Icono) */}
        <View style={styles.portadaLogoContainer}>
          <View style={styles.portadaLogoCircle}>
            <Ionicons name="business" size={80} color="#10b981" style={{ opacity: 0.6 }} />
          </View>
        </View>

        {/* Nombre del Cliente */}
        <View style={styles.portadaClienteContainer}>
          <Text style={styles.portadaClienteName}>
            {sesionData?.clienteNegocio?.nombre?.toUpperCase() || 'CLIENTE'}
          </Text>
          {sesionData?.clienteNegocio?.telefono && (
            <Text style={styles.portadaClienteInfo}>{sesionData.clienteNegocio.telefono}</Text>
          )}
          {sesionData?.clienteNegocio?.direccion && (
            <Text style={styles.portadaClienteInfo}>{sesionData.clienteNegocio.direccion}</Text>
          )}
        </View>

        {/* Pie de Portada */}
        <View style={styles.portadaFooter}>
          <View style={styles.portadaInfoRow}>
            <View style={styles.portadaInfoColumn}>
              <Text style={styles.portadaLabel}>Inventario</Text>
              <Text style={styles.portadaValue}>
                {new Date(sesionData?.fecha || new Date()).toLocaleDateString('es-DO', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })}
              </Text>
              <Text style={styles.portadaLabel}>Próx. Inventario</Text>
              <Text style={styles.portadaValue}>{calcularProximaFecha()}</Text>
            </View>
            <View style={styles.portadaInfoColumn}>
              <Text style={styles.portadaLabel}>Costo Servicio</Text>
              <Text style={styles.portadaCosto}>
                {formatCurrency(contadorData?.costoServicio || 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  )

  // Obtener productos paginados (44 en primera hoja, 51 en siguientes)
  const getProductosPaginados = () => {
    const paginaProducto = currentPage - 1 // -1 porque la portada es página 0
    if (paginaProducto < 0) return []
    if (paginaProducto === 0) {
      const inicio = 0
      const fin = Math.min(44, validProductos.length)
      return validProductos.slice(inicio, fin)
    }
    const inicio = 44 + (paginaProducto - 1) * 51
    const fin = inicio + 51
    return validProductos.slice(inicio, fin)
  }

  const getTotalPaginasProductos = () => {
    const total = validProductos.length
    if (total <= 0) return 0
    if (total <= 44) return 1
    return 1 + Math.ceil((total - 44) / 51)
  }

  const esUltimaPaginaProductos = () => {
    return currentPage === getTotalPaginasProductos()
  }

  // Página 1+: Lista de productos con paginación
  const renderPage1 = () => {
    const productosPagina = getProductosPaginados()
    const paginaProducto = currentPage - 1
    const esPrimeraPagina = currentPage === 1
    const filasObjetivo = esPrimeraPagina ? 44 : 51
    const inicioBase = esPrimeraPagina ? 0 : 44 + (paginaProducto - 1) * 51
    const lineaInicio = inicioBase + 1
    const lineaFin = Math.min(inicioBase + productosPagina.length, validProductos.length)
    
    // Calcular total de la página y total general
    let totalPagina = 0
    let totalGeneral = 0
    
    productosPagina.forEach(producto => {
      const cantidad = parseFloat(producto.cantidadContada) || 0
      const costo = parseFloat(producto.costoProducto) || 0
      totalPagina += cantidad * costo
    })
    
    validProductos.forEach(producto => {
      const cantidad = parseFloat(producto.cantidadContada) || 0
      const costo = parseFloat(producto.costoProducto) || 0
      totalGeneral += cantidad * costo
    })

    return (
      <ScrollView style={styles.pageContent}>
        {/* Encabezado solo en la primera página de productos */}
        {esPrimeraPagina && (
          <>
            <View style={styles.pageHeader}>
              <Text style={styles.reportTitleMain}>Reporte de inventario</Text>
              <Text style={styles.reportSubtitle}>Ordenado por Nombre de artículo</Text>
              <Text style={styles.revNumber}>Rev. {currentPage}</Text>
            </View>

            <View style={styles.clientInfoSection}>
              <Text style={styles.clientName}>Cliente: {safeString(sesionData?.clienteNegocio?.nombre)}</Text>
              <Text style={styles.inventoryNumber}>Inventario No: {safeString(sesionData?.numeroSesion)}</Text>
              <Text style={styles.date}>Fecha: {new Date(sesionData?.fecha || new Date()).toLocaleDateString('es-DO')}</Text>
            </View>

            <Text style={styles.observationTitle}>Observación:</Text>
          </>
        )}
        
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>ARTÍCULO</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>UNIDAD</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>CANTIDAD</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>COSTO</Text>
            <Text style={[styles.tableHeaderText, styles.col5]}>TOTAL</Text>
          </View>

          {productosPagina.map((producto, index) => {
            const cantidad = parseFloat(producto.cantidadContada) || 0
            const costo = parseFloat(producto.costoProducto) || 0
            const total = cantidad * costo
            const nombreProducto = String(
              typeof producto.producto === 'string' 
                ? producto.producto 
                : typeof producto.producto === 'object' && producto.producto?.nombre
                  ? producto.producto.nombre
                  : producto.nombreProducto || producto.nombre || 'Producto sin nombre'
            )

            return (
              <View key={index} style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                <Text style={[styles.tableCell, styles.col1]}>{nombreProducto}</Text>
                <Text style={[styles.tableCell, styles.col2]}>unidad</Text>
                <Text style={[styles.tableCell, styles.col3]}>{cantidad.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.col4]}>{costo.toFixed(2)}</Text>
                <Text style={[styles.tableCell, styles.col5]}>RD$ {total.toFixed(2)}</Text>
              </View>
            )
          })}

          {/* Rellenar filas vacías hasta 44/51 */}
          {Array.from({ length: Math.max(0, filasObjetivo - productosPagina.length) }).map((_, index) => (
            <View key={`empty-${index}`} style={[styles.tableRow, styles.emptyRow, (productosPagina.length + index) % 2 === 0 ? styles.evenRow : styles.oddRow]}>
              <Text style={[styles.tableCell, styles.col1]}> </Text>
              <Text style={[styles.tableCell, styles.col2]}> </Text>
              <Text style={[styles.tableCell, styles.col3]}> </Text>
              <Text style={[styles.tableCell, styles.col4]}> </Text>
              <Text style={[styles.tableCell, styles.col5]}> </Text>
            </View>
          ))}
        </View>

        {/* Pie de página - EN TODAS LAS PÁGINAS */}
        <View style={styles.footerInfo}>
          <View style={styles.footerRow}>
            <Text style={styles.lineasText}>Líneas {lineaInicio} a {lineaFin}</Text>
            <View style={styles.totalesColumn}>
              <Text style={styles.totalPaginaText}>Total Página      RD$ {totalPagina.toFixed(2)}</Text>
              <Text style={styles.totalGeneralText}>Total Reporte      RD$ {totalGeneral.toFixed(2)}</Text>
              <Text style={styles.lineasTotalText}>Líneas {lineaFin}/ {validProductos.length}</Text>
            </View>
          </View>
          
          <View style={styles.separatorLine} />
          
          <View style={styles.footerBottomRow}>
            <View style={styles.footerLeftColumn}>
              <Text style={styles.footerUserName}>
                {user?.rol === 'contador' || user?.rol === 'contable' ? 'Contador' : 'Usuario'} {user?.nombre?.toUpperCase() || 'USUARIO SISTEMA'}
              </Text>
              <Text style={styles.footerPhone}>Teléfono {user?.telefono || user?.phone || 'No disponible'}</Text>
            </View>
            <Text style={styles.footerPageNumber}>Pag. {currentPage + 1}/ {totalPages}</Text>
          </View>
        </View>
      </ScrollView>
    )
  }

  // Página 2: Distribución de Saldo
  const renderPage2 = () => {
    // Calcular deudas de socios
    const deudasSocios = financialData.deudaANegocio.filter(deuda => deuda.esSocio === true)
    const totalDeudasSocios = deudasSocios.reduce((sum, deuda) => sum + (parseFloat(deuda.monto) || 0), 0)
    
    // Calcular utilidad neta disponible para distribución
    const utilidadNeta = financialData.ventasDelMes - financialData.gastosGeneralesTotal
    const utilidadPorSocio = utilidadNeta / 2 // Asumiendo 2 socios al 50% cada uno
    
    // Calcular deudas por socio con lógica mejorada
    const deudaSocio1 = deudasSocios.filter(d => {
      const deudor = d.deudor?.toLowerCase() || ''
      return deudor.includes('socio 1') || deudor === 'socio 1' || (deudor.includes('1') && deudor.includes('socio'))
    }).reduce((sum, d) => sum + (parseFloat(d.monto) || 0), 0)
    
    const deudaSocio2 = deudasSocios.filter(d => {
      const deudor = d.deudor?.toLowerCase() || ''
      return deudor.includes('socio 2') || deudor === 'socio 2' || (deudor.includes('2') && deudor.includes('socio'))
    }).reduce((sum, d) => sum + (parseFloat(d.monto) || 0), 0)
    
    const deudaNoAsignada = totalDeudasSocios - deudaSocio1 - deudaSocio2
    
    // Distribuir deuda no asignada equitativamente
    const deudaFinalSocio1 = deudaSocio1 + (deudaNoAsignada / 2)
    const deudaFinalSocio2 = deudaSocio2 + (deudaNoAsignada / 2)
    
    // Calcular utilidad neta después de descontar deudas
    const utilidadNetaSocio1 = utilidadPorSocio - deudaFinalSocio1
    const utilidadNetaSocio2 = utilidadPorSocio - deudaFinalSocio2

    return (
      <ScrollView style={styles.pageContent}>
        <View style={styles.centerHeader}>
          <Text style={styles.companyName}>{String(sesionData?.clienteNegocio?.nombre || 'CLIENTE')}</Text>
          <Text style={styles.reportTitle}>Distribución de Saldo</Text>
          <Text style={styles.reportDate}>Al {new Date().toLocaleDateString('es-ES')}</Text>
          <Text style={styles.currency}>(En RD $)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información General</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total de Utilidades Netas:</Text>
            <Text style={styles.infoValue}>RD$ {utilidadNeta.toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Deudas de Socios:</Text>
            <Text style={[styles.infoValue, styles.gastoValue]}>RD$ {totalDeudasSocios.toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Número de Socios:</Text>
            <Text style={styles.infoValue}>2</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Período:</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleDateString('es-ES')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribución por Socios</Text>
          <View style={styles.distributionTable}>
            <View style={styles.distributionHeader}>
              <Text style={styles.distributionHeaderText}>Socio</Text>
              <Text style={styles.distributionHeaderText}>%</Text>
              <Text style={styles.distributionHeaderText}>Utilidad Bruta</Text>
              <Text style={styles.distributionHeaderText}>Deuda</Text>
              <Text style={styles.distributionHeaderText}>Utilidad Neta</Text>
            </View>
            
            <View style={styles.distributionRow}>
              <Text style={styles.distributionCell}>Socio 1</Text>
              <Text style={styles.distributionCell}>50%</Text>
              <Text style={styles.distributionCell}>RD$ {utilidadPorSocio.toFixed(2)}</Text>
              <Text style={[styles.distributionCell, styles.gastoValue]}>RD$ {deudaFinalSocio1.toFixed(2)}</Text>
              <Text style={[styles.distributionCell, utilidadNetaSocio1 >= 0 ? {} : styles.gastoValue]}>RD$ {utilidadNetaSocio1.toFixed(2)}</Text>
            </View>
            
            <View style={styles.distributionRow}>
              <Text style={styles.distributionCell}>Socio 2</Text>
              <Text style={styles.distributionCell}>50%</Text>
              <Text style={styles.distributionCell}>RD$ {utilidadPorSocio.toFixed(2)}</Text>
              <Text style={[styles.distributionCell, styles.gastoValue]}>RD$ {deudaFinalSocio2.toFixed(2)}</Text>
              <Text style={[styles.distributionCell, utilidadNetaSocio2 >= 0 ? {} : styles.gastoValue]}>RD$ {utilidadNetaSocio2.toFixed(2)}</Text>
            </View>
            
            <View style={[styles.distributionRow, styles.totalRow]}>
              <Text style={[styles.distributionCell, styles.boldText]}>TOTAL</Text>
              <Text style={[styles.distributionCell, styles.boldText]}>100%</Text>
              <Text style={[styles.distributionCell, styles.boldText]}>RD$ {utilidadNeta.toFixed(2)}</Text>
              <Text style={[styles.distributionCell, styles.boldText, styles.gastoValue]}>RD$ {totalDeudasSocios.toFixed(2)}</Text>
              <Text style={[styles.distributionCell, styles.boldText]}>RD$ {(utilidadNetaSocio1 + utilidadNetaSocio2).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Detalle de deudas de socios */}
        {deudasSocios.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalle de Deudas de Socios</Text>
            {deudasSocios.map((deuda, index) => (
              <View key={index} style={styles.debtDetailItem}>
                <View style={styles.debtHeader}>
                  <Text style={styles.debtDebtor}>{deuda.deudor || 'Socio'}</Text>
                  <Text style={[styles.debtAmount, styles.gastoValue]}>RD$ {parseFloat(deuda.monto || 0).toFixed(2)}</Text>
                </View>
                <Text style={styles.debtDescription}>{deuda.descripcion || 'Sin descripción'}</Text>
                <Text style={styles.debtType}>Tipo: {deuda.tipoDeuda || 'Dinero'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    )
  }

  // Página 3: Balance General
  const renderPage3 = () => (
    <ScrollView style={styles.pageContent}>
      <View style={styles.centerHeader}>
        <Text style={styles.companyName}>{String(sesionData?.clienteNegocio?.nombre || 'CLIENTE')}</Text>
        <Text style={styles.reportTitle}>Balance General</Text>
        <Text style={styles.reportDate}>Al {new Date().toLocaleDateString('es-ES')}</Text>
        <Text style={styles.currency}>(En RD $)</Text>
      </View>

      <View style={styles.balanceContainer}>
        {/* ACTIVOS */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceTitle, styles.activosTitle]}>ACTIVOS</Text>
          
          <Text style={styles.balanceSubtitle}>CORRIENTES</Text>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>EFECTIVO Y CAJA</Text>
            <Text style={styles.balanceValue}>RD$ {financialData.efectivoEnCajaYBancoTotal.toFixed(2)}</Text>
          </View>
          {financialData.efectivoEnCajaYBanco.length > 1 && (
            <View style={styles.balanceSubItems}>
              {financialData.efectivoEnCajaYBanco.map((efectivo, index) => (
                <Text key={index} style={styles.balanceSubText}>
                  • {efectivo.tipoCuenta || 'Caja'}: RD$ {parseFloat(efectivo.monto || 0).toFixed(2)} ({efectivo.descripcion || 'Sin descripción'})
                </Text>
              ))}
            </View>
          )}
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>CUENTAS POR COBRAR</Text>
            <Text style={styles.balanceValue}>RD$ {financialData.cuentasPorCobrarTotal.toFixed(2)}</Text>
          </View>
          {financialData.cuentasPorCobrar.length > 1 && (
            <View style={styles.balanceSubItems}>
              {financialData.cuentasPorCobrar.map((cuenta, index) => (
                <Text key={index} style={styles.balanceSubText}>
                  • {cuenta.cliente || 'Cliente'}: RD$ {parseFloat(cuenta.monto || 0).toFixed(2)} ({cuenta.descripcion || 'Sin descripción'})
                </Text>
              ))}
            </View>
          )}
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>INVENTARIO DE MERCANCÍA</Text>
            <Text style={styles.balanceValue}>RD$ {valorTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>DEUDA A NEGOCIO</Text>
            <Text style={styles.balanceValue}>RD$ {financialData.deudaANegocioTotal.toFixed(2)}</Text>
          </View>
          {financialData.deudaANegocio.length > 1 && (
            <View style={styles.balanceSubItems}>
              {financialData.deudaANegocio.map((deuda, index) => (
                <Text key={index} style={styles.balanceSubText}>
                  • {deuda.deudor || 'Deudor'}: RD$ {parseFloat(deuda.monto || 0).toFixed(2)} ({deuda.descripcion || 'Sin descripción'})
                </Text>
              ))}
            </View>
          )}
          <View style={[styles.balanceItem, styles.totalItem]}>
            <Text style={styles.balanceTotalLabel}>TOTAL CORRIENTES</Text>
            <Text style={styles.balanceTotalValue}>RD$ {(financialData.efectivoEnCajaYBancoTotal + financialData.cuentasPorCobrarTotal + valorTotal + financialData.deudaANegocioTotal).toFixed(2)}</Text>
          </View>

          <Text style={styles.balanceSubtitle}>FIJOS</Text>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>ACTIVOS FIJOS</Text>
            <Text style={styles.balanceValue}>RD$ {financialData.activosFijos.toFixed(2)}</Text>
          </View>
          <View style={[styles.balanceItem, styles.totalItem]}>
            <Text style={styles.balanceTotalLabel}>TOTAL FIJOS</Text>
            <Text style={styles.balanceTotalValue}>RD$ {financialData.activosFijos.toFixed(2)}</Text>
          </View>

          <View style={[styles.balanceItem, styles.grandTotalItem]}>
            <Text style={styles.balanceGrandTotalLabel}>TOTAL ACTIVOS</Text>
            <Text style={styles.balanceGrandTotalValue}>RD$ {(financialData.efectivoEnCajaYBancoTotal + financialData.cuentasPorCobrarTotal + valorTotal + financialData.deudaANegocioTotal + financialData.activosFijos).toFixed(2)}</Text>
          </View>
        </View>

        {/* PASIVOS Y CAPITAL */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceTitle, styles.pasivosTitle]}>PASIVOS Y CAPITAL</Text>
          
          <Text style={styles.balanceSubtitle}>PASIVOS</Text>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>CUENTAS POR PAGAR</Text>
            <Text style={styles.balanceValue}>RD$ {financialData.cuentasPorPagarTotal.toFixed(2)}</Text>
          </View>
          {financialData.cuentasPorPagar.length > 1 && (
            <View style={styles.balanceSubItems}>
              {financialData.cuentasPorPagar.map((cuenta, index) => (
                <Text key={index} style={styles.balanceSubText}>
                  • {cuenta.proveedor || 'Proveedor'}: RD$ {parseFloat(cuenta.monto || 0).toFixed(2)} ({cuenta.descripcion || 'Sin descripción'})
                </Text>
              ))}
            </View>
          )}
          <View style={[styles.balanceItem, styles.totalItem]}>
            <Text style={styles.balanceTotalLabel}>TOTAL PASIVOS</Text>
            <Text style={styles.balanceTotalValue}>RD$ {financialData.cuentasPorPagarTotal.toFixed(2)}</Text>
          </View>

          <Text style={styles.balanceSubtitle}>CAPITAL</Text>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>CAPITAL CONTABLE</Text>
            <Text style={styles.balanceValue}>RD$ {(financialData.efectivoEnCajaYBancoTotal + financialData.cuentasPorCobrarTotal + valorTotal + financialData.deudaANegocioTotal + financialData.activosFijos - financialData.cuentasPorPagarTotal).toFixed(2)}</Text>
          </View>

          <View style={[styles.balanceItem, styles.grandTotalItem]}>
            <Text style={styles.balanceGrandTotalLabel}>TOTAL PASIVOS + CAPITAL</Text>
            <Text style={styles.balanceGrandTotalValue}>RD$ {(financialData.efectivoEnCajaYBancoTotal + financialData.cuentasPorCobrarTotal + valorTotal + financialData.deudaANegocioTotal + financialData.activosFijos).toFixed(2)}</Text>
          </View>

          <View style={styles.ventasSection}>
            <Text style={[styles.balanceTitle, styles.ventasTitle]}>VENTAS Y GASTOS</Text>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>VENTAS DEL MES</Text>
              <Text style={styles.balanceValue}>RD$ {financialData.ventasDelMes.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>GASTOS GENERALES</Text>
              <Text style={[styles.balanceValue, styles.gastoValue]}>RD$ {financialData.gastosGeneralesTotal.toFixed(2)}</Text>
            </View>
            {financialData.gastosGenerales.length > 1 && (
              <View style={styles.balanceSubItems}>
                {financialData.gastosGenerales.map((gasto, index) => (
                  <Text key={index} style={[styles.balanceSubText, styles.gastoValue]}>
                    • {gasto.categoria || 'Sin categoría'}: RD$ {parseFloat(gasto.monto || 0).toFixed(2)} ({gasto.descripcion || 'Sin descripción'})
                  </Text>
                ))}
              </View>
            )}
            <View style={[styles.balanceItem, styles.totalItem]}>
              <Text style={styles.balanceTotalLabel}>UTILIDAD NETA</Text>
              <Text style={styles.balanceTotalValue}>RD$ {(financialData.ventasDelMes - financialData.gastosGeneralesTotal).toFixed(2)}</Text>
            </View>
            <Text style={styles.percentageText}>PORCENTAJE NETO: {financialData.ventasDelMes > 0 ? (((financialData.ventasDelMes - financialData.gastosGeneralesTotal) / financialData.ventasDelMes) * 100).toFixed(2) : 0.00}%</Text>
            <Text style={styles.percentageText}>PORCENTAJE BRUTO: {financialData.ventasDelMes > 0 ? ((financialData.ventasDelMes / financialData.ventasDelMes) * 100).toFixed(2) : 0.00}%</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )


  const renderCurrentPage = () => {
    const PRODUCTOS_POR_PAGINA = 44
    const paginasProductos = Math.ceil(validProductos.length / PRODUCTOS_POR_PAGINA)
    
    if (currentPage === 0) {
      // Página 0: Portada
      return renderPortada()
    } else if (currentPage >= 1 && currentPage <= paginasProductos) {
      // Páginas 1 a N: Productos
      return renderPage1()
    } else if (currentPage === paginasProductos + 1) {
      // Página N+1: Balance
      return renderPage3()
    } else if (currentPage === paginasProductos + 2) {
      // Página N+2: Distribución
      return renderPage2()
    } else {
      return renderPortada()
    }
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.modalHeader}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Ionicons name="document-text" size={24} color="#ffffff" />
                <Text style={styles.modalTitle}>Reporte de Inventario</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.pageIndicator}>Página {currentPage + 1} de {totalPages}</Text>
          </LinearGradient>

          {/* Content */}
          <View style={styles.contentContainer}>
            {renderCurrentPage()}
          </View>

          {/* Footer Navigation */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
              onPress={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <Ionicons name="chevron-back" size={16} color={currentPage === 0 ? "#9ca3af" : "#ffffff"} />
              <Text style={[styles.navButtonText, currentPage === 0 && styles.navButtonTextDisabled]}>Anterior</Text>
            </TouchableOpacity>

            <View style={styles.pageIndicatorContainer}>
              {[0, 1, 2, 3].map((page) => (
                <TouchableOpacity
                  key={page}
                  style={[styles.pageIndicatorDot, currentPage === page && styles.pageIndicatorDotActive]}
                  onPress={() => setCurrentPage(page)}
                />
              ))}
              <Text style={styles.pageText}>Página {currentPage + 1} de {totalPages}</Text>
            </View>

            <TouchableOpacity 
              style={[styles.navButton, currentPage === 3 && styles.navButtonDisabled]}
              onPress={() => setCurrentPage(Math.min(3, currentPage + 1))}
              disabled={currentPage === 3}
            >
              <Text style={[styles.navButtonText, currentPage === 3 && styles.navButtonTextDisabled]}>Siguiente</Text>
              <Ionicons name="chevron-forward" size={16} color={currentPage === 3 ? "#9ca3af" : "#ffffff"} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.95,
    height: height * 0.9,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 10,
  },
  closeButton: {
    padding: 5,
  },
  pageIndicator: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.8,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pageContent: {
    flex: 1,
    padding: 15,
  },
  pageHeader: {
    marginBottom: 15,
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  inventoryNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  date: {
    fontSize: 14,
    color: '#1f2937',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  observationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
  },
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    padding: 8,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 9,
    color: '#374151',
    padding: 6,
    textAlign: 'center',
  },
  col1: { flex: 3 },
  col2: { flex: 1.5 },
  col3: { flex: 1.5 },
  col4: { flex: 1.5 },
  col5: { flex: 2 },
  centerHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  reportDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  currency: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: '#374151',
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  distributionTable: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  distributionHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  distributionHeaderText: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1f2937',
    padding: 6,
    textAlign: 'center',
  },
  distributionRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  distributionCell: {
    flex: 1,
    fontSize: 9,
    color: '#374151',
    padding: 6,
    textAlign: 'center',
  },
  totalRow: {
    backgroundColor: '#f9fafb',
  },
  boldText: {
    fontWeight: 'bold',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceSection: {
    flex: 1,
    marginHorizontal: 5,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    paddingBottom: 5,
    borderBottomWidth: 2,
  },
  activosTitle: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
  },
  pasivosTitle: {
    color: '#dc2626',
    borderBottomColor: '#dc2626',
  },
  ventasTitle: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
  },
  balanceSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 10,
    marginBottom: 5,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  balanceLabel: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
  },
  balanceValue: {
    fontSize: 10,
    color: '#1f2937',
    textAlign: 'right',
  },
  gastoValue: {
    color: '#dc2626', // Color rojo para gastos
  },
  totalItem: {
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 3,
    marginTop: 5,
  },
  balanceTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  balanceTotalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
  },
  grandTotalItem: {
    borderTopWidth: 2,
    borderTopColor: '#374151',
    paddingTop: 5,
    marginTop: 10,
  },
  balanceGrandTotalLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  balanceGrandTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
  },
  ventasSection: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  percentageText: {
    fontSize: 9,
    color: '#2563eb',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 3,
  },
  pageIndicatorActive: {
    backgroundColor: '#14b8a6',
  },
  pageText: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 8,
  },
  detailItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#14b8a6',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  detailDescription: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailDate: {
    fontSize: 9,
    color: '#9ca3af',
  },
  detailTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailTotalAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  balanceSubItems: {
    marginLeft: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  balanceSubText: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  debtDetailItem: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  debtDebtor: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  debtAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  debtDescription: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 2,
  },
  debtType: {
    fontSize: 9,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // Estilos de Portada
  portadaContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  portadaHeader: {
    marginBottom: 30,
  },
  portadaSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 10,
    textAlign: 'left',
  },
  portadaContadorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  portadaContadorInfo: {
    fontSize: 11,
    color: '#4b5563',
    marginBottom: 2,
  },
  portadaLogoContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  portadaLogoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  portadaClienteContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  portadaClienteName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  portadaClienteInfo: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  portadaFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  portadaInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  portadaInfoColumn: {
    flex: 1,
  },
  portadaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  portadaValue: {
    fontSize: 10,
    color: '#1f2937',
  },
  portadaCosto: {
    fontSize: 14,
    color: '#059669',
    fontWeight: 'bold',
  },
  // Estilos de página de productos
  reportTitleMain: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  revNumber: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 12,
  },
  clientInfoSection: {
    marginBottom: 12,
  },
  evenRow: {
    backgroundColor: '#ffffff',
  },
  oddRow: {
    backgroundColor: '#f9fafb',
  },
  emptyRow: {
    minHeight: 30,
  },
  footerInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lineasText: {
    fontSize: 10,
    color: '#000000',
    flex: 1,
  },
  totalesColumn: {
    alignItems: 'flex-end',
    flex: 1,
  },
  totalPaginaText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  totalGeneralText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  lineasTotalText: {
    fontSize: 9,
    color: '#000000',
  },
  separatorLine: {
    height: 2,
    backgroundColor: '#000000',
    marginVertical: 8,
  },
  footerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeftColumn: {
    flex: 1,
  },
  footerUserName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  footerPhone: {
    fontSize: 9,
    color: '#000000',
  },
  footerPageNumber: {
    fontSize: 9,
    color: '#000000',
    textAlign: 'right',
  },
  portadaCosto: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
})

export default InventoryReportModal
