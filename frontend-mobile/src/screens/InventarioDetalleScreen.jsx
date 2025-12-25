import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Vibration,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BarCodeScanner } from 'expo-barcode-scanner'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import api, { sesionesApi, productosApi, invitacionesApi, solicitudesConexionApi, handleApiError } from '../services/api'
import { showMessage } from 'react-native-flash-message'
import { LinearGradient } from 'expo-linear-gradient'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { getInternetCredentials } from '../services/secureStorage'
import SplashScreen from '../components/SplashScreen'
import { useLoader } from '../context/LoaderContext'

// Importar modales
import DistribucionModal from '../components/modals/DistribucionModal'
import ContadorModal from '../components/modals/ContadorModal'
import ConfigurationModal from '../components/modals/ConfigurationModal'
import ExportModal from '../components/modals/ExportModal'
import ReportPreviewModal from '../components/modals/ReportPreviewModal'
import InventoryReportModal from '../components/modals/InventoryReportModal'
import FinancialModal from '../components/modals/FinancialModal'
import ProductSearchModal from '../components/modals/ProductSearchModal'
import ZeroCostProductsModal from '../components/modals/ZeroCostProductsModal'
import ProductosGeneralesModal from '../components/modals/ProductosGeneralesModal'

const { width, height } = Dimensions.get('window')

