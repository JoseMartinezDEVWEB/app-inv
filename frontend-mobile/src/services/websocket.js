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
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 5000
    this.listeners = new Map()
    this.currentToken = null
    this.lastErrorMessage = null
  }

  // Conectar al servidor WebSocket
  connect(token) {
    if (!token || typeof token !== 'string' || !token.trim()) {
      console.warn('[WebSocket-Mobile] Token inexistente; se omite la conexión.')
      return null
    }

    const sanitizedToken = token.trim()

    if (this.socket && this.isConnected && this.currentToken === sanitizedToken) {
      console.log('✓ WebSocket ya está conectado')
      return this.socket
    }

    this.currentToken = sanitizedToken

    console.log(`🔌 Intentando conectar a: ${BACKEND_URL}`)
    
    if (this.socket) {
      this.disconnect()
    }

    this.socket = io(BACKEND_URL, {
      auth: {
        token: sanitizedToken,
        clientType: 'mobile',
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
      forceNew: false,
    })

    this.setupEventListeners()
    return this.socket
  }

  // Configurar listeners de eventos
  setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor WebSocket')
      this.isConnected = true
      this.reconnectAttempts = 0
      showMessage({
        message: 'Conectado en tiempo real',
        type: 'success',
      })
      // Emitir evento local
      this.emitLocal('connected', { socketId: this.socket.id })
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor WebSocket:', reason)
      this.isConnected = false
      this.emitLocal('disconnected', { reason })
      
      if (reason === 'io server disconnect') {
        // El servidor desconectó, intentar reconectar
        this.handleReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('⚠️ Error de conexión WebSocket:', error)
      this.isConnected = false
      const message = this.extractErrorMessage(error)
      this.lastErrorMessage = message

      if (this.isAuthError(message)) {
        showMessage({
          message: 'Sesión inválida',
          description: message || 'Tu token no es válido. Inicia sesión nuevamente.',
          type: 'danger',
        })
        this.emitLocal('auth_error', { message: message || 'Token inválido o expirado' })
        this.disconnect()
        return
      }

      this.handleReconnect()
    })

    // Eventos específicos de la aplicación
    this.socket.on('sesion_actualizada', (data) => {
      console.log('📊 Sesión actualizada:', data)
      this.emitLocal('sesion_actualizada', data)
    })

    this.socket.on('producto_agregado', (data) => {
      console.log('📦 Producto agregado:', data)
      showMessage({
        message: `Producto agregado: ${data.producto.nombre}`,
        type: 'success',
      })
      this.emitLocal('producto_agregado', data)
    })

    this.socket.on('producto_removido', (data) => {
      console.log('🗑️ Producto removido:', data)
      showMessage({
        message: `Producto removido: ${data.producto.nombre}`,
        type: 'info',
      })
      this.emitLocal('producto_removido', data)
    })

    this.socket.on('sesion_completada', (data) => {
      console.log('✅ Sesión completada:', data)
      showMessage({
        message: `Sesión completada: ${data.sesion.numeroSesion}`,
        type: 'success',
      })
      this.emitLocal('sesion_completada', data)
    })

    this.socket.on('usuario_conectado', (data) => {
      console.log('👤 Usuario conectado:', data)
      showMessage({
        message: `${data.usuario.nombre} se conectó`,
        type: 'info',
      })
      this.emitLocal('usuario_conectado', data)
    })

    this.socket.on('usuario_desconectado', (data) => {
      console.log('👤 Usuario desconectado:', data)
      showMessage({
        message: `${data.usuario.nombre} se desconectó`,
        type: 'warning',
      })
      this.emitLocal('usuario_desconectado', data)
    })

    this.socket.on('colaborador_conectado', (data) => {
      console.log('👥 Colaborador conectado:', data)
      showMessage({
        message: `¡Colaborador conectado!`,
        description: 'Un nuevo dispositivo se unió a la sesión',
        type: 'success',
        icon: 'success',
        duration: 4000,
      })
      this.emitLocal('colaborador_conectado', data)
    })

    this.socket.on('colaborador_desconectado', (data) => {
      console.log('👥 Colaborador desconectado:', data)
      this.emitLocal('colaborador_desconectado', data)
    })

    this.socket.on('error', (error) => {
      console.error('❌ Error WebSocket:', error)
      showMessage({
        message: `Error de conexión: ${error.message || 'Error desconocido'}`,
        type: 'danger',
      })
    })
  }

  // Manejar reconexión automática
  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Máximo de intentos de reconexión alcanzado')
      showMessage({
        message: 'No se pudo reconectar. Verifique su conexión.',
        type: 'danger',
      })
      return
    }

    this.reconnectAttempts++
    console.log(`🔄 Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (this.socket && this.currentToken) {
        this.socket.auth = {
          ...(this.socket.auth || {}),
          token: this.currentToken,
        }
        this.socket.connect()
      }
    }, this.reconnectInterval)
  }

  // Unirse a una sala (sesión de inventario)
  joinSession(sessionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_session', { sessionId })
      console.log(`📊 Unido a la sesión: ${sessionId}`)
    } else {
      console.warn('⚠️ WebSocket no está conectado, no se puede unir a la sesión')
    }
  }

  // Salir de una sala
  leaveSession(sessionId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_session', { sessionId })
      console.log(`📊 Salió de la sesión: ${sessionId}`)
    }
  }

  // Emitir evento por Socket.IO
  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      console.warn(`⚠️ WebSocket no está conectado, no se puede emitir evento: ${event}`)
    }
  }

  // Suscribirse a eventos locales
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)
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
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      if (clearListeners) {
        this.listeners.clear()
      }
      console.log('🔌 Desconectado del servidor WebSocket')
    }
    this.currentToken = null
  }

  // Obtener estado de conexión
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id || null,
      url: BACKEND_URL,
      lastError: this.lastErrorMessage,
    }
  }

  extractErrorMessage(error) {
    if (!error) return ''
    if (typeof error === 'string') return error
    return error.message || error?.data?.message || ''
  }

  isAuthError(message) {
    if (!message) return false
    const normalized = message.toLowerCase()
    return (
      normalized.includes('token') ||
      normalized.includes('autenticación') ||
      normalized.includes('auth')
    )
  }
}

// Crear instancia singleton
const webSocketService = new WebSocketService()

export default webSocketService



