import axios from 'axios'
import { showMessage } from 'react-native-flash-message'
import storage from './storage'
import { config } from '../config/env'
import localDb from './localDb' // Importar DB local

// Usar la configuración centralizada
const API_BASE_URL = config.apiUrl

// Crear instancia de Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'mobile',
  },
})

// Rutas públicas que NO requieren token
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/invitaciones/consumir-sin-cuenta',
  '/invitaciones/consumir-codigo',
  '/solicitudes-conexion/solicitar',
  '/solicitudes-conexion/estado',
  '/solicitudes-conexion/productos-offline',
]

// Interceptor para requests
api.interceptors.request.use(
  async (config) => {
    // Verificar si la ruta es pública
    const isPublicRoute = PUBLIC_ROUTES.some(route => config.url.includes(route))

    // Agregar token de autenticación solo si NO es ruta pública
    if (!isPublicRoute) {
      try {
        const token = await storage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.log('⚠️ No se pudo obtener el token:', error.message)
      }
    }

    // Agregar timestamp para evitar cache
    config.params = {
      ...config.params,
      _t: Date.now(),
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Si el error es 401 y no hemos intentado refrescar el token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = await storage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })

          const { accessToken, refreshToken } = response.data.datos

          // Guardar nuevos tokens
          await storage.setItem('auth_token', accessToken)
          await storage.setItem('refresh_token', refreshToken)

          // Reintentar la petición original
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Si falla el refresh, limpiar tokens
        await storage.removeItem('auth_token')
        await storage.removeItem('refresh_token')
        await storage.removeItem('user_data')
      }
    }

    // Manejar otros errores
    if (error.response?.status >= 500) {
      showMessage({
        message: 'Error del servidor',
        description: 'Por favor, intente más tarde.',
        type: 'danger',
      })
    } else if (error.response?.status === 404) {
      showMessage({
        message: 'Recurso no encontrado',
        type: 'warning',
      })
    } else if (error.response?.status === 403) {
      showMessage({
        message: 'Sin permisos',
        description: 'No tiene permisos para realizar esta acción.',
        type: 'danger',
      })
    } else if (error.code === 'ECONNABORTED') {
      showMessage({
        message: 'Tiempo agotado',
        description: 'Verifique su conexión.',
        type: 'warning',
      })
    } else if (!error.response) {
      showMessage({
        message: 'Sin conexión',
        description: `No se puede conectar a ${API_BASE_URL}. Verifique su internet y que el backend esté funcionando.`,
        type: 'danger',
      })
    }

    return Promise.reject(error)
  }
)

// Funciones de utilidad para manejo de respuestas
export const handleApiResponse = (response) => {
  if (response.data.exito) {
    return response.data.datos
  } else {
    throw new Error(response.data.mensaje || 'Error en la respuesta del servidor')
  }
}

export const handleApiError = (error) => {
  const message = error.response?.data?.mensaje || error.message || 'Error desconocido'
  showMessage({
    message: 'Error',
    description: message,
    type: 'danger',
  })
  return message
}

// Endpoints de la API
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/registro', userData),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
}

export const clientesApi = {
  getAll: (params = {}) => api.get('/clientes-negocios', { params }),
  getById: (id) => api.get(`/clientes-negocios/${id}`),
  create: (clienteData) => api.post('/clientes-negocios', clienteData),
  update: (id, clienteData) => api.put(`/clientes-negocios/${id}`, clienteData),
  delete: (id) => api.delete(`/clientes-negocios/${id}`),
  activate: (id) => api.patch(`/clientes-negocios/${id}/activar`),
  getStats: (id) => api.get(`/clientes-negocios/${id}/estadisticas`),
}

export const sesionesApi = {
  getAll: (params = {}) => api.get('/sesiones-inventario', { params }),
  getById: (id) => api.get(`/sesiones-inventario/${id}`),
  create: (sesionData) => api.post('/sesiones-inventario', sesionData),
  addProduct: (sesionId, productData) => api.post(`/sesiones-inventario/${sesionId}/productos`, productData),
  updateProduct: (sesionId, productId, productData) => api.put(`/sesiones-inventario/${sesionId}/productos/${productId}`, productData),
  removeProduct: (sesionId, productId) => api.delete(`/sesiones-inventario/${sesionId}/productos/${productId}`),
  updateFinancial: (sesionId, financialData) => api.put(`/sesiones-inventario/${sesionId}/financieros`, financialData),
  complete: (sesionId) => api.patch(`/sesiones-inventario/${sesionId}/completar`),
  cancel: (sesionId) => api.patch(`/sesiones-inventario/${sesionId}/cancelar`),
  pauseTimer: (sesionId) => api.patch(`/sesiones-inventario/${sesionId}/timer/pause`),
  resumeTimer: (sesionId) => api.patch(`/sesiones-inventario/${sesionId}/timer/resume`),
  getByClient: (clienteId, params = {}) => api.get(`/sesiones-inventario/cliente/${clienteId}`, { params }),
  // Agenda endpoints
  getAgendaResumen: (params = {}) => api.get('/sesiones-inventario/agenda/resumen', { params }),
  getAgendaDia: (params = {}) => api.get('/sesiones-inventario/agenda/dia', { params }),
}

