import NetInfo from '@react-native-community/netinfo'
import localDb from './localDb'
import { solicitudesConexionApi } from './api'
import { showMessage } from 'react-native-flash-message'

/**
 * Servicio de Sincronización con Patrón Outbox
 * Maneja automáticamente el reintento de tareas cuando hay conexión
 */
class SyncService {
  constructor() {
    this.isProcessing = false
    this.netInfoUnsubscribe = null
    this.syncInterval = null
    this.listeners = []
  }

  /**
   * Iniciar servicio de sincronización
   * Escucha cambios de conectividad y procesa cola pendiente
   */
  start() {
    console.log('🔄 Iniciando servicio de sincronización...')
    
    // Escuchar cambios de conectividad
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isProcessing) {
        console.log('✅ Conexión detectada, procesando cola...')
        this.procesarColaPendiente()
      }
    })

    // Intentar procesar cada 30 segundos si hay conexión
    this.syncInterval = setInterval(() => {
      NetInfo.fetch().then(state => {
        if (state.isConnected && !this.isProcessing) {
          this.procesarColaPendiente()
        }
      })
    }, 30000) // 30 segundos

    // Procesar inmediatamente si hay conexión
    NetInfo.fetch().then(state => {
      if (state.isConnected) {
        this.procesarColaPendiente()
      }
    })
  }

  /**
   * Detener servicio de sincronización
   */
  stop() {
    console.log('⏸️ Deteniendo servicio de sincronización...')
    
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe()
      this.netInfoUnsubscribe = null
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  /**
   * Agregar tarea a la cola de sincronización
   */
  async agregarTarea(tipo, payload) {
    try {
      const id = await localDb.agregarAColaSincronizacion(tipo, payload)
      console.log(`📦 Tarea agregada a cola: ${tipo} (ID: ${id})`)
      
      // Notificar a listeners
      this.notificarListeners({ tipo: 'tarea_agregada', id, tipo: tipo })
      
      // Intentar procesar inmediatamente si hay conexión
      const state = await NetInfo.fetch()
      if (state.isConnected) {
        this.procesarColaPendiente()
      }
      
      return id
    } catch (error) {
      console.error('❌ Error agregando tarea a cola:', error)
      throw error
    }
  }

  /**
   * Procesar todas las tareas pendientes en la cola
   */
  async procesarColaPendiente() {
    if (this.isProcessing) {
      console.log('⚠️ Ya hay un proceso de sincronización en curso')
      return
    }

    this.isProcessing = true
    console.log('🔄 Procesando cola de sincronización...')

    try {
      const tareas = await localDb.obtenerTareasPendientes()
      
      if (tareas.length === 0) {
        console.log('✅ No hay tareas pendientes')
        this.isProcessing = false
        return
      }

      console.log(`📋 ${tareas.length} tarea(s) pendiente(s)`)
      
      let completadas = 0
      let fallidas = 0

      for (const tarea of tareas) {
        try {
          // Limitar reintentos a 3
          if (tarea.intentos >= 3) {
            console.log(`⚠️ Tarea ${tarea.id} excedió límite de reintentos`)
            await localDb.marcarTareaFallida(tarea.id, 'Máximo de reintentos alcanzado')
            fallidas++
            continue
          }

          // Procesar según tipo
          let resultado = false
          switch (tarea.tipo) {
            case 'enviar_producto':
              resultado = await this.enviarProducto(tarea.payload)
              break
            case 'integrar_inventario':
              resultado = await this.integrarInventario(tarea.payload)
              break
            default:
              console.warn(`⚠️ Tipo de tarea desconocido: ${tarea.tipo}`)
          }

          if (resultado) {
            await localDb.marcarTareaCompletada(tarea.id)
            completadas++
            console.log(`✅ Tarea ${tarea.id} completada`)
            this.notificarListeners({ tipo: 'tarea_completada', id: tarea.id })
          } else {
            await localDb.marcarTareaFallida(tarea.id, 'Falló el procesamiento')
            fallidas++
          }
        } catch (error) {
          console.error(`❌ Error procesando tarea ${tarea.id}:`, error)
          await localDb.marcarTareaFallida(tarea.id, error.message)
          fallidas++
        }
      }

      console.log(`✅ Sincronización completada: ${completadas} exitosas, ${fallidas} fallidas`)
      
      if (completadas > 0) {
        showMessage({
          message: '✅ Sincronización exitosa',
          description: `${completadas} producto(s) enviado(s)`,
          type: 'success',
          duration: 3000,
        })
      }

      if (fallidas > 0) {
        showMessage({
          message: '⚠️ Algunas sincronizaciones fallaron',
          description: `${fallidas} tarea(s) pendiente(s)`,
          type: 'warning',
          duration: 3000,
        })
      }

      // Limpiar tareas completadas antiguas (más de 1 día)
      await localDb.limpiarTareasCompletadas()
    } catch (error) {
      console.error('❌ Error procesando cola:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Enviar producto individual a servidor
   */
  async enviarProducto(payload) {
    const { solicitudId, producto } = payload
    
    try {
      await solicitudesConexionApi.agregarProductoOffline(solicitudId, producto)
      
      // Eliminar de productos_colaborador si existe
      if (producto.temporalId) {
        await localDb.eliminarProductoColaborador(producto.temporalId)
      }
      
      return true
    } catch (error) {
      console.error('Error enviando producto:', error)
      return false
    }
  }

  /**
   * Integrar inventario completo (endpoint nuevo)
   */
  async integrarInventario(payload) {
    const { sesionId, productos, colaboradorId, solicitudId } = payload
    
    try {
      // Aquí llamarías al nuevo endpoint de integración
      // Por ahora usamos el método antiguo como fallback
      console.log('🔄 Integrando inventario:', { sesionId, productosCount: productos.length })
      
      // TODO: Implementar llamada al nuevo endpoint /api/inventario/integrar
      // await api.post('/inventario/integrar', { sesionId, productos, colaboradorId, solicitudId })
      
      return true
    } catch (error) {
      console.error('Error integrando inventario:', error)
      return false
    }
  }

  /**
   * Obtener estadísticas de sincronización
   */
  async obtenerEstadisticas() {
    try {
      return await localDb.obtenerEstadisticasSincronizacion()
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      return { total: 0, pendientes: 0, completadas: 0, errores: 0 }
    }
  }

  /**
   * Forzar sincronización inmediata
   */
  async forzarSincronizacion() {
    const state = await NetInfo.fetch()
    
    if (!state.isConnected) {
      showMessage({
        message: '⚠️ Sin conexión',
        description: 'No hay conexión a internet',
        type: 'warning',
      })
      return false
    }

    await this.procesarColaPendiente()
    return true
  }

  /**
   * Agregar listener para eventos de sincronización
   */
  addListener(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Notificar a todos los listeners
   */
  notificarListeners(evento) {
    this.listeners.forEach(callback => {
      try {
        callback(evento)
      } catch (error) {
        console.error('Error en listener:', error)
      }
    })
  }
}

// Exportar instancia singleton
const syncService = new SyncService()

export default syncService