const InventarioDetalleScreen = ({ route, navigation }) => {
  const { sesionId } = route.params
  const queryClient = useQueryClient()
  const { showAnimation, hideLoader, showLoader } = useLoader()

  // Estados principales
  const [selectedProducto, setSelectedProducto] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [costo, setCosto] = useState('')

  // Estados de modales
  const [showScanner, setShowScanner] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [activeFinancialModal, setActiveFinancialModal] = useState(null)
  const [showFinancialModal, setShowFinancialModal] = useState(false)
  const [showDistribucionModal, setShowDistribucionModal] = useState(false)
  const [showContadorModal, setShowContadorModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportInitialConfig, setExportInitialConfig] = useState(null)
  const [showReportPreviewModal, setShowReportPreviewModal] = useState(false)
  const [showInventoryReportModal, setShowInventoryReportModal] = useState(false)
  const [reportType, setReportType] = useState(null)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showConfigurationModal, setShowConfigurationModal] = useState(false)

  // Estados de permisos y escáner
  const [hasPermission, setHasPermission] = useState(null)
  const [isQuickScanMode, setIsQuickScanMode] = useState(false)

  // Estados de temporizador
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)

  // Estados para nuevos productos
  const [newProductData, setNewProductData] = useState({
    nombre: '',
    sku: '',
    codigoBarras: '',
    categoria: '',
    unidad: 'unidad',
    costo: '',
    descripcion: '',
    proveedor: ''
  })

  // Valores por defecto para datos financieros
  const defaultFinancialData = {
    ventasDelMes: 0,
    gastosGenerales: [], // Array de gastos
    cuentasPorCobrar: [], // Array de cuentas por cobrar
    cuentasPorPagar: [], // Array de cuentas por pagar
    efectivoEnCajaYBanco: [], // Array de efectivo
    deudaANegocio: [], // Array de deudas de socios al negocio
    activosFijos: 0
  }

  // Estados financieros
  const [datosFinancieros, setDatosFinancieros] = useState(defaultFinancialData)

  // Estados de distribución
  const [distribucionData, setDistribucionData] = useState({
    numeroSocios: 2,
    socios: [
      { nombre: '', porcentaje: 50, utilidadAcumulada: 0, utilidadPeriodo: 0, cuentaAdeudada: 0 },
      { nombre: '', porcentaje: 50, utilidadAcumulada: 0, utilidadPeriodo: 0, cuentaAdeudada: 0 }
    ],
    fechaDesde: '',
    fechaHasta: '',
    comentarios: ''
  })

  // Estados del contador
  const [contadorData, setContadorData] = useState({
    costoServicio: 0,
    fechaInventario: new Date().toISOString().split('T')[0],
    periodicidad: 'mensual',
    proximaFecha: '',
    notas: ''
  })

  // Estados para productos con costo cero
  const [showZeroCostProductsModal, setShowZeroCostProductsModal] = useState(false)
  const [zeroCostProductsEdits, setZeroCostProductsEdits] = useState({})
  const [isUpdatingZeroCosts, setIsUpdatingZeroCosts] = useState(false)

  // Estados para confirmación de eliminación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Estados para nuevas funciones
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showFindEditModal, setShowFindEditModal] = useState(false)
  const [findTerm, setFindTerm] = useState('')
  const [editDraft, setEditDraft] = useState({})
  const [showProductosGeneralesModal, setShowProductosGeneralesModal] = useState(false)

  // Estados para colaboración
  const [qrInvitacionData, setQrInvitacionData] = useState(null)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [colaboradoresActivos, setColaboradoresActivos] = useState([])
  const [invitaciones, setInvitaciones] = useState([])
  const [productosColaboradorPendientes, setProductosColaboradorPendientes] = useState({})

  // Obtener datos de la sesión
  const { data: sesionData, isLoading: loadingSesion, isFetching, refetch } = useQuery(
    ['sesion', sesionId],
    () => sesionesApi.getById(sesionId),
    {
      select: (data) => {
        const sesion = data.data.datos?.sesion || data.data.sesion || data.data;
        return sesion;
      },
      enabled: !!sesionId,
      refetchInterval: 5000, // Actualizar cada 5 segundos como en la web
    }
  )

  // Cargar datos de colaboradores e invitaciones
  useEffect(() => {
    if (sesionId) {
      cargarColaboradoresConectados()
      cargarInvitaciones()

      const interval = setInterval(() => {
        cargarColaboradoresConectados()
        cargarInvitaciones()
      }, 30000) // Aumentado de 10s a 30s para reducir solicitudes

      return () => clearInterval(interval)
    }
  }, [sesionId])

  const cargarInvitaciones = async () => {
    try {
      const response = await invitacionesApi.listMine()
      setInvitaciones(response.data?.datos || [])
    } catch (error) {
      console.log('Error cargando invitaciones', error)
    }
  }

  const cargarColaboradoresConectados = async () => {
    try {
      const response = await solicitudesConexionApi.listarConectados(sesionId)
      const colaboradores = response.data?.datos || []
      setColaboradoresActivos(colaboradores)

      const productosPorColaborador = {}
      for (const colab of colaboradores) {
        try {
          const prodResponse = await solicitudesConexionApi.obtenerProductosOffline(colab._id)
          const productos = prodResponse.data?.datos || []
          if (productos.length > 0) {
            productosPorColaborador[colab._id] = productos
          }
        } catch (e) {
          console.log('Error productos colab', e)
        }
      }
      setProductosColaboradorPendientes(productosPorColaborador)
    } catch (error) {
      console.log('Error cargando conectados', error)
    }
  }

  const handleSincronizarColaborador = async (colaboradorId) => {
    try {
      showLoader()
      const productos = productosColaboradorPendientes[colaboradorId] || []
      if (productos.length === 0) return

      // Procesar en lotes de 20
      const BATCH_SIZE = 20
      const batches = []
      for (let i = 0; i < productos.length; i += BATCH_SIZE) {
        batches.push(productos.slice(i, i + BATCH_SIZE))
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        showMessage({
          message: `Sincronizando lote ${i + 1}/${batches.length}...`,
          type: 'info'
        })

        // Procesar cada producto del lote
        for (const pOffline of batch) {
          const pData = pOffline.productoData

          // Buscar si existe en sesión
          const existente = productosContados.find(p =>
            p.nombreProducto?.toLowerCase().trim() === pData.nombre?.toLowerCase().trim()
          )

          if (existente) {
            await sesionesApi.updateProduct(sesionId, existente.productoId, {
              cantidadContada: (existente.cantidadContada || 0) + Number(pData.cantidad || 1),
              costoProducto: Number(pData.costo) || 0
            })
          } else {
            // Crear/Buscar producto cliente
            let productoClienteId
            try {
              // Intentar buscar por nombre primero
              const busqueda = await productosApi.getByClient(sesionData?.clienteNegocio?._id, { buscar: pData.nombre })
              const encontrado = busqueda.data?.datos?.productos?.[0]
              if (encontrado) {
                productoClienteId = encontrado._id
              } else {
                // Crear
                const nuevo = await productosApi.createForClient(sesionData?.clienteNegocio?._id, {
                  nombre: pData.nombre,
                  costo: Number(pData.costo) || 0,
                  unidad: 'unidad',
                  sku: pData.sku || ''
                })
                productoClienteId = nuevo.data?.datos?.producto?._id
              }
            } catch (e) {
              console.log('Error creando producto', e)
              continue
            }

            if (productoClienteId) {
              await sesionesApi.addProduct(sesionId, {
                producto: productoClienteId,
                cantidadContada: Number(pData.cantidad || 1),
                costoProducto: Number(pData.costo) || 0
              })
            }
          }
        }

        // Marcar sincronizados
        const temporalIds = batch.map(p => p.temporalId)
        await solicitudesConexionApi.sincronizar(colaboradorId, temporalIds)
      }

      showMessage({ message: 'Sincronización completada', type: 'success' })
      cargarColaboradoresConectados()
      queryClient.invalidateQueries(['sesion', sesionId])
    } catch (error) {
      handleApiError(error)
    } finally {
      hideLoader()
    }
  }

  // Mutación para eliminar producto
  const deleteProductMutation = useMutation(
    (productId) => sesionesApi.removeProduct(sesionId, productId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['sesion', sesionId])
        showMessage({
          message: 'Producto eliminado exitosamente',
          type: 'success',
        })
      },
      onError: handleApiError,
    }
  )

  // Mutación para actualizar datos financieros
  const updateFinancialMutation = useMutation(
    (financialData) => sesionesApi.updateFinancial(sesionId, financialData),
    {
      onSuccess: (response, variables) => {
        // Actualizar el estado local inmediatamente
        setDatosFinancieros(variables)
        queryClient.invalidateQueries(['sesion', sesionId])
        showMessage({
          message: 'Datos financieros actualizados',
          type: 'success',
        })
      },
      onError: handleApiError,
    }
  )

  // Mutación para agregar producto
  const addProductMutation = useMutation(
    (productData) => sesionesApi.addProduct(sesionId, productData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['sesion', sesionId]);
        showMessage({ message: 'Producto agregado exitosamente', type: 'success' });
        resetForm();
      },
      onError: handleApiError,
    }
  );

  // Completar sesión (guardar y salir)
  const completeSessionMutation = useMutation(
    () => sesionesApi.complete(sesionId),
    {
      onSuccess: () => {
        showMessage({ message: 'Sesión guardada exitosamente', type: 'success' })
        navigation.goBack()
      },
      onError: handleApiError,
      onSettled: () => hideLoader()
    }
  )

  // Mutación para crear producto para cliente
  const createProductMutation = useMutation(
    (productData) => {
      const clienteId = sesionData?.clienteNegocio?._id;
      if (!clienteId) {
        throw new Error('No se encontró el ID del cliente');
      }
      return productosApi.createForClient(clienteId, productData);
    },
    {
      onSuccess: (data) => {
        const newProduct = data.data.datos?.producto || data.data.producto;
        // Agregar el producto recién creado al inventario
        addProductMutation.mutate({
          productoClienteId: newProduct._id,
          cantidadContada: 1,
          costoProducto: newProduct.costo || 0,
        });
        setShowAddProductModal(false);
        resetNewProductForm();
        showMessage({ message: 'Producto creado y agregado exitosamente', type: 'success' });
      },
      onError: handleApiError,
    }
  );

  // Solicitar permisos de cámara
  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync()
      setHasPermission(status === 'granted')
    }
    getBarCodeScannerPermissions()
  }, [])

  // Inicializar datos financieros cuando se cargan los datos de la sesión
  useEffect(() => {
    if (sesionData?.datosFinancieros) {
      setDatosFinancieros({
        ...defaultFinancialData,
        ...sesionData.datosFinancieros,
        // Asegurar que los arrays existan, priorizando campos de detalle si existen
        gastosGenerales: Array.isArray(sesionData.datosFinancieros.gastosGeneralesDetalle)
          ? sesionData.datosFinancieros.gastosGeneralesDetalle
          : Array.isArray(sesionData.datosFinancieros.gastosGenerales)
            ? sesionData.datosFinancieros.gastosGenerales
            : (sesionData.datosFinancieros.gastosGenerales ? [{ monto: sesionData.datosFinancieros.gastosGenerales, descripcion: 'Gastos generales', categoria: 'Otros' }] : []),
        cuentasPorCobrar: Array.isArray(sesionData.datosFinancieros.cuentasPorCobrarDetalle)
          ? sesionData.datosFinancieros.cuentasPorCobrarDetalle
          : Array.isArray(sesionData.datosFinancieros.cuentasPorCobrar)
            ? sesionData.datosFinancieros.cuentasPorCobrar
            : (sesionData.datosFinancieros.cuentasPorCobrar ? [{ monto: sesionData.datosFinancieros.cuentasPorCobrar, descripcion: 'Cuenta por cobrar', cliente: 'Cliente' }] : []),
        cuentasPorPagar: Array.isArray(sesionData.datosFinancieros.cuentasPorPagarDetalle)
          ? sesionData.datosFinancieros.cuentasPorPagarDetalle
          : Array.isArray(sesionData.datosFinancieros.cuentasPorPagar)
            ? sesionData.datosFinancieros.cuentasPorPagar
            : (sesionData.datosFinancieros.cuentasPorPagar ? [{ monto: sesionData.datosFinancieros.cuentasPorPagar, descripcion: 'Cuenta por pagar', proveedor: 'Proveedor' }] : []),
        efectivoEnCajaYBanco: Array.isArray(sesionData.datosFinancieros.efectivoEnCajaYBancoDetalle)
          ? sesionData.datosFinancieros.efectivoEnCajaYBancoDetalle
          : Array.isArray(sesionData.datosFinancieros.efectivoEnCajaYBanco)
            ? sesionData.datosFinancieros.efectivoEnCajaYBanco
            : (sesionData.datosFinancieros.efectivoEnCajaYBanco ? [{ monto: sesionData.datosFinancieros.efectivoEnCajaYBanco, descripcion: 'Efectivo en caja', tipoCuenta: 'Caja' }] : []),
        deudaANegocio: Array.isArray(sesionData.datosFinancieros.deudaANegocioDetalle)
          ? sesionData.datosFinancieros.deudaANegocioDetalle
          : Array.isArray(sesionData.datosFinancieros.deudaANegocio)
            ? sesionData.datosFinancieros.deudaANegocio
            : (sesionData.datosFinancieros.deudaANegocio ? [{ monto: sesionData.datosFinancieros.deudaANegocio, descripcion: 'Deuda de socio', deudor: 'Socio' }] : [])
      })
    }
  }, [sesionData])

  // Temporizador basado en timer del backend
  useEffect(() => {
    const tick = () => {
      const acumulado = Number(sesionData?.timerAcumuladoSegundos || 0)
      const enMarcha = Boolean(sesionData?.timerEnMarcha)
      const ultimoInicio = sesionData?.timerUltimoInicio ? new Date(sesionData.timerUltimoInicio).getTime() : 0
      let segundos = acumulado
      if (enMarcha && ultimoInicio) {
        const ahora = Date.now()
        segundos += Math.max(0, Math.floor((ahora - ultimoInicio) / 1000))
      }
      setTiempoTranscurrido(segundos)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [sesionData])

  // Pausar cronómetro al desmontar
  useEffect(() => {
    return () => {
      try {
        if (sesionData?.timerEnMarcha) {
          sesionesApi.pauseTimer(sesionId).catch(() => { })
        }
      } catch (_) { }
    }
  }, [sesionId, sesionData?.timerEnMarcha])

  // Formatear tiempo
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Manejar escaneo de código de barras
  const handleBarCodeScanned = async ({ data }) => {
    setShowScanner(false);
    try {
      // Primero buscar en productos generales por código de barras
      const response = await productosApi.getByBarcode(data);
      // Backend SQLite devuelve el objeto directamente en datos
      const productoGeneral = response.data.datos;

      if (productoGeneral) {
        // Si encontramos el producto general, verificar si el cliente ya lo tiene
        const clienteId = sesionData?.clienteNegocio?._id;
        if (clienteId) {
          try {
            const clientProductsResponse = await productosApi.getByClient(clienteId, { buscar: productoGeneral.nombre, limite: 1 });
            const clientProducts = clientProductsResponse.data.datos.productos;

            if (clientProducts && clientProducts.length > 0) {
              // El cliente ya tiene este producto
              const clientProduct = clientProducts[0];
              setSelectedProducto(clientProduct);
              setCantidad('1');
              setCosto(String(clientProduct.costo || ''));
              showMessage({ message: `Producto encontrado: ${clientProduct.nombre}`, type: 'info' });
            } else {
              // El cliente no tiene este producto, ofrecer crearlo
              Alert.alert(
                'Producto no asignado',
                `Se encontró "${productoGeneral.nombre}" pero no está asignado a este cliente. ¿Deseas asignarlo?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Asignar Producto', onPress: () => {
                      setNewProductData(prev => ({
                        ...prev,
                        nombre: productoGeneral.nombre,
                        descripcion: productoGeneral.descripcion || '',
                        categoria: productoGeneral.categoria || '',
                        unidad: productoGeneral.unidad || 'unidad',
                        costo: String(productoGeneral.costoBase || ''),
                        codigoBarras: data
                      }))
                      setShowAddProductModal(true)
                    }
                  }
                ]
              )
            }
          } catch (clientError) {
            // Error al buscar productos del cliente, ofrecer crear nuevo
            Alert.alert(
              'Producto encontrado',
              `Se encontró "${productoGeneral.nombre}". ¿Deseas asignarlo a este cliente?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Asignar Producto', onPress: () => {
                    setNewProductData(prev => ({
                      ...prev,
                      nombre: productoGeneral.nombre,
                      descripcion: productoGeneral.descripcion || '',
                      categoria: productoGeneral.categoria || '',
                      unidad: productoGeneral.unidad || 'unidad',
                      costo: String(productoGeneral.costoBase || ''),
                      codigoBarras: data
                    }))
                    setShowAddProductModal(true)
                  }
                }
              ]
            )
          }
        }
      } else {
        // No se encontró el producto, ofrecer crear uno nuevo
        Alert.alert(
          'Producto no encontrado',
          `No se encontró un producto con el código ${data}. ¿Deseas crear uno nuevo?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Crear Producto', onPress: () => {
                setNewProductData(prev => ({ ...prev, codigoBarras: data }))
                setShowAddProductModal(true)
              }
            }
          ]
        )
      }
    } catch (error) {
      Alert.alert(
        'Producto no encontrado',
        `No se encontró un producto con el código ${data}. ¿Deseas crear uno nuevo?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Crear Producto', onPress: () => {
              setNewProductData(prev => ({ ...prev, codigoBarras: data }))
              setShowAddProductModal(true)
            }
          }
        ]
      )
    }
  };


  // Resetear formulario
  const resetForm = () => {
    setSelectedProducto(null);
    setCantidad('');
    setCosto('');
  };

  // Resetear formulario de nuevo producto
  const resetNewProductForm = () => {
    setNewProductData({
      nombre: '',
      sku: '',
      codigoBarras: '',
      categoria: '',
      unidad: 'unidad',
      costo: '',
      descripcion: '',
      proveedor: ''
    })
  }

  // Agregar producto seleccionado
  const handleAddProduct = () => {
    if (!selectedProducto || !cantidad || parseFloat(cantidad) <= 0) {
      showMessage({ message: 'Selecciona un producto e ingresa una cantidad válida.', type: 'warning' });
      return;
    }

    addProductMutation.mutate({
      productoClienteId: selectedProducto._id,
      cantidadContada: parseFloat(cantidad),
      costoProducto: parseFloat(costo) || selectedProducto.costoBase || 0,
    });
  };

  // Crear nuevo producto
  const handleCreateProduct = () => {
    if (!newProductData.nombre || !newProductData.costo) {
      Alert.alert('Error', 'Completa al menos el nombre y el costo del producto')
      return
    }
    showAnimation('product', 4000)
    createProductMutation.mutate({
      ...newProductData,
      costo: parseFloat(newProductData.costo),
    })
  }

  // Confirmación de eliminación
  const openDeleteConfirm = (item) => {
    setDeleteTarget(item)
    setShowDeleteConfirm(true)
  }
  const confirmDelete = () => {
    // Priorizar ID de fila (rowId) para compatibilidad backend
    const rowId = deleteTarget?.id
    const productId = typeof deleteTarget?.producto === 'object' ? deleteTarget.producto?._id : deleteTarget?.producto

    if (rowId) {
      deleteProductMutation.mutate(rowId)
    } else if (productId) {
      deleteProductMutation.mutate(productId)
    }
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  // Transformar datos financieros para compatibilidad con backend
  const transformFinancialDataForBackend = (data) => {
    const transformed = { ...data }

    // Convertir arrays a totales para campos que el backend espera como números
    if (Array.isArray(data.gastosGenerales)) {
      transformed.gastosGenerales = data.gastosGenerales.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0)
      // Mantener el array en un campo separado para el frontend
      transformed.gastosGeneralesDetalle = data.gastosGenerales
    }

    if (Array.isArray(data.cuentasPorCobrar)) {
      transformed.cuentasPorCobrar = data.cuentasPorCobrar.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0)
      transformed.cuentasPorCobrarDetalle = data.cuentasPorCobrar
    }

    if (Array.isArray(data.cuentasPorPagar)) {
      transformed.cuentasPorPagar = data.cuentasPorPagar.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0)
      transformed.cuentasPorPagarDetalle = data.cuentasPorPagar
    }

    if (Array.isArray(data.efectivoEnCajaYBanco)) {
      transformed.efectivoEnCajaYBanco = data.efectivoEnCajaYBanco.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0)
      transformed.efectivoEnCajaYBancoDetalle = data.efectivoEnCajaYBanco
    }

    if (Array.isArray(data.deudaANegocio)) {
      transformed.deudaANegocio = data.deudaANegocio.reduce((sum, item) => sum + (parseFloat(item.monto) || 0), 0)
      transformed.deudaANegocioDetalle = data.deudaANegocio
    }

    return transformed
  }

  // Manejar guardado de datos financieros
  const handleSaveFinancial = (financialData) => {
    showAnimation('financial', 4000)
    const transformedData = transformFinancialDataForBackend(financialData)
    updateFinancialMutation.mutate(transformedData)
  }

  // Manejar exportación
  const handleExport = async (exportData) => {
    showAnimation('export', 60000)
    try {
      showMessage({
        message: `Exportando ${exportData.fileName || exportData.nombreArchivo}...`,
        type: 'info',
      })
      // Simular proceso de exportación real
      await new Promise(resolve => setTimeout(resolve, 2000))
    } finally {
      hideLoader()
    }
  }

  // Manejar vista previa
  const handlePreview = (reportInfo) => {
    showMessage({
      message: `Abriendo vista previa de ${reportInfo.fileName}...`,
      type: 'info',
    })
  }

  // Buscar productos por nombre
  const handleSearchProducts = (searchTerm) => {
    setNombreBusqueda(searchTerm)
    if (searchTerm.length > 2) {
      setShowSearchModal(true)
    }
  }

  // Renderizar producto en lista
  const renderProductoItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productoItem}
      onPress={() => {
        setSelectedProducto(item.producto)
        setCantidad(item.cantidadContada.toString())
        setCosto(item.costoProducto.toString())
      }}
    >
      <View style={styles.productoInfo}>
        <Text style={styles.productoNombre}>{item.nombreProducto || item.producto?.nombre}</Text>
        <Text style={styles.productoSku}>SKU: {item.skuProducto || item.producto?.sku || 'Sin SKU'}</Text>
        <View style={styles.productoStats}>
          <Text style={styles.productoCantidad}>Cant: {item.cantidadContada}</Text>
          <Text style={styles.productoCosto}>${item.costoProducto?.toLocaleString()}</Text>
          <Text style={styles.productoTotal}>
            Total: ${(item.valorTotal || (item.cantidadContada * item.costoProducto)).toLocaleString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => openDeleteConfirm(item)}
      >
        <Ionicons name="trash" size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  // Eliminado return condicional de carga para no romper el orden de hooks.

  // Procesar productos - el backend ya los ordena DESC (últimos primero)
  const productosContados = (sesionData?.productosContados || []).map(p => ({
    ...p,
    // El productoId ya viene del backend como el ID del producto contado
    productoId: p?.productoId || p?.id || p?._id || ''
  }))
  // NO hacer sort manual porque el backend ya ordena por updatedAt DESC
  const productosOrdenados = productosContados

  // Productos con costo 0
  const productosConCostoCero = productosContados.filter(p => (Number(p.costoProducto) || 0) === 0)
  const cantidadProductosCostoCero = productosConCostoCero.length

  const openFinancialModal = (modalType) => {
    setActiveFinancialModal(modalType);
    setShowFinancialModal(true);
  };

  const financialOptions = [
    { title: 'Ventas', icon: 'cart-outline', color: '#3b82f6', type: 'ventas' },
    { title: 'Gastos', icon: 'trending-down-outline', color: '#ef4444', type: 'gastos' },
    { title: 'Cuentas por Cobrar', icon: 'people-outline', color: '#22c55e', type: 'cuentasPorCobrar' },
    { title: 'Cuentas por Pagar', icon: 'card-outline', color: '#f97316', type: 'cuentasPorPagar' },
    { title: 'Efectivo', icon: 'wallet-outline', color: '#8b5cf6', type: 'efectivo' },
    { title: 'Deuda a Negocio', icon: 'person-remove-outline', color: '#f59e0b', type: 'deudaANegocio' },
    { title: 'Activos Fijos', icon: 'briefcase-outline', color: '#6366f1', type: 'activosFijos' },
    { title: 'Capital', icon: 'server-outline', color: '#64748b', type: 'capital' },
  ];

  const inventoryOptions = [
    {
      title: 'Productos Generales',
      icon: 'cube-outline',
      color: '#2563eb',
      onPress: () => setShowProductosGeneralesModal(true),
    },
    {
      title: 'Descargar Listado',
      icon: 'download-outline',
      color: '#0ea5e9',
      onPress: () => setShowDownloadOptions(true),
    },
    {
      title: 'Conectar',
      icon: 'phone-portrait-outline',
      color: '#8b5cf6',
      onPress: () => setShowConnectModal(true),
    },
    {
      title: 'Buscar Producto',
      icon: 'search-outline',
      color: '#10b981',
      onPress: () => setShowFindEditModal(true),
    },
    {
      title: 'Imprimir',
      icon: 'print-outline',
      color: '#6b7280',
      onPress: () => {
        setReportType('imprimir')
        setShowReportPreviewModal(true)
      }
    },
    {
      title: 'Ver Reporte',
      icon: 'document-text-outline',
      color: '#14b8a6',
      onPress: () => {
        setShowInventoryReportModal(true)
      }
    },
    {
      title: 'Configuración',
      icon: 'settings-outline',
      color: '#6b7280',
      onPress: () => {
        setShowMenuModal(false)
        setShowConfigurationModal(true)
      }
    },
  ];


  // Descarga Excel (CSV)
  const handleDownloadExcel = async () => {
    try {
      const header = ['Nombre', 'Código', 'Cantidad', 'Costo', 'Total']
      const rows = productosContados.map(p => [
        p.nombreProducto || '',
        p.skuProducto || '',
        String(p.cantidadContada ?? ''),
        String(p.costoProducto ?? ''),
        String(((Number(p.cantidadContada) || 0) * (Number(p.costoProducto) || 0)).toFixed(2))
      ])
      const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
      const fileUri = FileSystem.documentDirectory + `Listado_${sesionData?.numeroSesion || 'inventario'}.csv`
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 })
      await Sharing.shareAsync(fileUri)
      setShowDownloadOptions(false)
    } catch (e) {
      handleApiError(e)
    }
  }

  // Descarga PDF (si sesión completada usa backend)
  const handleDownloadPDF = async () => {
    try {
      const baseURL = api.defaults.baseURL
      const url = `${baseURL}/reportes/inventario/${sesionId}/pdf`
      const credentials = await getInternetCredentials('auth_token')
      const headers = credentials?.password ? { Authorization: `Bearer ${credentials.password}` } : {}

      const target = FileSystem.documentDirectory + `Inventario_${sesionData?.numeroSesion || 'inventario'}.pdf`
      const { uri, status } = await FileSystem.downloadAsync(url, target, { headers })
      if (status >= 200 && status < 300) {
        await Sharing.shareAsync(uri)
      } else {
        showMessage({ message: 'No se pudo descargar el PDF', type: 'danger' })
      }
      setShowDownloadOptions(false)
    } catch (e) {
      handleApiError(e)
    }
  }

  // Generar código QR para invitación de colaborador
  const handleGenerarQRInvitacion = async () => {
    try {
      setIsGeneratingQR(true)

      const response = await invitacionesApi.createQR({
        rol: 'colaborador',
        email: '',
        nombre: '',
        expiraEnMinutos: 1440 // 24 horas
      })

      if (response.data.exito) {
        setQrInvitacionData(response.data.datos)
        Vibration.vibrate(100)
        showMessage({
          message: 'Código QR generado',
          description: 'Compártelo con tus colaboradores',
          type: 'success',
        })
      }
    } catch (error) {
      handleApiError(error)
    } finally {
      setIsGeneratingQR(false)
    }
  }

  // Compartir QR de invitación
  const handleCompartirQR = async () => {
    try {
      if (!qrInvitacionData?.qrDataUrl) return

      const dataUrl = qrInvitacionData.qrDataUrl
      const base64 = dataUrl.replace(/^data:image\/(png|jpeg);base64,/, '')
      const fileUri = FileSystem.cacheDirectory + `invitacion-colaborador-${Date.now()}.png`

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          dialogTitle: 'Compartir código QR de invitación'
        })
      } else {
        showMessage({
          message: 'QR guardado en caché',
          type: 'info'
        })
      }
    } catch (error) {
      handleApiError(error)
    }
  }

  // Cerrar modal de QR
  const handleCerrarModalQR = () => {
    setShowConnectModal(false)
    setQrInvitacionData(null)
  }

  // Imprimir/descargar páginas específicas del PDF
  const handlePrintPages = async (pageSpec) => {
    try {
      const sanitized = String(pageSpec || '').replace(/\s+/g, '')
      const pattern = /^\d+(-\d+)?(,\d+(-\d+)?)*$/
      if (!sanitized) {
        showMessage({ message: 'Ingresa las páginas a imprimir, por ejemplo: 3-5 o 3,4,5', type: 'warning' })
        return
      }
      if (!pattern.test(sanitized)) {
        showMessage({ message: 'Formato de páginas inválido', type: 'warning' })
        return
      }

      const baseURL = api.defaults.baseURL
      const downloadUrl = `${baseURL}/reportes/inventario/${sesionId}/pdf?pages=${encodeURIComponent(sanitized)}`
      const credentials = await getInternetCredentials('auth_token')
      const headers = credentials?.password ? { Authorization: `Bearer ${credentials.password}` } : {}

      const fileUri = FileSystem.documentDirectory + `Inventario_${sesionData?.numeroSesion || 'inventario'}_pags_${sanitized}.pdf`
      const { uri, status } = await FileSystem.downloadAsync(downloadUrl, fileUri, { headers })
      if (status >= 200 && status < 300) {
        await Sharing.shareAsync(uri)
        showMessage({ message: 'Archivo listo', type: 'success' })
      } else if (status === 400) {
        showMessage({ message: 'Rango de páginas inválido en el servidor', type: 'warning' })
      } else if (status === 404) {
        showMessage({ message: 'Sesión no encontrada o sin finalizar', type: 'warning' })
      } else {
        showMessage({ message: 'No se pudo generar el PDF con las páginas solicitadas', type: 'danger' })
      }
    } catch (e) {
      handleApiError(e)
    }
  }

  // Guardar edición de producto
  const handleSaveEdit = async (item) => {
    try {
      const key = typeof item?.producto === 'object' ? item.producto?._id : item?.producto
      const cantidad = parseFloat(editDraft[key]?.cantidad ?? item.cantidadContada) || 0
      const costo = parseFloat(editDraft[key]?.costo ?? item.costoProducto) || 0
      await sesionesApi.updateProduct(sesionId, key, { cantidadContada: cantidad, costoProducto: costo })
      setEditDraft(prev => { const p = { ...prev }; delete p[key]; return p })
      queryClient.invalidateQueries(['sesion', sesionId])
      showMessage({ message: 'Producto actualizado', type: 'success' })
    } catch (e) {
      handleApiError(e)
    }
  }



  return (
    <View style={styles.container}>
      <Modal visible={loadingSesion} animationType="fade">
        <SplashScreen onComplete={() => { }} />
      </Modal>
      {/* Header */}
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={async () => {
              try {
                if (sesionData?.timerEnMarcha) {
                  await sesionesApi.pauseTimer(sesionId)
                }
              } catch (_) { }
              setShowExitModal(true)
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              Sesión {sesionData?.numeroSesion}
            </Text>
            <Text style={styles.headerSubtitle}>
              {sesionData?.clienteNegocio?.nombre}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.timerContainer}>
              <Ionicons name="time" size={16} color="#ffffff" />
              <Text style={styles.timerText}>{formatTime(tiempoTranscurrido)}</Text>
            </View>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowMenuModal(true)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalContainer}>
            <View style={styles.exitModalHeader}>
              <Ionicons name="alert-circle" size={24} color="#f59e0b" />
              <Text style={styles.exitModalTitle}>Salir de la sesión</Text>
            </View>
            <Text style={styles.exitModalMessage}>
              ¿Deseas salir sin guardar o guardar y salir? Puedes finalizar la sesión para conservar los cambios.
            </Text>
            <View style={styles.exitModalActions}>
              <TouchableOpacity
                style={[styles.exitButton, styles.exitCancel]}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={styles.exitCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exitButton, styles.exitWithoutSave]}
                onPress={() => {
                  setShowExitModal(false)
                  navigation.goBack()
                }}
              >
                <Text style={styles.exitWithoutSaveText}>Salir sin guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exitButton, styles.exitSave]}
                onPress={() => {
                  setShowExitModal(false)
                  showAnimation('config', 2000, 'Guardando sesión...')
                  completeSessionMutation.mutate()
                }}
              >
                <Text style={styles.exitSaveText}>Guardar y salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Botones de acción principales */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.scanButton]}
          onPress={() => setShowScanner(true)}
        >
          <Ionicons name="barcode" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Escanear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.searchButton]}
          onPress={() => setShowSearchModal(true)}
        >
          <Ionicons name="search" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Buscar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.addButton]}
          onPress={() => setShowAddProductModal(true)}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
          <Text style={styles.actionButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>


      {/* Formulario para agregar producto */}
      {selectedProducto && (
        <View style={styles.addFormContainer}>
          <Text style={styles.selectedProductTitle}>Agregando:</Text>
          <Text style={styles.selectedProductName}>{selectedProducto.nombre}</Text>
          <View style={styles.formRow}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Cantidad</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                keyboardType="numeric"
                value={cantidad}
                onChangeText={setCantidad}
                autoFocus
              />

            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Costo (c/u)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={costo}
                onChangeText={setCosto}
              />
            </View>
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={handleAddProduct}>
            <Ionicons name="add-circle" size={24} color="#ffffff" />
            <Text style={styles.submitButtonText}>Agregar al Inventario</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Estadísticas rápidas */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {sesionData?.productosContados?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Productos</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            ${sesionData?.totales?.valorTotalInventario?.toLocaleString() || '0'}
          </Text>
          <Text style={styles.statLabel}>Valor Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {sesionData?.totales?.totalProductosContados || 0}
          </Text>
          <Text style={styles.statLabel}>Contados</Text>
        </View>
      </View>

      {/* Lista de productos */}
      <FlatList
        data={productosOrdenados}
        renderItem={renderProductoItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        refreshing={isFetching}
        onRefresh={() => { showLoader(800); refetch(); }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay productos agregados</Text>
            <Text style={styles.emptySubtext}>
              Usa el escáner o búsqueda para agregar productos
            </Text>
          </View>
        }
      />

      {/* Modal del escáner */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showScanner}
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={styles.scannerContainer}>
          {hasPermission === null && (
            <Text>Solicitando permisos de cámara...</Text>
          )}
          {hasPermission === false && (
            <Text>Sin acceso a la cámara</Text>
          )}
          {hasPermission && (
            <BarCodeScanner
              onBarCodeScanned={handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity
                style={styles.scannerCloseButton}
                onPress={() => setShowScanner(false)}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Escanear Código de Barras</Text>
            </View>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerInstructions}>
              Apunta la cámara hacia el código de barras
            </Text>
          </View>
        </View>
      </Modal>

      <ProductSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        clienteId={sesionData?.clienteNegocio?._id}
        onSelectProduct={(product) => {
          setSelectedProducto(product);
          setCantidad('1');
          // Use appropriate cost field based on product type
          const cost = product.isClientProduct ? product.costo : product.costoBase;
          setCosto(String(cost || ''));
        }}
      />

      {/* Modal de Nuevo Producto */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddProductModal}
        onRequestClose={() => setShowAddProductModal(false)}
      >
        <View style={styles.addProductModalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.addProductModalWrapper}>
            <View style={styles.addProductModalContainer}>
              <View style={styles.addProductModalHeader}>
                <Text style={styles.addProductModalTitle}>Nuevo Producto</Text>
                <TouchableOpacity onPress={() => setShowAddProductModal(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.addProductModalContent} contentContainerStyle={{ paddingBottom: 20 }}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre del producto"
                    value={newProductData.nombre}
                    onChangeText={(text) => setNewProductData(prev => ({ ...prev, nombre: text }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SKU</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Código SKU"
                    value={newProductData.sku}
                    onChangeText={(text) => setNewProductData(prev => ({ ...prev, sku: text }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Código de Barras</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Código de barras"
                    value={newProductData.codigoBarras}
                    onChangeText={(text) => setNewProductData(prev => ({ ...prev, codigoBarras: text }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Costo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={newProductData.costo}
                    onChangeText={(text) => setNewProductData(prev => ({ ...prev, costo: text }))}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Categoría</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Categoría del producto"
                    value={newProductData.categoria}
                    onChangeText={(text) => setNewProductData(prev => ({ ...prev, categoria: text }))}
                  />
                </View>
              </ScrollView>
              <View style={styles.addProductModalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddProductModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateProduct}
                >
                  <Text style={styles.createButtonText}>Crear Producto</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modales Financieros */}
      <FinancialModal
        visible={showFinancialModal}
        onClose={() => {
          setShowFinancialModal(false)
          setActiveFinancialModal(null)
        }}
        onSave={handleSaveFinancial}
        modalType={activeFinancialModal}
        initialData={datosFinancieros || defaultFinancialData}
        sesionData={sesionData}
      />

      <DistribucionModal
        visible={showDistribucionModal}
        onClose={() => setShowDistribucionModal(false)}
        onSave={(data) => {
          showMessage({
            message: 'Distribución guardada exitosamente',
            type: 'success',
          })
        }}
        initialData={distribucionData}
      />

      <ContadorModal
        visible={showContadorModal}
        onClose={() => setShowContadorModal(false)}
        onSave={(data) => {
          setContadorData(data)
          showMessage({
            message: 'Datos del contador guardados',
            type: 'success',
          })
        }}
        initialData={contadorData}
      />

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        sesionData={sesionData}
        initialConfig={exportInitialConfig}
      />

      <ReportPreviewModal
        visible={showReportPreviewModal}
        onClose={() => {
          setShowReportPreviewModal(false)
          setReportType(null)
        }}
        sesionData={sesionData}
        reportType={reportType}
        onExport={handleExport}
        onPreview={handlePreview}
        onPrintPages={handlePrintPages}
      />

      <InventoryReportModal
        visible={showInventoryReportModal}
        onClose={() => setShowInventoryReportModal(false)}
        sesionData={sesionData}
        productosContados={productosContados}
        datosFinancieros={datosFinancieros || defaultFinancialData}
        contadorData={contadorData}
        user={sesionData?.contador || {}}
      />

      <ZeroCostProductsModal
        visible={showZeroCostProductsModal}
        onClose={() => setShowZeroCostProductsModal(false)}
        productos={productosConCostoCero}
        sesionId={sesionId}
        zeroCostProductsEdits={zeroCostProductsEdits}
        setZeroCostProductsEdits={setZeroCostProductsEdits}
      />

      {/* Productos Generales Modal */}
      <ProductosGeneralesModal
        visible={showProductosGeneralesModal}
        onClose={() => setShowProductosGeneralesModal(false)}
        sesionId={sesionId}
        clienteId={sesionData?.clienteNegocio?._id}
      />

      {/* Configuration Modal */}
      <ConfigurationModal
        visible={showConfigurationModal}
        onClose={() => setShowConfigurationModal(false)}
        onOpenDownloadOptions={() => setShowDownloadOptions(true)}
        onOpenConnect={() => setShowConnectModal(true)}
        onOpenSearch={() => setShowFindEditModal(true)}
      />

      {/* Menu Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showMenuModal}
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowMenuModal(false)}
        >
          <View style={styles.menuModalContainer}>
            <ScrollView>
              <Text style={styles.menuTitle}>Gestión Financiera</Text>
              {financialOptions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuItem, { backgroundColor: item.color }]}
                  onPress={() => {
                    setShowMenuModal(false);
                    openFinancialModal(item.type);
                  }}
                >
                  <Ionicons name={item.icon} size={22} color="#ffffff" />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.menuSeparator} />

              <Text style={styles.menuTitle}>Gestión de Inventario</Text>
              {inventoryOptions.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuItem, { backgroundColor: item.color }]}
                  onPress={() => {
                    setShowMenuModal(false);
                    // Usar setTimeout para asegurar que el modal se cierre antes de abrir otro
                    setTimeout(() => {
                      item.onPress();
                    }, 100);
                  }}
                >
                  <Ionicons name={item.icon} size={22} color="#ffffff" />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteConfirm}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <Text style={styles.confirmTitle}>Eliminar producto</Text>
            <Text style={styles.confirmMessage}>¿Seguro que deseas eliminar "{deleteTarget?.nombreProducto || deleteTarget?.producto?.nombre}" de la lista?</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={[styles.confirmButton, styles.cancelButton]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, styles.deleteConfirmButton]} onPress={confirmDelete}>
                <Text style={styles.deleteConfirmText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Download Options Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDownloadOptions}
        onRequestClose={() => setShowDownloadOptions(false)}
      >
        <TouchableOpacity style={styles.menuModalOverlay} activeOpacity={1} onPressOut={() => setShowDownloadOptions(false)}>
          <View style={styles.menuModalContainer}>
            <Text style={styles.menuTitle}>Descargar listado</Text>
            <TouchableOpacity style={[styles.menuItem, { backgroundColor: '#0ea5e9' }]} onPress={handleDownloadPDF}>
              <Ionicons name="document-text-outline" size={22} color="#fff" />
              <Text style={styles.menuItemText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { backgroundColor: '#22c55e' }]} onPress={handleDownloadExcel}>
              <Ionicons name="grid-outline" size={22} color="#fff" />
              <Text style={styles.menuItemText}>Excel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Connect Modal - QR de Invitación */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showConnectModal}
        onRequestClose={handleCerrarModalQR}
      >
        <LinearGradient
          colors={['#8b5cf6', '#7c3aed', '#6d28d9']}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={{ paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={handleCerrarModalQR} style={{ padding: 8 }}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>
                Conectar Colaboradores
              </Text>
              <View style={{ width: 44 }} />
            </View>
          </View>

          <Modal
            animationType="fade"
            transparent={true}
            visible={showFindEditModal}
            onRequestClose={() => setShowFindEditModal(false)}
          >
            <TouchableOpacity style={styles.menuModalOverlay} activeOpacity={1} onPressOut={() => setShowFindEditModal(false)}>
              <View style={styles.menuModalContainer}>
                <Text style={styles.menuTitle}>Buscar producto</Text>
                <View style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 }}>
                  <TextInput
                    placeholder="Buscar por nombre o código"
                    value={findTerm}
                    onChangeText={setFindTerm}
                    style={{ fontSize: 14, color: '#111827' }}
                  />
                </View>
                <ScrollView style={{ maxHeight: height * 0.5 }}>
                  {productosContados.filter(p => {
                    const q = (findTerm || '').toLowerCase()
                    if (!q) return true
                    return (p.nombreProducto || '').toLowerCase().includes(q) || (p.skuProducto || '').toLowerCase().includes(q)
                  }).map((item) => {
                    const key = typeof item.producto === 'object' ? item.producto?._id : item.producto
                    const cantidad = editDraft[key]?.cantidad ?? String(item.cantidadContada)
                    const costo = editDraft[key]?.costo ?? String(item.costoProducto)
                    return (
                      <View key={key} style={{ backgroundColor: '#0f172a', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155' }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>{item.nombreProducto}</Text>
                        <Text style={{ color: '#cbd5e1', fontSize: 12 }}>{item.skuProducto || 'Sin código'}</Text>
                        <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
                          <View style={{ flex: 1, marginRight: 6 }}>
                            <Text style={{ color: '#cbd5e1', fontSize: 12 }}>Cantidad</Text>
                            <TextInput value={String(cantidad)} onChangeText={(t) => setEditDraft(v => ({ ...v, [key]: { ...(v[key] || {}), cantidad: t } }))} keyboardType="numeric" style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 6 }}>
                            <Text style={{ color: '#cbd5e1', fontSize: 12 }}>Costo</Text>
                            <TextInput value={String(costo)} onChangeText={(t) => setEditDraft(v => ({ ...v, [key]: { ...(v[key] || {}), costo: t } }))} keyboardType="numeric" style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }} />
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => handleSaveEdit(item)} style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 10, marginTop: 10, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        </LinearGradient>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginLeft: 15,
    padding: 5,
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuModalContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 15,
    padding: 20,
    width: width * 0.85,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  menuItemText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 15,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 15,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  scanButton: {
    backgroundColor: '#22c55e',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
  },
  addButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  configButtonsContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  addFormContainer: {
    padding: 20,
    backgroundColor: '#eef2ff',
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  selectedProductTitle: {
    fontSize: 14,
    color: '#4338ca',
    marginBottom: 4,
  },
  selectedProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#312e81',
    marginBottom: 15,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1e293b',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,

  },
  financialButton: {
    backgroundColor: '#8b5cf6',
  },
  distribucionButton: {
    backgroundColor: '#22c55e',
  },
  contadorButton: {
    backgroundColor: '#f59e0b',
  },
  exportButton: {
    backgroundColor: '#06b6d4',
  },
  configButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  productsList: {
    paddingHorizontal: 20,
  },
  productoItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productoInfo: {
    flex: 1,
  },
  productoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 5,
  },
  productoSku: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  productoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productoCantidad: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  productoCosto: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  productoTotal: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 5,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    width: '100%',
  },
  scannerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginRight: 40,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 12,
  },
  scannerInstructions: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 20,
    width: '100%',
  },
  // Estilos para modales adicionales
  searchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchModalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  searchModalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  searchResultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  searchResultSku: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  searchResultPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  searchEmptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
    paddingVertical: 40,
  },
  addProductModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addProductModalWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProductModalContainer: {
    width: Math.min(width * 0.95, 720),
    maxHeight: height * 0.85,
    minHeight: Math.min(height * 0.5, 520),
    backgroundColor: '#ffffff',
    borderRadius: 15,
  },
  addProductModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  addProductModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addProductModalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addProductModalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para botón de productos con valor 0
  zeroCostButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  zeroCostButton: {
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  zeroCostButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroCostButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    marginRight: 8,
  },
  zeroCostBadge: {
    backgroundColor: '#ea580c',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  zeroCostBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Exit modal styles
  exitModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exitModalContainer: {
    width: Math.min(width * 0.95, 600),
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  exitModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exitModalTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  exitModalMessage: {
    marginTop: 12,
    fontSize: 14,
    color: '#374151',
  },
  exitModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
  },
  exitButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  exitCancel: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  exitCancelText: {
    color: '#374151',
    fontWeight: '600',
  },
  exitWithoutSave: {
    backgroundColor: '#f3f4f6',
  },
  exitWithoutSaveText: {
    color: '#374151',
    fontWeight: '600',
  },
  exitSave: {
    backgroundColor: '#10b981',
  },
  exitSaveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
})

export default InventarioDetalleScreen
