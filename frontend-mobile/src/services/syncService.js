import NetInfo from '@react-native-community/netinfo'
import localDb from './localDb'
import api from './api'
import { showMessage } from 'react-native-flash-message'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Servicio de Sincronización Maestro (Offline-First)
 * Gestiona sincronización bidireccional entre SQLite local y el servidor
 * 
 * Arquitectura:
 * 1. Todas las operaciones se guardan primero en SQLite local (is_dirty = 1)
 * 2. La UI se actualiza inmediatamente (Optimistic UI)
 * 3. En segundo plano, el servicio envía los cambios al servidor
 * 4. Al recuperar conexión, se procesan todos los pendientes
 * 5. Periódicamente se descargan cambios de otros colaboradores
 */
class SyncService {
  constructor() {
    this.isProcessing = false
    this.isPulling = false
    this.syncInterval = null
    this.pullInterval = null
    this.listeners = []
    this.deviceId = null
    this.lastSyncTimestamp = 0
    this.businessId = null
    this.last401Timestamp = 0 // Timestamp del último error 401
    this.authCooldown = 60000 // 1 minuto de cooldown después de un 401
  }

  /**
   * Inicializar el servicio de sincronización
   */
  async initialize(userId, businessId) {
    console.group('🔄 SyncService: Inicializando')
    
    this.businessId = businessId
    
    // Generar o recuperar deviceId único
    let deviceId = await AsyncStorage.getItem('sync_device_id')
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await AsyncStorage.setItem('sync_device_id', deviceId)
    }
    this.deviceId = deviceId
    
    // Recuperar último timestamp de sincronización
    const lastSync = await AsyncStorage.getItem('last_sync_timestamp')
    this.lastSyncTimestamp = lastSync ? parseInt(lastSync) : 0
    
