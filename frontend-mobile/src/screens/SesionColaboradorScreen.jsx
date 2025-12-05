import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BarCodeScanner } from 'expo-barcode-scanner'
import { productosApi, solicitudesConexionApi } from '../services/api'
import localDb from '../services/localDb'
import NetInfo from '@react-native-community/netinfo'
import { showMessage } from 'react-native-flash-message'
import ModalSincronizacionBLE from '../components/ModalSincronizacionBLE'
import BLEService from '../services/BLEService'

const SesionColaboradorScreen = ({ route, navigation }) => {
  const { solicitudId, sesionInventario } = route.params || {}

  const [productos, setProductos] = useState([])
  const [productosOffline, setProductosOffline] = useState([])
  const [isConnected, setIsConnected] = useState(true)
  const [hasPermission, setHasPermission] = useState(null)

  const [showScanner, setShowScanner] = useState(false)
  const [modalBuscar, setModalBuscar] = useState(false)
  const [modalManual, setModalManual] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalBLE, setModalBLE] = useState(false)

  const [barcode, setBarcode] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState([])

  const [nombreProducto, setNombreProducto] = useState('')
  const [skuProducto, setSkuProducto] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [costo, setCosto] = useState('')
  const [editandoProducto, setEditandoProducto] = useState(null)

  useEffect(() => {
    cargarProductosOffline()

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(Boolean(state.isConnected))

      if (state.isConnected) {
        showMessage({ message: '✅ Conectado - Puedes sincronizar', type: 'success' })
      } else {
        showMessage({ message: '⚠️ Sin conexión - Modo offline activado', type: 'warning' })
      }
    })

    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync()
      setHasPermission(status === 'granted')
    }
    getBarCodeScannerPermissions()

    // Cleanup al desmontar
    return () => {
      unsubscribe()
      // Limpiar recursos de BLE si estaban en uso
      if (BLEService.isInitialized && !BLEService.isDestroyed) {
        try {
          BLEService.stopScan()
        } catch (error) {
          console.warn('⚠️ Error al limpiar BLE en unmount:', error.message)
        }
      }
    }
  }, [])

  const cargarProductosOffline = async () => {
    try {
      const lista = await localDb.obtenerProductosColaborador(solicitudId)
      setProductosOffline(lista)
      setProductos(lista)
    } catch (error) {
      console.error('Error al cargar productos offline:', error)
    }
  }

  const guardarItemOffline = async (item) => {
    try {
      await localDb.guardarProductoColaborador(item, solicitudId)
      // Recargar lista para asegurar consistencia
      const lista = await localDb.obtenerProductosColaborador(solicitudId)
      setProductosOffline(lista)
      setProductos(lista)
    } catch (error) {
      console.error('Error al guardar offline:', error)
    }
  }

  const crearItemColaborador = (base) => {
    return {
      temporalId: base.temporalId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nombre: base.nombre,
      sku: base.sku || '',
      codigoBarras: base.codigoBarras || '',
      cantidad: Number(base.cantidad) || 1,
      costo: Number(base.costo) || 0,
      timestamp: base.timestamp || new Date().toISOString(),
      offline: !isConnected,
    }
  }

  const enviarProductoServidor = async (item) => {
    const payload = {
      temporalId: item.temporalId,
      nombre: item.nombre,
      sku: item.sku,
      codigoBarras: item.codigoBarras,
      cantidad: item.cantidad,
      costo: item.costo,
      timestamp: item.timestamp,
    }

    try {
      await solicitudesConexionApi.agregarProductoOffline(solicitudId, payload)
      showMessage({ message: '✅ Producto enviado al principal', type: 'success' })
      // Si se envió correctamente, asegurarnos de que no esté en local (si estaba)
      await localDb.eliminarProductoColaborador(item.temporalId)
      cargarProductosOffline()
    } catch (error) {
      console.error('Error al enviar producto:', error)
      showMessage({ message: 'Error al enviar, se guardará offline', type: 'warning' })

      // Guardar localmente si falla
      await guardarItemOffline({ ...item, offline: true })
    }
  }

  const agregarOActualizarEnListas = async (item) => {
    // Guardar siempre en local primero como respaldo
    await guardarItemOffline({ ...item, offline: !isConnected })
  }

  const handleAgregarDesdeBase = async (baseProducto, cantidadInicial = 1, costoInicial = 0) => {
    const item = crearItemColaborador({
      nombre: baseProducto.nombre,
      sku: baseProducto.sku,
      codigoBarras: baseProducto.codigoBarras || baseProducto.codigo,
      cantidad: cantidadInicial,
      costo: costoInicial || baseProducto.costo || baseProducto.costoBase || 0,
    })

    agregarOActualizarEnListas(item)

    if (isConnected) {
      await enviarProductoServidor(item)
    } else {
      showMessage({
        message: '📦 Producto guardado offline',
        description: 'Se sincronizará cuando haya conexión',
        type: 'success',
      })
    }
  }

  const handleAgregarManual = async () => {
    if (!nombreProducto || !cantidad) {
      Alert.alert('Error', 'Ingresa al menos nombre y cantidad')
      return
    }

    const item = crearItemColaborador({
      nombre: nombreProducto,
      sku: skuProducto,
      codigoBarras: barcode,
      cantidad,
      costo,
    })

    agregarOActualizarEnListas(item)

    if (isConnected) {
      await enviarProductoServidor(item)
    } else {
      showMessage({
        message: '📦 Producto guardado offline',
        description: 'Se sincronizará cuando haya conexión',
        type: 'success',
      })
    }

    setNombreProducto('')
    setSkuProducto('')
    setBarcode('')
    setCantidad('1')
    setCosto('')
    setModalManual(false)
  }

  const handleEditarGuardar = async () => {
    if (!editandoProducto) return

    const actualizado = {
      ...editandoProducto,
      cantidad: Number(cantidad) || 1,
      costo: Number(costo) || 0,
      timestamp: new Date().toISOString(),
      offline: !isConnected,
    }

    agregarOActualizarEnListas(actualizado)

    if (isConnected) {
      await enviarProductoServidor(actualizado)
    }

    setEditandoProducto(null)
    setCantidad('1')
    setCosto('')
    setModalEditar(false)
  }

  const handleEliminar = async (item) => {
    Alert.alert('Eliminar', '¿Quitar este producto de tu lista?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await localDb.eliminarProductoColaborador(item.temporalId)
          cargarProductosOffline()
        },
      },
    ])
  }

  const handleBarCodeScanned = async ({ data }) => {
    setShowScanner(false)
    try {
      const response = await productosApi.getByBarcode(data)
      const producto = response.data.datos?.producto || response.data.producto

      if (!producto) {
        Alert.alert(
          'Producto no encontrado',
          `No se encontró un producto con el código ${data}. Puedes crearlo manualmente.`,
          [
            {
              text: 'Crear Manual',
              onPress: () => {
                setBarcode(data)
                setNombreProducto('')
                setSkuProducto('')
                setCantidad('1')
                setCosto('')
                setModalManual(true)
              },
            },
            { text: 'Cerrar', style: 'cancel' },
          ]
        )
        return
      }

      await handleAgregarDesdeBase(producto, 1, producto.costoBase || producto.costo || 0)
    } catch (error) {
      console.error('Error al buscar por código de barras:', error)
      Alert.alert('Error', 'No se pudo buscar el producto por código de barras')
    }
  }

  const buscarProductos = async () => {
    if (!busqueda || busqueda.trim().length < 2) {
      setResultadosBusqueda([])
      return
    }

    try {
      const clienteId = sesionInventario?.clienteNegocio?._id
      let resultados = []

      // 1. Intentar buscar en productos del cliente (si hay clienteId)
      if (clienteId) {
        try {
          const response = await productosApi.getByClient(clienteId, { buscar: busqueda.trim(), limite: 20 })
          const lista = response.data.datos?.productos || []
          resultados.push(...lista)
        } catch (error) {
          console.warn('⚠️ No se pudo buscar en productos del cliente:', error.message)
        }
      }

      // 2. Buscar en catálogo general (accesible para todos)
      try {
        const response = await productosApi.buscarPorNombre(busqueda.trim())
        const lista = response.data.datos?.productos || []

        // Agregar productos generales que no estén ya en resultados
        lista.forEach(prod => {
          if (!resultados.find(r => r._id === prod._id)) {
            resultados.push(prod)
          }
        })
      } catch (error) {
        console.warn('⚠️ No se pudo buscar en catálogo general:', error.message)
      }

      setResultadosBusqueda(resultados.slice(0, 20)) // Limitar a 20 resultados

      if (resultados.length === 0) {
        showMessage({
          message: 'Sin resultados',
          description: 'No se encontraron productos con ese nombre',
          type: 'info'
        })
      }
    } catch (error) {
      console.error('Error al buscar productos:', error)
      Alert.alert('Error', 'No se pudo realizar la búsqueda')
    }
  }

  const sincronizarProductos = async () => {
    if (productosOffline.length === 0) {
      Alert.alert('Sin productos', 'No hay productos pendientes de sincronización')
      return
    }

    Alert.alert(
      'Sincronizar Productos',
      `${productosOffline.length} producto(s) pendiente(s)\n\n¿Cómo quieres sincronizar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '📡 Bluetooth',
          onPress: () => setModalBLE(true),
        },
        {
          text: '🌐 Internet',
          onPress: () => sincronizarViaInternet(),
          style: isConnected ? 'default' : 'destructive',
        },
      ]
    )
  }

  const sincronizarViaInternet = async () => {
    if (!isConnected) {
      Alert.alert('Sin conexión', 'Necesitas conexión a internet para esta opción')
      return
    }

    try {
      for (const item of productosOffline) {
        await enviarProductoServidor(item)
      }

      // La función enviarProductoServidor ya se encarga de limpiar si es exitoso
      // Pero podemos forzar una recarga final
      await cargarProductosOffline()

      showMessage({
        message: '✅ Sincronización completada',
        type: 'success',
      })
    } catch (error) {
      console.error('Error al sincronizar:', error)
      Alert.alert('Error', 'No se pudieron sincronizar todos los productos')
    }
  }

  const handleBLESuccess = async () => {
    await localDb.limpiarProductosColaborador(solicitudId)
    cargarProductosOffline()
    setModalBLE(false)
  }

  const handleSalir = () => {
    if (productosOffline.length > 0) {
      Alert.alert(
        'Productos sin sincronizar',
        `Tienes ${productosOffline.length} producto(s) sin sincronizar. Si sales, se mantendrán guardados localmente.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => navigation.navigate('Login') },
        ]
      )
    } else {
      navigation.navigate('Login')
    }
  }

  const renderProductoItem = ({ item }) => {
    const total = (Number(item.cantidad) || 0) * (Number(item.costo) || 0)

    return (
      <View style={styles.productoCard}>
        <View style={styles.productoInfo}>
          <Text style={styles.productoNombre}>{item.nombre}</Text>
          <Text style={styles.productoSku}>
            SKU: {item.sku || 'Sin SKU'}{item.codigoBarras ? `  ·  CB: ${item.codigoBarras}` : ''}
          </Text>
          <View style={styles.productoStats}>
            <Text style={styles.productoCantidad}>Cant: {item.cantidad}</Text>
            <Text style={styles.productoCosto}>${(Number(item.costo) || 0).toFixed(2)}</Text>
            <Text style={styles.productoTotal}>Total: ${total.toFixed(2)}</Text>
          </View>
          <Text style={styles.productoTimestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
        </View>
        <View style={styles.productoActions}>
          {item.offline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="cloud-offline" size={14} color="#f59e0b" />
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          )}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setEditandoProducto(item)
                setCantidad(String(item.cantidad))
                setCosto(String(item.costo))
                setModalEditar(true)
              }}
            >
              <Ionicons name="create-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => handleEliminar(item)}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const totalProductos = productos.length
  const totalConteo = productos.reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0)
  const totalValor = productos.reduce(
    (sum, p) => sum + (Number(p.cantidad) || 0) * (Number(p.costo) || 0),
    0
  )

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Solicitando permisos de cámara...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1d4ed8', '#3b82f6']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleSalir}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.sesionLabel}>Sesión</Text>
            <Text style={styles.sesionNumero}>{sesionInventario?.nombre || 'INV-COLABORADOR'}</Text>
            <Text style={styles.sesionSubtitulo}>Colaborador</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.estadoPill}>
              <View
                style={[styles.estadoDot, { backgroundColor: isConnected ? '#22c55e' : '#f59e0b' }]}
              />
              <Text style={styles.estadoText}>{isConnected ? 'En línea' : 'Offline'}</Text>
            </View>
            {productosOffline.length > 0 && (
              <TouchableOpacity style={styles.syncPill} onPress={sincronizarProductos}>
                <Ionicons name="sync" size={16} color="#fff" />
                <Text style={styles.syncPillText}>{productosOffline.length}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#22c55e' }]}
          onPress={() => setShowScanner(true)}
        >
          <Ionicons name="scan-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Escanear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#0ea5e9' }]}
          onPress={() => {
            setBusqueda('')
            setResultadosBusqueda([])
            setModalBuscar(true)
          }}
        >
          <Ionicons name="search-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Buscar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
          onPress={() => {
            setNombreProducto('')
            setSkuProducto('')
            setBarcode('')
            setCantidad('1')
            setCosto('')
            setModalManual(true)
          }}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Productos</Text>
          <Text style={styles.summaryValue}>{totalProductos}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Cant.</Text>
          <Text style={styles.summaryValue}>{totalConteo}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Valor Total</Text>
          <Text style={styles.summaryValue}>${totalValor.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <FlatList
          data={productos}
          keyExtractor={(item) => item.temporalId}
          renderItem={renderProductoItem}
          contentContainerStyle={
            productos.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>Sin productos en tu lista</Text>
              <Text style={styles.emptySubtext}>
                Usa los botones de arriba para escanear o buscar productos
              </Text>
            </View>
          }
        />
      </View>

      {/* Modal Escáner */}
      {showScanner && hasPermission && (
        <Modal visible={showScanner} animationType="slide">
          <View style={styles.scannerContainer}>
            <BarCodeScanner
              onBarCodeScanned={handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scannerOverlay}>
              <TouchableOpacity
                style={styles.scannerClose}
                onPress={() => setShowScanner(false)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal Buscar */}
      <Modal visible={modalBuscar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Buscar Producto</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre o código"
              value={busqueda}
              onChangeText={setBusqueda}
              onSubmitEditing={buscarProductos}
            />
            <TouchableOpacity style={styles.buscarButton} onPress={buscarProductos}>
              <Ionicons name="search-outline" size={18} color="#fff" />
              <Text style={styles.buscarButtonText}>Buscar</Text>
            </TouchableOpacity>

            <FlatList
              data={resultadosBusqueda}
              keyExtractor={(item) => item._id}
              style={{ marginTop: 12, maxHeight: 260 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={async () => {
                    await handleAgregarDesdeBase(item, 1, item.costo || item.costoBase || 0)
                    setModalBuscar(false)
                  }}
                >
                  <Text style={styles.resultNombre}>{item.nombre}</Text>
                  <Text style={styles.resultSku}>
                    SKU: {item.sku || 'Sin SKU'} · CB:{' '}
                    {item.codigoBarras || item.codigo || 'N/A'}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ paddingVertical: 12 }}>
                  <Text style={{ textAlign: 'center', color: '#94a3b8' }}>
                    Escribe al menos 2 caracteres y presiona Buscar
                  </Text>
                </View>
              }
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalBuscar(false)}
              >
                <Text style={styles.cancelButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Manual */}
      <Modal visible={modalManual} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Manual</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del producto"
              value={nombreProducto}
              onChangeText={setNombreProducto}
            />
            <TextInput
              style={styles.input}
              placeholder="SKU (opcional)"
              value={skuProducto}
              onChangeText={setSkuProducto}
            />
            <TextInput
              style={styles.input}
              placeholder="Código de barras (opcional)"
              value={barcode}
              onChangeText={setBarcode}
            />
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Costo por unidad (opcional)"
              value={costo}
              onChangeText={setCosto}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalManual(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAgregarManual}
              >
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Editar */}
      <Modal visible={modalEditar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Producto</Text>
            <Text style={{ marginBottom: 8, color: '#475569' }}>{editandoProducto?.nombre}</Text>
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Costo por unidad"
              value={costo}
              onChangeText={setCosto}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalEditar(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleEditarGuardar}
              >
                <Text style={styles.addButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Sincronización BLE */}
      <ModalSincronizacionBLE
        visible={modalBLE}
        onClose={() => setModalBLE(false)}
        productos={productosOffline}
        onSuccess={handleBLESuccess}
        mode="send"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  sesionLabel: {
    color: '#bfdbfe',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  sesionNumero: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sesionSubtitulo: {
    color: '#e0f2fe',
    fontSize: 12,
  },
  estadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  estadoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  estadoText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.85)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  syncPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    marginHorizontal: 4,
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  productoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productoInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productoNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  productoSku: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  productoStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  productoCantidad: {
    fontSize: 12,
    color: '#0f766e',
    fontWeight: '600',
  },
  productoCosto: {
    fontSize: 12,
    color: '#4b5563',
  },
  productoTotal: {
    fontSize: 12,
    color: '#7c2d12',
    fontWeight: '700',
  },
  productoTimestamp: {
    fontSize: 11,
    color: '#9ca3af',
  },
  productoActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  offlineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 16,
  },
  scannerClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 430,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 10,
  },
  buscarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  buscarButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  resultSku: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#3b82f6',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})

export default SesionColaboradorScreen
