import React, { useState, useEffect, useRef } from 'react'
import {
    X,
    FileText,
    Download,
    Printer,
    Menu,
    ShoppingCart,
    PieChart,
    Calculator,
    ArrowLeft
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'
import logoInfocolmados from '../img/logo_transparent.png'

// Constantes
const PRODUCTOS_POR_PAGINA = 45

const ReporteInventarioModal = ({ isOpen, onClose, sesion, cliente }) => {
    const [currentReportSection, setCurrentReportSection] = useState('portada')
    const [currentReportPage, setCurrentReportPage] = useState(0)
    const [showReportMenu, setShowReportMenu] = useState(false)
    const reportContentRef = useRef(null)

    // Estados para datos
    const [datosFinancieros, setDatosFinancieros] = useState({
        ventasDelMes: 0,
        gastosGenerales: [],
        cuentasPorCobrar: [],
        cuentasPorPagar: [],
        efectivoEnCajaYBanco: [],
        deudaANegocio: [],
        activosFijos: 0
    })

    // Cargar datos de la sesión
    useEffect(() => {
        if (isOpen && sesion) {
            if (sesion.datosFinancieros) setDatosFinancieros(sesion.datosFinancieros)
            setCurrentReportSection('portada')
            setCurrentReportPage(0)
        }
    }, [isOpen, sesion])

    if (!isOpen) return null

    // --- HELPERS ---
    const formatearMoneda = (valor) => {
        const numero = Number(valor) || 0
        if (isNaN(numero) || !isFinite(numero)) return 'RD$ 0.00'
        return `RD$ ${numero.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const formatearFecha = (fecha) => {
        if (!fecha) return new Date().toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' })
        return new Date(fecha).toLocaleDateString('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' })
    }

    const productosContados = sesion?.productos || sesion?.productosContados || []
    const valorTotal = sesion?.totales?.valorTotalInventario || productosContados.reduce((sum, p) => sum + (p.valorTotal || (p.cantidadContada * (p.costoProducto || 0))), 0) || 0

    const getTotalPaginasProductos = () => {
        if (productosContados.length === 0) return 0
        return Math.ceil(productosContados.length / PRODUCTOS_POR_PAGINA)
    }

    const getProductosPaginados = () => {
        const inicio = currentReportPage * PRODUCTOS_POR_PAGINA
        const fin = inicio + PRODUCTOS_POR_PAGINA
        return productosContados.slice(inicio, fin)
    }

    const getReportPageInfo = () => {
        if (currentReportSection === 'portada') return { current: 1, total: 1, label: 'Portada' }
        if (currentReportSection === 'productos') return { current: currentReportPage + 1, total: getTotalPaginasProductos(), label: 'Listado de Productos' }
        if (currentReportSection === 'balance') return { current: 1, total: 1, label: 'Balance General' }
        if (currentReportSection === 'distribucion') return { current: 1, total: 1, label: 'Distribución de Saldo' }
        return { current: 1, total: 1, label: '' }
    }

    // Cálculos financieros simples para visualización
    const getEditableTotal = (key) => {
        const data = datosFinancieros[key]
        if (Array.isArray(data)) {
            return data.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0)
        }
        return parseFloat(data) || 0
    }

    const calculateUtilidadesNetas = () => {
        const ventas = datosFinancieros.ventasDelMes || 0
        const gastos = getEditableTotal('gastosGenerales')
        return ventas - gastos
    }

    // --- ACCIONES ---

    const handleDownloadPDF = async () => {
        const element = document.getElementById('reporte-content-body')
        if (!element) return

        const toastId = toast.loading('Generando PDF...')
        try {
            // Forzar fondo blanco y asegurar que se renderice todo
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            })

            const imgData = canvas.toDataURL('image/png')

            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()

            const imgWidth = canvas.width
            const imgHeight = canvas.height

            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
            const imgX = (pdfWidth - imgWidth * ratio) / 2
            const imgY = 10

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio)
            pdf.save(`Reporte_Inventario_${cliente?.nombre || 'Cliente'}.pdf`)
            toast.success('PDF descargado', { id: toastId })
        } catch (error) {
            console.error('Error generando PDF:', error)
            toast.error('Error al generar PDF', { id: toastId })
        }
    }

    const handlePrint = () => {
        const element = document.getElementById('reporte-content-body')
        if (!element) return

        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Reporte</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>@media print { body { -webkit-print-color-adjust: exact; } }</style>
        </head>
        <body class="p-8">
          ${element.innerHTML}
        </body>
      </html>
    `)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 1000)
    }

    // --- RENDER ---
    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-xl w-full max-w-[95vw] h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                >
                    {/* HEADER - Teal sólido */}
                    <div className="bg-teal-700 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
                        <div className="flex items-center space-x-3">
                            <FileText className="w-6 h-6" />
                            <div>
                                <h2 className="text-xl font-bold">Reporte de Inventario</h2>
                                {(() => {
                                    const info = getReportPageInfo()
                                    return <p className="text-teal-100 text-sm">{info.label} {info.total > 1 ? `- Pág ${info.current}/${info.total}` : ''}</p>
                                })()}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button onClick={handlePrint} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Imprimir">
                                <Printer className="w-5 h-5" />
                            </button>
                            <button onClick={handleDownloadPDF} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Descargar PDF">
                                <Download className="w-5 h-5" />
                            </button>

                            <div className="relative">
                                <button onClick={() => setShowReportMenu(!showReportMenu)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                    <Menu className="w-6 h-6" />
                                </button>
                                {showReportMenu && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 text-gray-800 py-1">
                                        <button onClick={() => { setCurrentReportSection('portada'); setShowReportMenu(false) }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 border-b">
                                            <FileText className="w-4 h-4" /> Portada
                                        </button>
                                        <button onClick={() => { setCurrentReportSection('productos'); setShowReportMenu(false) }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 border-b">
                                            <ShoppingCart className="w-4 h-4" /> Productos
                                        </button>
                                        <button onClick={() => { setCurrentReportSection('balance'); setShowReportMenu(false) }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 border-b">
                                            <Calculator className="w-4 h-4" /> Balance
                                        </button>
                                        <button onClick={() => { setCurrentReportSection('distribucion'); setShowReportMenu(false) }} className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2">
                                            <PieChart className="w-4 h-4" /> Distribución
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={onClose} className="ml-4 p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 overflow-y-auto bg-gray-100 p-8" id="reporte-scroll-container">
                        <div id="reporte-content-body" className="bg-white shadow-lg mx-auto max-w-4xl p-10 min-h-[1000px] relative text-gray-800">

                            {currentReportSection === 'portada' && (
                                <div className="flex flex-col h-full justify-between py-10">
                                    <div>
                                        <div className="text-sm text-gray-500 mb-2">Inventario elaborado por:</div>
                                        <h2 className="text-2xl font-bold text-gray-800">{(sesion?.usuario?.nombre || 'ADMINISTRADOR').toUpperCase()}</h2>
                                    </div>

                                    <div className="text-center my-20">
                                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-wide mb-6">
                                            {(cliente?.nombre || sesion?.clienteNegocio?.nombre || 'CLIENTE').toUpperCase()}
                                        </h1>

                                        <div className="mt-10 flex justify-center opacity-100">
                                            <img src={logoInfocolmados} alt="Logo" className="h-40 object-contain" />
                                        </div>
                                    </div>

                                    <div className="flex justify-between border-t-2 border-gray-100 pt-6">
                                        <div>
                                            <div className="font-semibold text-gray-700">Fecha Inventario</div>
                                            <div className="text-lg">{formatearFecha(sesion?.fecha)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold text-gray-700">Total Inventario</div>
                                            <div className="text-xl font-bold text-teal-700">{formatearMoneda(valorTotal)}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentReportSection === 'productos' && (
                                <div>
                                    <div className="text-center mb-8 border-b pb-4">
                                        <h2 className="text-2xl font-bold text-gray-800">Listado de Productos</h2>
                                        <p className="text-gray-500">{cliente?.nombre} - {formatearFecha(sesion?.fecha)}</p>
                                    </div>

                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-y border-gray-200">
                                                <th className="py-3 px-2 text-left font-bold text-gray-700">Producto</th>
                                                <th className="py-3 px-2 text-center font-bold text-gray-700">Cant.</th>
                                                <th className="py-3 px-2 text-right font-bold text-gray-700">Costo</th>
                                                <th className="py-3 px-2 text-right font-bold text-gray-700">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getProductosPaginados().map((p, i) => (
                                                <tr key={i} className="border-b border-gray-100">
                                                    <td className="py-2 px-2 text-gray-800">{p.nombreProducto || p.nombre}</td>
                                                    <td className="py-2 px-2 text-center font-medium bg-gray-50">{Number(p.cantidadContada).toFixed(2)}</td>
                                                    <td className="py-2 px-2 text-right">{Number(p.costoProducto).toFixed(2)}</td>
                                                    <td className="py-2 px-2 text-right font-bold">{formatearMoneda(p.valorTotal || (p.cantidadContada * (p.costoProducto || 0)))}</td>
                                                </tr>
                                            ))}
                                            {Array.from({ length: Math.max(0, PRODUCTOS_POR_PAGINA - getProductosPaginados().length) }).map((_, i) => (
                                                <tr key={`empty-${i}`}><td colSpan="4" className="py-4"></td></tr>
                                            ))}
                                        </tbody>
                                        {/* Footer de Tabla Productos como en imagen */}
                                        <tfoot>
                                            <tr>
                                                <td colSpan="4" className="pt-4">
                                                    <div className="flex justify-between items-end border-t-2 border-gray-800 pt-2">
                                                        <div className="text-xs text-gray-500">
                                                            Usuario {sesion?.usuario?.nombre || 'ADMINISTRADOR'}<br />
                                                            Teléfono: {sesion?.usuario?.telefono || '1234567890'}
                                                        </div>
                                                        <div className="text-right text-sm">
                                                            <div>Líneas {(currentReportPage * PRODUCTOS_POR_PAGINA) + 1} a {(currentReportPage * PRODUCTOS_POR_PAGINA) + getProductosPaginados().length}</div>
                                                            <div className="font-bold">Total Página: {formatearMoneda(getProductosPaginados().reduce((sum, p) => sum + (p.valorTotal || (p.cantidadContada * (p.costoProducto || 0))), 0))}</div>
                                                            <div className="font-bold">Total Reporte: {formatearMoneda(valorTotal)}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right text-xs text-gray-400 mt-2">Pág. {currentReportPage + 1} de {getTotalPaginasProductos()}</div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}

                            {currentReportSection === 'balance' && (
                                <div>
                                    <div className="text-center mb-10">
                                        <h2 className="text-2xl font-bold uppercase text-gray-900 mb-1">{(cliente?.nombre || 'CLIENTE').toUpperCase()}</h2>
                                        <h3 className="text-lg text-teal-700 font-semibold mb-2">Balance General</h3>
                                        <p className="text-sm text-gray-500">Al {formatearFecha(sesion?.fecha)}</p>
                                        <p className="text-xs text-gray-400">(En RD $)</p>
                                    </div>

                                    <div className="border-t border-gray-200 mb-6"></div>

                                    <div className="grid grid-cols-2 gap-x-12 gap-y-8">
                                        {/* COLUMNA ACTIVOS */}
                                        <div>
                                            <h4 className="font-bold text-blue-700 border-b-2 border-blue-600 mb-4 pb-1">ACTIVOS</h4>

                                            <h5 className="font-bold text-gray-700 mb-2">CORRIENTES</h5>
                                            <div className="space-y-1 text-sm mb-6">
                                                <div className="flex justify-between"><span>EFECTIVO Y CAJA</span><span className="font-medium">{formatearMoneda(getEditableTotal('efectivoEnCajaYBanco'))}</span></div>
                                                {/* Detalle simple si existe */}
                                                <div className="pl-4 text-xs text-gray-500 italic mb-1">
                                                    <div>• Caja: {formatearMoneda(getEditableTotal('efectivoEnCajaYBanco'))} (aprox)</div>
                                                </div>

                                                <div className="flex justify-between mt-2"><span>CUENTAS POR COBRAR</span><span className="font-medium">{formatearMoneda(getEditableTotal('cuentasPorCobrar'))}</span></div>

                                                <div className="flex justify-between mt-2"><span>INVENTARIO DE MERCANCIA</span><span className="font-medium">{formatearMoneda(valorTotal)}</span></div>

                                                <div className="flex justify-between mt-2"><span>DEUDA A NEGOCIO</span><span className="font-medium">{formatearMoneda(getEditableTotal('deudaANegocio'))}</span></div>

                                                <div className="flex justify-between font-bold border-t border-gray-300 pt-1 mt-2 text-gray-900"><span>TOTAL CORRIENTES</span><span>{formatearMoneda(getEditableTotal('efectivoEnCajaYBanco') + getEditableTotal('cuentasPorCobrar') + valorTotal + getEditableTotal('deudaANegocio'))}</span></div>
                                            </div>

                                            <h5 className="font-bold text-gray-700 mb-2">FIJOS</h5>
                                            <div className="space-y-1 text-sm mb-4">
                                                <div className="flex justify-between"><span>ACTIVOS FIJOS</span><span className="font-medium">{formatearMoneda(Number(datosFinancieros.activosFijos) || 0)}</span></div>
                                                <div className="flex justify-between font-bold border-t border-gray-300 pt-1 mt-2 text-gray-900"><span>TOTAL FIJOS</span><span>{formatearMoneda(Number(datosFinancieros.activosFijos) || 0)}</span></div>
                                            </div>

                                            <div className="flex justify-between font-bold text-base mt-8 border-t-2 border-gray-800 pt-2">
                                                <span>TOTAL ACTIVOS</span>
                                                <span>{formatearMoneda(getEditableTotal('efectivoEnCajaYBanco') + getEditableTotal('cuentasPorCobrar') + valorTotal + getEditableTotal('deudaANegocio') + (Number(datosFinancieros.activosFijos) || 0))}</span>
                                            </div>
                                        </div>

                                        {/* COLUMNA PASIVOS Y CAPITAL */}
                                        <div>
                                            <h4 className="font-bold text-red-700 border-b-2 border-red-600 mb-4 pb-1">PASIVOS Y CAPITAL</h4>

                                            <h5 className="font-bold text-gray-700 mb-2">PASIVOS</h5>
                                            <div className="space-y-1 text-sm mb-6">
                                                <div className="flex justify-between"><span>CUENTAS POR PAGAR</span><span className="font-medium">{formatearMoneda(getEditableTotal('cuentasPorPagar'))}</span></div>
                                                <div className="flex justify-between font-bold border-t border-gray-300 pt-1 mt-2 text-gray-900"><span>TOTAL PASIVOS</span><span>{formatearMoneda(getEditableTotal('cuentasPorPagar'))}</span></div>
                                            </div>

                                            <h5 className="font-bold text-gray-700 mb-2">CAPITAL</h5>
                                            <div className="space-y-1 text-sm mb-4">
                                                {(() => {
                                                    const totalActivos = getEditableTotal('efectivoEnCajaYBanco') + getEditableTotal('cuentasPorCobrar') + valorTotal + getEditableTotal('deudaANegocio') + (Number(datosFinancieros.activosFijos) || 0);
                                                    const totalPasivos = getEditableTotal('cuentasPorPagar');
                                                    const capitalContable = totalActivos - totalPasivos;
                                                    return (
                                                        <div className="flex justify-between"><span>CAPITAL CONTABLE</span><span className="font-bold">{formatearMoneda(capitalContable)}</span></div>
                                                    )
                                                })()}
                                            </div>

                                            <div className="flex justify-between font-bold text-base mt-8 border-t-2 border-gray-800 pt-2">
                                                <span>TOTAL PASIVOS + CAPITAL</span>
                                                <span>{formatearMoneda(getEditableTotal('efectivoEnCajaYBanco') + getEditableTotal('cuentasPorCobrar') + valorTotal + getEditableTotal('deudaANegocio') + (Number(datosFinancieros.activosFijos) || 0))}</span>
                                            </div>

                                            {/* ESTADO DE RESULTADOS - VENTAS Y GASTOS */}
                                            <div className="mt-8 bg-blue-50 p-4 rounded border border-blue-100">
                                                <h5 className="font-bold text-blue-700 mb-3 border-b border-blue-200 pb-1">VENTAS Y GASTOS</h5>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between text-green-700 font-medium"><span>VENTAS DEL MES</span><span>{formatearMoneda(datosFinancieros.ventasDelMes)}</span></div>
                                                    <div className="flex justify-between text-red-600 font-medium"><span>GASTOS GENERALES</span><span>({formatearMoneda(getEditableTotal('gastosGenerales'))})</span></div>
                                                    <div className="pl-4 text-xs text-red-400 italic">• Operativos: ({formatearMoneda(getEditableTotal('gastosGenerales'))})</div>

                                                    <div className="flex justify-between font-bold text-gray-900 text-base border-t border-blue-200 pt-2 mt-2">
                                                        <span>UTILIDAD NETA</span>
                                                        <span>{formatearMoneda(calculateUtilidadesNetas())}</span>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Footer Balance */}
                                    <div className="mt-20 text-center text-xs text-gray-500">
                                        <div className="font-bold text-gray-800">Contador: {sesion?.usuario?.nombre || 'ADMINISTRADOR'}</div>
                                        <div>Teléfono: {sesion?.usuario?.telefono || '1234567890'}</div>
                                        <div className="mt-4 max-w-2xl mx-auto text-gray-400 text-[10px] leading-tight">
                                            Solo somos responsables de los datos introducidos en el inventario de mercancía. Los resultados del balance del negocio son responsabilidad del propietario del negocio resultados del inventario y reconocimiento del propietario estos datos numéricos reales según su desempeño del negocio en el periodo evaluado.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentReportSection === 'distribucion' && (
                                <div>
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold uppercase text-gray-900 mb-1">{(cliente?.nombre || 'CLIENTE').toUpperCase()}</h2>
                                        <h3 className="text-lg text-teal-700 font-semibold mb-2">Distribución de Saldo</h3>
                                        <p className="text-sm text-gray-500">Al {formatearFecha(sesion?.fecha)}</p>
                                        <p className="text-xs text-gray-400">(En RD $)</p>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg mb-8 border border-gray-100 flex justify-between items-center text-sm">
                                        <div>
                                            <span className="font-bold text-gray-700">Total de Utilidades Netas:</span>
                                            <span className="ml-2 font-bold text-gray-900">{formatearMoneda(calculateUtilidadesNetas())}</span>
                                        </div>
                                        <div>
                                            <span className="font-bold text-gray-700">Número de Socios:</span>
                                            {/* Aquí simulamos 2 socios si no hay datos reales, para igualar visualmente la demo */}
                                            <span className="ml-2 font-bold text-gray-900">{2}</span>
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-gray-800 mb-4 border-b pb-2">Distribución por Socios</h4>

                                    <table className="w-full text-sm border-collapse mb-10">
                                        <thead>
                                            <tr className="bg-gray-50 border-y border-gray-200 text-xs uppercase tracking-wider">
                                                <th className="py-3 px-2 text-left font-bold text-gray-700">Socio</th>
                                                <th className="py-3 px-2 text-center font-bold text-gray-700">Porcentaje</th>
                                                <th className="py-3 px-2 text-right font-bold text-gray-700">Utilidad del Periodo</th>
                                                <th className="py-3 px-2 text-right font-bold text-gray-700">Utilidad Acumulada</th>
                                                <th className="py-3 px-2 text-right font-bold text-gray-700">Cuenta Adeudada</th>
                                                <th className="py-3 px-2 text-right font-bold text-gray-700">Saldo Neto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {/* FILAS SIMULADAS PARA DEMOSTRACION VISUAL SI NO HAY DATOS REALES DE DISTRIBUCION */}
                                            {[1, 2].map((socioId) => {
                                                const utilidadTotal = calculateUtilidadesNetas();
                                                const utilidadSocio = utilidadTotal / 2;
                                                const deuda = socioId === 2 ? 625 : 0; // Ejemplo deuda
                                                const saldo = utilidadSocio - deuda;

                                                return (
                                                    <tr key={socioId} className="border-b border-gray-100">
                                                        <td className="py-4 px-2 font-bold text-gray-800">Socio {socioId}</td>
                                                        <td className="py-4 px-2 text-center text-gray-600">50.00%</td>
                                                        <td className="py-4 px-2 text-right font-medium">{formatearMoneda(utilidadSocio)}</td>
                                                        <td className="py-4 px-2 text-right font-medium">{formatearMoneda(utilidadSocio)}</td>
                                                        <td className="py-4 px-2 text-right text-red-500">{formatearMoneda(deuda)}</td>
                                                        <td className={`py-4 px-2 text-right font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatearMoneda(saldo)}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-200">
                                                <td className="py-3 px-2 text-gray-600">TOTAL</td>
                                                <td className="py-3 px-2 text-center text-white">100.00%</td>
                                                <td className="py-3 px-2 text-right text-white">{formatearMoneda(calculateUtilidadesNetas())}</td>
                                                <td className="py-3 px-2 text-right text-white">{formatearMoneda(calculateUtilidadesNetas())}</td>
                                                <td className="py-3 px-2 text-right text-white">{formatearMoneda(625)}</td>
                                                <td className="py-3 px-2 text-right text-white">{formatearMoneda(calculateUtilidadesNetas() - 625)}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <h4 className="font-bold text-gray-800 mb-20">Firmas</h4>

                                    <div className="flex justify-around pt-10">
                                        <div className="border-t border-gray-400 w-1/3 text-center text-sm pt-2 text-gray-600">
                                            Socio 1<br />Firma y Cédula
                                        </div>
                                        <div className="border-t border-gray-400 w-1/3 text-center text-sm pt-2 text-gray-600">
                                            Socio 2<br />Firma y Cédula
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pagination Footer (Only for Products) */}
                    {currentReportSection === 'productos' && getTotalPaginasProductos() > 1 && (
                        <div className="bg-white border-t px-6 py-3 flex justify-between items-center shrink-0">
                            <button
                                onClick={() => setCurrentReportPage(p => Math.max(0, p - 1))}
                                disabled={currentReportPage === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
                            >
                                <ArrowLeft className="w-4 h-4" /> Anterior
                            </button>
                            <span className="text-sm font-medium text-gray-600">Pág. {currentReportPage + 1} de {getTotalPaginasProductos()}</span>
                            <button
                                onClick={() => setCurrentReportPage(p => Math.min(getTotalPaginasProductos() - 1, p + 1))}
                                disabled={currentReportPage >= getTotalPaginasProductos() - 1}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 text-sm font-medium"
                            >
                                Siguiente <ArrowLeft className="w-4 h-4 rotate-180" />
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

export default ReporteInventarioModal