    console.groupEnd()
  }

  /**
   * Iniciar el motor de sincronización
   */
  start() {
    // Escuchar cambios de red
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        this.syncWithCloud()
      }
    })

    // Intervalo de push (cada 30 segundos)
    this.syncInterval = setInterval(() => {
      this.syncWithCloud()
    }, 30000)

    // Intervalo de pull (cada 2 minutos)
    this.pullInterval = setInterval(() => {
      this.pullUpdates()
    }, 120000)

    // Sincronización inicial
    setTimeout(() => this.syncWithCloud(), 2000)
  }

  /**
   * Detener el motor de sincronización
   */
  stop() {
    if (this.syncInterval) clearInterval(this.syncInterval)
    if (this.pullInterval) clearInterval(this.pullInterval)
    if (this.unsubscribeNetInfo) this.unsubscribeNetInfo()
  }

  /**
   * PUSH: Enviar cambios locales al servidor
   */
  async syncWithCloud() {
    if (this.isProcessing) {
      return
    }
    
    const state = await NetInfo.fetch()
    if (!state.isConnected) {
      return
    }

    // Verificar cooldown después de error 401
    const now = Date.now()
    if (this.last401Timestamp > 0 && (now - this.last401Timestamp) < this.authCooldown) {
      return
    }

    this.isProcessing = true

    try {
      // 1. Verificar salud del backend (silencioso)
      try {
        await api.get('/salud', { timeout: 5000 })
      } catch (e) {
        this.isProcessing = false
        return
      }

      // 2. Obtener registros sucios de SQLite
      const cambios = await localDb.obtenerRegistrosSucios()
      const tablas = Object.keys(cambios)

      if (tablas.length === 0) {
        this.isProcessing = false
        return
      }

      // Contar total de cambios
      let totalCambios = 0
      for (const tabla of tablas) {
        totalCambios += cambios[tabla].length
      }

      // 3. Enviar cambios por lotes (Batch Sync)
      const payload = {
        changes: cambios,
        deviceId: this.deviceId,
        timestamp: Date.now()
      }

      let response
      try {
        response = await api.post('/sync/batch', payload)
        // Si llegamos aquí, resetear el cooldown de 401
        this.last401Timestamp = 0
      } catch (error) {
        // Manejar error 401 (no autenticado) - activar cooldown
        if (error.response?.status === 401) {
          this.last401Timestamp = Date.now()
          this.isProcessing = false
          return
        }
        // Para otros errores, re-lanzar
        throw error
      }

      if (response.data.exito) {
        // 4. Confirmar sincronización localmente
        for (const tabla of tablas) {
          const ids = cambios[tabla].map(r => r.id_uuid || r.uuid)
          await localDb.confirmarSincronizacion(tabla, ids)
        }
        
        // Guardar timestamp de sincronización
        this.lastSyncTimestamp = response.data.datos.serverTimestamp || Date.now()
        await AsyncStorage.setItem('last_sync_timestamp', this.lastSyncTimestamp.toString())
        
        this.notificarListeners({ 
          tipo: 'sync_success', 
          direction: 'push',
          count: totalCambios,
          processed: response.data.datos.processed
        })
      }

    } catch (error) {
      // Manejar errores silenciosamente
      if (error.response?.status === 401) {
        this.last401Timestamp = Date.now()
      } else if (error.response?.status !== 401 && error.response?.status >= 500) {
        // Solo loggear errores críticos del servidor (500+)
        console.error('❌ Error crítico en sincronización:', error.message)
      }
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * PULL: Descargar cambios del servidor realizados por otros colaboradores
   */
  async pullUpdates() {
    if (this.isPulling) {
      return // Silencioso - ya está en progreso
    }

    const state = await NetInfo.fetch()
    if (!state.isConnected) {
      return // Silencioso - pausar cuando está offline
    }

    // Verificar cooldown después de error 401
    const now = Date.now()
    if (this.last401Timestamp > 0 && (now - this.last401Timestamp) < this.authCooldown) {
      return // Silencioso - pausar después de 401
    }

    this.isPulling = true

    try {
      const response = await api.get('/sync/pull', {
        params: {
          lastSync: this.lastSyncTimestamp,
          tables: 'clientes,productos,sesiones'
        }
      })

      if (response.data.exito) {
        const { updates, serverTimestamp } = response.data.datos
        let totalUpdates = 0

        // Aplicar actualizaciones de clientes
        if (updates.clientes && updates.clientes.length > 0) {
          await localDb.sincronizarClientesDesdeServidor(updates.clientes)
          totalUpdates += updates.clientes.length
        }

        // Aplicar actualizaciones de productos
        if (updates.productos && updates.productos.length > 0) {
          await localDb.guardarProductos(updates.productos)
          totalUpdates += updates.productos.length
        }

        // Aplicar actualizaciones de sesiones
        if (updates.sesiones && updates.sesiones.length > 0) {
          await localDb.guardarSesiones(updates.sesiones)
          totalUpdates += updates.sesiones.length
        }

        // Actualizar timestamp
        this.lastSyncTimestamp = serverTimestamp
        await AsyncStorage.setItem('last_sync_timestamp', serverTimestamp.toString())

        // Resetear cooldown de 401 si la operación fue exitosa
        this.last401Timestamp = 0

        if (totalUpdates > 0) {
          this.notificarListeners({
            tipo: 'sync_success',
            direction: 'pull',
            count: totalUpdates
          })
        }
      }

    } catch (error) {
      // Manejar error 401 silenciosamente
      if (error.response?.status === 401) {
        this.last401Timestamp = Date.now()
        // Silencioso - pausar PULL cuando hay error de autenticación
      }
      // No loggear otros errores de pull para no saturar la consola
    } finally {
      this.isPulling = false
    }
  }

  /**
   * Forzar sincronización completa (push + pull)
   */
  async forceFullSync() {
    console.group('🔄 SyncService: Sincronización manual')
    await this.syncWithCloud()
    await this.pullUpdates()
    console.groupEnd()
  }

  /**
   * Alias en español para forceFullSync
   */
  async forzarSincronizacion() {
    return this.forceFullSync()
  }

  /**
   * Agregar operación a la cola de sincronización (Método Legacy)
   * En la nueva arquitectura, los datos se guardan directamente en las tablas
   * con is_dirty = 1 y se sincronizan automáticamente
   */
  async agregarTarea(tipo, payload) {
    await localDb.agregarAColaSincronizacion(tipo, payload)
    // Disparar sincronización
    this.syncWithCloud()
    return 1
  }

  /**
   * Procesar cola pendiente (Método Legacy)
   */
  async procesarColaPendiente() {
    return this.syncWithCloud()
  }

  /**
   * Sincronizar desde tabla específica (Método Legacy)
   */
  async sincronizarDesdeTabla(sesionId) {
    return this.syncWithCloud()
  }

  /**
   * Obtener estadísticas de sincronización
   */
  async obtenerEstadisticas() {
    const stats = await localDb.obtenerEstadisticasSincronizacion()
    return {
      ...stats,
      lastSync: this.lastSyncTimestamp,
      lastSyncFormatted: this.lastSyncTimestamp > 0 
        ? new Date(this.lastSyncTimestamp).toLocaleString() 
        : 'Nunca',
      deviceId: this.deviceId,
      businessId: this.businessId
    }
  }

  /**
   * Obtener estado de sincronización de un registro específico
   */
  async getRecordSyncStatus(tabla, id) {
    return localDb.obtenerEstadoSincronizacion(tabla, id)
  }

  /**
   * Enviar datos de colaborador al administrador (requiere conexión)
   */
  async enviarDatosColaborador(solicitudId, sesionId) {
    const state = await NetInfo.fetch()
    if (!state.isConnected) {
      showMessage({ 
        message: 'Se requiere internet para enviar al administrador', 
        type: 'warning' 
      })
      return false
    }

    try {
      await api.get('/salud')

      const productos = await localDb.obtenerProductosColaborador(solicitudId)
      
      if (productos.length === 0) return true

      await api.post(`/solicitudes-conexion/${solicitudId}/productos`, {
        sesionId,
        productos
      })
      
      await localDb.limpiarProductosColaborador(solicitudId)
      
      showMessage({ message: 'Datos enviados al administrador', type: 'success' })
      return true

    } catch (error) {
      console.error('Error enviando datos colaborador:', error)
      showMessage({ 
        message: 'Error enviando datos. El servidor podría estar despertando.', 
        type: 'danger' 
      })
      return false
    }
  }

  // ========== GESTIÓN DE LISTENERS ==========
  
  addListener(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  notificarListeners(evento) {
    this.listeners.forEach(callback => {
      try {
        callback(evento)
      } catch (e) {
        console.error('Error en listener de sync:', e)
      }
    })
  }
}

// Exportar instancia singleton
const syncService = new SyncService()
export default syncService
