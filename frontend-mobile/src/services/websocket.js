import { io } from 'socket.io-client'
import { showMessage } from 'react-native-flash-message'
import { config } from '../config/env'

// Usar la configuración centralizada
const BACKEND_URL = config.wsUrl

class WebSocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.baseReconnectDelay = 1000 // 1 segundo
    this.maxReconnectDelay = 30000 // 30 segundos
    this.listeners = new Map()
    this.currentToken = null
    this.lastErrorMessage = null
    this.isConnecting = false
    this.reconnectTimeout = null
    this.lastConnectionTime = null
    this.shouldShowMessages = true
  }

  // Conectar al servidor WebSocket
  connect(token) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      console.warn('[WebSocket] Token inexistente; se omite la conexión.')
      return null
    }

    const sanitizedToken = token.trim()

    // Si ya está conectado con el mismo token, no hacer nada
    if (this.socket && this.isConnected && this.currentToken === sanitizedToken) {
      console.log('✓ WebSocket ya está conectado')
      return this.socket
    }

    // Si ya está intentando conectar, esperar
    if (this.isConnecting) {
      console.log('⏳ Ya hay una conexión en proceso...')
      return this.socket
    }

    this.currentToken = sanitizedToken
    this.isConnecting = true

    console.log(`🔌 Conectando WebSocket: ${BACKEND_URL}`)
    
    // Desconectar socket anterior si existe
    if (this.socket) {
      this.disconnect(false)
    }

    this.socket = io(BACKEND_URL, {
      auth: {
        token: sanitizedToken,
        clientType: 'mobile',
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // Manejamos reconexión manualmente
      timeout: 20000,
      forceNew: true,
    })

    this.setupEventListeners()
    return this.socket
  }

  // Configurar listeners de eventos
  setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado')
      this.isConnected = true
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.lastConnectionTime = Date.now()
      
      // Solo mostrar mensaje si es la primera conexión o después de desconexión prolongada
      if (this.shouldShowMessages) {
        showMessage({
          message: '✓ Conectado',
          type: 'success',
          duration: 2000,
          hideOnPress: true,
        })
      }
      
      // Emitir evento local
      this.emitLocal('connected', { socketId: this.socket.id })
    })

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ WebSocket desconectado: ${reason}`)
      this.isConnected = false
      this.isConnecting = false
      this.emitLocal('disconnected', { reason })
      
      // Solo reconectar si no fue desconexión manual
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ Error de conexión WebSocket:', error.message || error)
      this.isConnected = false
      this.isConnecting = false
      const message = this.extractErrorMessage(error)
      this.lastErrorMessage = message

      // Si es error de autenticación, no reintentar
      if (this.isAuthError(message)) {
        console.error('❌ Error de autenticación, no se reintentará')
        this.emitLocal('auth_error', { message: message || 'Token inválido o expirado' })
        this.disconnect(false)
        return
      }

      // Programar reconexión con backoff exponencial
      this.scheduleReconnect()
    })

    this.socket.on('error', (error) => {
      console.error('❌ Error WebSocket:', error.message || error)
      // No mostrar toast para errores menores
    })

    // Eventos específicos de la aplicación
    this.socket.on('sesion_actualizada', (data) => {
      console.log('📊 Sesión actualizada:', data?.sesionId || 'N/A')
      this.emitLocal('sesion_actualizada', data)
    })

    this.socket.on('producto_agregado', (data) => {
      console.log('📦 Producto agregado:', data?.producto?.nombre || 'N/A')
      this.emitLocal('producto_agregado', data)
    })

    this.socket.on('producto_removido', (data) => {
      console.log('🗑️ Producto removido:', data?.producto?.nombre || 'N/A')
      this.emitLocal('producto_removido', data)
    })

    this.socket.on('sesion_completada', (data) => {
      console.log('✅ Sesión completada:', data?.sesion?.numeroSesion || 'N/A')
      showMessage({
        message: 'Sesión completada',
        description: data?.sesion?.numeroSesion,
        type: 'success',
      })
      this.emitLocal('sesion_completada', data)
    })

    this.socket.on('usuario_conectado', (data) => {
      console.log('👤 Usuario conectado:', data?.usuario?.nombre || 'N/A')
      this.emitLocal('usuario_conectado', data)
    })

    this.socket.on('usuario_desconectado', (data) => {
      console.log('👤 Usuario desconectado:', data?.usuario?.nombre || 'N/A')
      this.emitLocal('usuario_desconectado', data)
    })

    this.socket.on('colaborador_conectado', (data) => {
      console.log('👥 Colaborador conectado')
      showMessage({
        message: '¡Colaborador conectado!',
        description: 'Un nuevo dispositivo se unió',
        type: 'success',
        duration: 3000,
      })
      this.emitLocal('colaborador_conectado', data)
    })

    this.socket.on('colaborador_desconectado', (data) => {
      console.log('👥 Colaborador desconectado')
      this.emitLocal('colaborador_desconectado', data)
    })
  }

  // Programar reconexión con backoff exponencial
  scheduleReconnect() {
    // Limpiar timeout anterior si existe
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    // Si se alcanzó el máximo de intentos, no reconectar
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Máximo de intentos de reconexión alcanzado (${this.maxReconnectAttempts})`)
      this.shouldShowMessages = true
      showMessage({
        message: 'Sin conexión en tiempo real',
        description: 'No se pudo conectar al servidor',
        type: 'warning',
        duration: 3000,
      })
      return
    }

    this.reconnectAttempts++
    
    // Calcular delay con backoff exponencial
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    )

    console.log(`🔄 Reintento ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay}ms`)

    this.reconnectTimeout = setTimeout(() => {
      if (this.currentToken && !this.isConnected && !this.isConnecting) {
        this.shouldShowMessages = false // No mostrar mensajes en reconexiones automáticas
        this.connect(this.currentToken)
      }
    }, delay)
  }

  // Resetear intentos de reconexión (útil cuando el usuario vuelve a la app)
  resetReconnectAttempts() {
    this.reconnectAttempts = 0
    this.shouldShowMessages = true
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  // Unirse a una sala (sesión de inventario)
  joinSession(sessionId) {
    if (!sessionId) {
      console.warn('⚠️ sessionId es requerido para unirse a una sesión')
      return
    }

    if (this.socket && this.isConnected) {
      this.socket.emit('join_session', { sessionId })
      console.log(`📊 Unido a sesión: ${sessionId}`)
    } else {
      console.warn('⚠️ WebSocket no está conectado, no se puede unir a la sesión')
    }
  }

  // Salir de una sala
  leaveSession(sessionId) {
    if (!sessionId) return

    if (this.socket && this.isConnected) {
      this.socket.emit('leave_session', { sessionId })
      console.log(`📊 Salió de sesión: ${sessionId}`)
    }
  }

  // Emitir evento por Socket.IO
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      console.warn(`⚠️ WebSocket no está conectado, no se puede emitir: ${event}`)
    }
  }

  // Suscribirse a eventos locales
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
    
    // Retornar función para desuscribirse
    return () => this.off(event, callback)
  }

  // Desuscribirse de eventos locales
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  // Emitir evento a listeners locales
  emitLocal(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`❌ Error en listener de ${event}:`, error)
        }
      })
    }
  }

  // Desconectar
  disconnect(clearListeners = false) {
    console.log('🔌 Desconectando WebSocket...')
    
    // Limpiar timeout de reconexión
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }

    this.isConnected = false
    this.isConnecting = false
    this.currentToken = null
    this.reconnectAttempts = 0
    
    if (clearListeners) {
      this.listeners.clear()
    }
  }

  // Obtener estado de conexión
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id || null,
      url: BACKEND_URL,
      lastError: this.lastErrorMessage,
      lastConnectionTime: this.lastConnectionTime,
    }
  }

  // Extraer mensaje de error
  extractErrorMessage(error) {
    if (!error) return ''
    if (typeof error === 'string') return error
    if (error.message) return error.message
    if (error.data?.message) return error.data.message
    return 'Error desconocido'
  }

  // Verificar si es error de autenticación
  isAuthError(message) {
    if (!message) return false
    const normalized = message.toLowerCase()
    return (
      normalized.includes('token') ||
      normalized.includes('autenticación') ||
      normalized.includes('autenticacion') ||
      normalized.includes('auth') ||
      normalized.includes('invalid') ||
      normalized.includes('inválido') ||
      normalized.includes('expired') ||
      normalized.includes('expirado') ||
      normalized.includes('unauthorized')
    )
  }
}

// Crear instancia singleton
const webSocketService = new WebSocketService()

export default webSocketService