export const reportesApi = {
  getBalance: (sesionId) => api.get(`/reportes/balance/${sesionId}`),
  getInventory: (sesionId) => api.get(`/reportes/inventario/${sesionId}`),
  downloadBalancePDF: (sesionId) => api.get(`/reportes/balance/${sesionId}/pdf`, { responseType: 'blob' }),
  downloadInventoryPDF: (sesionId) => api.get(`/reportes/inventario/${sesionId}/pdf`, { responseType: 'blob' }),
  getStats: (params = {}) => api.get('/reportes/estadisticas', { params }),
}

export const productosApi = {
  // Productos generales
  getAll: (params = {}) => api.get('/productos/generales', { params }),
  getAllGenerales: (params = {}) => api.get('/productos/generales', { params }),
  getGeneralByBarcode: (barcode) => api.get(`/productos/generales/buscar/codigo-barras/${barcode}`),

  // Productos de cliente específico
  getByClient: (clienteId, params = {}) => api.get(`/productos/cliente/${clienteId}`, { params }),
  getById: (id) => api.get(`/productos/generales/${id}`),
  create: (productData) => api.post('/productos/generales', productData),
  createForClient: (clienteId, productData) => api.post(`/productos/cliente/${clienteId}`, productData),
  update: (id, productData) => api.put(`/productos/generales/${id}`, productData),
  delete: (id) => api.delete(`/productos/generales/${id}`),

  // Búsqueda y código de barras (mantener compatibilidad)
  search: (params = {}) => api.get('/productos/buscar', { params }),
  buscarPorNombre: (nombre) => api.get('/productos/generales', { params: { buscar: nombre, limite: 20 } }),
  getByBarcode: (barcode) => api.get(`/productos/generales/buscar/codigo-barras/${barcode}`),
  // Asignar productos generales a un cliente (paridad con web)
  asignarGenerales: (clienteId, productosIds, costoPersonalizado = {}) =>
    api.post(`/productos/cliente/${clienteId}/asignar`, { productosIds, costoPersonalizado }),
}

export const saludApi = {
  check: () => api.get('/salud'),
  checkDB: () => api.get('/salud/db'),
  getSystemInfo: () => api.get('/salud/sistema'),
}

// Usuarios (paridad con web)
export const usuariosApi = {
  getSubordinados: () => api.get('/usuarios/subordinados'),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  changePassword: (id, password) => api.patch(`/usuarios/${id}/password`, { password }),
  delete: (id) => api.delete(`/usuarios/${id}`),
}

// Invitaciones (paridad con web)
export const invitacionesApi = {
  listMine: () => api.get('/invitaciones/mis-invitaciones'),
  createQR: (payload) => api.post('/invitaciones/qr', payload),
  getQR: (invitacionId) => api.get(`/invitaciones/qr/${invitacionId}`),
  cancel: (id) => api.delete(`/invitaciones/${id}`),
  consumirSinCuenta: (token) => api.post('/invitaciones/consumir-sin-cuenta', { token }),
  consumirCodigo: (codigo) => api.post('/invitaciones/consumir-codigo', { codigo }),
  listarColaboradores: (todos = false) => api.get('/invitaciones/colaboradores', { params: { todos } }),
  toggleColaborador: (id) => api.patch(`/invitaciones/colaboradores/${id}/toggle`),
  obtenerQRColaborador: (id) => api.get(`/invitaciones/colaboradores/${id}/qr`),
}

// Solicitudes de Conexión
export const solicitudesConexionApi = {
  // Públicas (sin auth)
  solicitar: (data) => api.post('/solicitudes-conexion/solicitar', data),
  verificarEstado: (solicitudId) => api.get(`/solicitudes-conexion/estado/${solicitudId}`),
  agregarProductoOffline: (solicitudId, productoData) => api.post(`/solicitudes-conexion/${solicitudId}/productos-offline`, { productoData }),

  // Protegidas (requieren auth)
  listarPendientes: () => api.get('/solicitudes-conexion/pendientes'),
  listarConectados: (sesionId) => api.get('/solicitudes-conexion/conectados', { params: { sesionId } }),
  aceptar: (solicitudId, sesionInventarioId) => api.post(`/solicitudes-conexion/${solicitudId}/aceptar`, { sesionInventarioId }),
  rechazar: (solicitudId) => api.post(`/solicitudes-conexion/${solicitudId}/rechazar`),
  obtenerProductosOffline: (solicitudId) => api.get(`/solicitudes-conexion/${solicitudId}/productos-offline`),
  sincronizar: (solicitudId, temporalIds) => api.post(`/solicitudes-conexion/${solicitudId}/sincronizar`, { temporalIds }),
  desconectar: (solicitudId) => api.post(`/solicitudes-conexion/${solicitudId}/desconectar`),
}

export const initializeOfflineMode = async () => {
  console.log('📱 Inicializando modo offline...')
  await localDb.init()
}

export default api



