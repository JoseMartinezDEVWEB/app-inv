import NetInfo from '@react-native-community/netinfo'
import localDb from './localDb'
import api, { solicitudesConexionApi, sesionesApi } from './api'
import { showMessage } from 'react-native-flash-message'

/**
 * Servicio de Sincronización Maestro (Offline-First)
 * Centraliza toda la lógica de replicación entre SQLite y MongoDB.
 */
class SyncService {
  constructor() {
    this.isProcessing = false
    this.syncInterval = null
    this.listeners = []
  }

  start() {
    console.log('🔄 Iniciando motor de sincronización Offline-First...')
    
    // Escuchar cambios de red
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        this.syncWithCloud()
      }
    })

    // Intervalo de heartbeat (cada 1 minuto)
    this.syncInterval = setInterval(() => {
      this.syncWithCloud()
    }, 60000)
  }

  stop() {
    if (this.syncInterval) clearInterval(this.syncInterval)
  }

  /**
   * FUNCIÓN MAESTRA DE SINCRONIZACIÓN
   * 1. Verifica conexión (Ping)
   * 2. Push: Envía cambios locales (is_dirty=1) a la nube
   * 3. Pull: Descarga cambios de la nube (opcional por ahora, enfocado en backup)
   */
  async syncWithCloud() {
    if (this.isProcessing) return
    
    const state = await NetInfo.fetch()
    if (!state.isConnected) return

    this.isProcessing = true
    console.log('☁️ Iniciando ciclo de sincronización...')

    try {
      // 1. Verificar Salud del Backend (Ping)
      // Esto maneja el Cold Start implícitamente al esperar respuesta
      try {
        await api.get('/salud', { timeout: 5000 })
      } catch (e) {
        console.log('⚠️ Backend no disponible o despertando...')
        this.isProcessing = false
        return
      }

      // 2. Obtener datos sucios de SQLite
      const cambios = await localDb.obtenerRegistrosSucios()
      const tablas = Object.keys(cambios)

      if (tablas.length === 0) {
        console.log('✅ Todo sincronizado (Nada sucio localmente)')
        this.isProcessing = false
        return
      }

      console.log(`📦 Encontrados cambios en: ${tablas.join(', ')}`)

      // 3. Enviar cambios por lotes (Batch Sync)
      // Enviamos estructura: { productos: [...], sesiones: [...] }
      const payload = {
        changes: cambios,
        deviceId: 'device-id-placeholder', // Debería venir de config
        timestamp: Date.now()
      }

      // Endpoint masivo en el backend (Debe ser implementado en MongoDB)
      const response = await api.post('/sync/push', payload)

      if (response.data.success) {
        // 4. Confirmar sincronización localmente
        for (const tabla of tablas) {
            const ids = cambios[tabla].map(r => r.id_uuid);
            await localDb.confirmarSincronizacion(tabla, ids);
        }
        
        console.log('✅ Sincronización exitosa con la nube')
        this.notificarListeners({ tipo: 'sync_success', count: tablas.length })
      }

    } catch (error) {
      console.error('❌ Error crítico en syncWithCloud:', error)
      this.notificarListeners({ tipo: 'sync_error', error: error.message })
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Gestión de Colaboradores (Online Only)
   * Verifica conexión estricta antes de enviar datos de colaborador.
   */
  async enviarDatosColaborador(solicitudId, sesionId) {
    const state = await NetInfo.fetch()
    if (!state.isConnected) {
      showMessage({ message: 'Se requiere internet para enviar al administrador', type: 'warning' })
      return false
    }

    try {
      // Verificar backend
      await api.get('/salud')

      // Recopilar datos locales de esta sesión de colaborador
      // Usamos la tabla productos_contados o productos_colaborador según tu lógica actual
      // Asumiendo que el colaborador guarda en productos_colaborador temporalmente
      const productos = await localDb.obtenerProductosColaborador(solicitudId)
      
      if (productos.length === 0) return true

      // Enviar
      await solicitudesConexionApi.enviarProductos(solicitudId, sesionId, productos)
      
      // Limpiar local si éxito
      await localDb.limpiarProductosColaborador(solicitudId)
      
      showMessage({ message: 'Datos enviados al administrador', type: 'success' })
      return true

    } catch (error) {
      console.error('Error enviando datos colaborador:', error)
      showMessage({ message: 'Error enviando datos. El servidor podría estar despertando.', type: 'danger' })
      return false
    }
  }

  // --- MÉTODOS LEGACY DE SOPORTE (Para no romper UI existente) ---
  
  async agregarTarea(tipo, payload) {
    // En la nueva arquitectura, simplemente guardamos en DB local (ya hecho por la UI)
    // y disparamos syncWithCloud
    this.syncWithCloud()
    return 1
  }

  async procesarColaPendiente() {
    return this.syncWithCloud()
  }

  async sincronizarDesdeTabla(sesionId) {
    return this.syncWithCloud()
  }

  async obtenerEstadisticas() {
    return localDb.obtenerEstadisticasSincronizacion()
  }

  addListener(cb) { this.listeners.push(cb); return () => this.listeners = this.listeners.filter(l => l !== cb) }
  notificarListeners(ev) { this.listeners.forEach(cb => cb(ev)) }
}

const syncService = new SyncService()
export default syncService
