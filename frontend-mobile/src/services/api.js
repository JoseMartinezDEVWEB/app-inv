import axios from 'axios'
import { showMessage } from 'react-native-flash-message'
import storage from './storage'
import { config, setOnlineStatus, isOnline, checkBackendConnectivity } from '../config/env'
import localDb from './localDb'

// MODO STANDALONE: Si es true, la app intercepta las peticiones y usa localDb
// EXCEPTO para las rutas que necesitan comunicarse con el backend remoto (como colaboradores conectándose)
const FORCE_STANDALONE = true; 

// Rutas que SIEMPRE deben intentar ir al backend remoto primero (para colaboradores)
// Estas son rutas públicas que un colaborador usaría antes de tener sesión local
// También incluye invitaciones para que funcionen entre dispositivos móviles
const ROUTES_PREFER_REMOTE = [
  '/solicitudes-conexion/solicitar',
  '/solicitudes-conexion/estado',
  '/invitaciones/qr',
  '/invitaciones/mis-invitaciones',
];

// URL base de la API
const API_BASE_URL = config.apiUrl

// Log de inicio
console.log('🌐 API Service iniciando...')
console.log('   URL Base:', API_BASE_URL)
console.log('   Modo:', config.isProduction ? 'PRODUCCION' : 'DESARROLLO')
console.log('   Standalone:', FORCE_STANDALONE ? 'ACTIVADO' : 'DESACTIVADO')

// Crear instancia de Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, 
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'mobile',
    'X-App-Version': config.appVersion,
  },
})

// === ADAPTADOR LOCAL PARA MODO STANDALONE ===
const mockLocalResponse = async (config) => {
  console.log(`📡 [LOCAL ADAPTER] ${config.method.toUpperCase()} ${config.url}`);
  await new Promise(r => setTimeout(r, 300)); // Simular latencia red

  try {
    // 1. Auth Login
    if (config.url.includes('/auth/login') && config.method === 'post') {
      const { email, password } = JSON.parse(config.data);
      const res = await localDb.loginLocal(email, password);
      if (res.success) {
        return {
          data: {
            exito: true,
            datos: {
              usuario: res.usuario,
              accessToken: 'local-fake-token',
              refreshToken: 'local-fake-refresh'
            }
          }
        };
      } else {
        throw { response: { status: 401, data: { mensaje: res.error } } };
      }
    }

    // 2. Clientes Listar
    if (config.url.includes('/clientes-negocios') && config.method === 'get') {
      const params = config.params || {};
      const clientes = await localDb.obtenerClientes(params.buscar || '');
      // Si no hay clientes locales, crear uno por defecto para que la app no se vea vacía
      if (clientes.length === 0 && !params.buscar) {
        await localDb.crearClienteLocal({ nombre: 'Cliente General', documento: '00000000', email: 'general@cliente.com' });
        const nuevos = await localDb.obtenerClientes();
        return { data: { exito: true, datos: { datos: nuevos } } };
      }
      return { data: { exito: true, datos: { datos: clientes } } };
    }

    // 3. Clientes Crear
    if (config.url.includes('/clientes-negocios') && config.method === 'post') {
        const clienteData = JSON.parse(config.data);
        const nuevo = await localDb.crearClienteLocal(clienteData);
        return { data: { exito: true, datos: nuevo } };
    }

    // 3.1 Clientes Actualizar/Eliminar
    if (config.url.includes('/clientes-negocios/')) {
        const id = config.url.split('/').pop();
        if (config.method === 'put') {
            const clienteData = JSON.parse(config.data);
            await localDb.actualizarClienteLocal(id, clienteData);
            return { data: { exito: true, datos: { id } } };
        }
        if (config.method === 'delete') {
            await localDb.eliminarClienteLocal(id);
            return { data: { exito: true, datos: { id } } };
        }
    }

    // 4. Sesiones Listar
    if (config.url.includes('/sesiones-inventario') && config.method === 'get') {
      const sesiones = await localDb.obtenerSesiones();
      return { data: { exito: true, datos: { sesiones } } };
    }

    // 5. Sesiones Crear
    if (config.url.includes('/sesiones-inventario') && config.method === 'post') {
      const sesionData = JSON.parse(config.data);
      // Simular objeto sesión
      const nuevaSesion = {
          _id: 'local-ses-' + Date.now(),
          numeroSesion: Math.floor(Math.random() * 1000).toString(),
          fecha: new Date().toISOString(),
          clienteNombre: sesionData.clienteNombre || 'Cliente Local',
          estado: 'en_progreso',
          totales: { totalProductosContados: 0, valorTotalInventario: 0 }
      };
      await localDb.crearSesionLocal(nuevaSesion);
      return { data: { exito: true, datos: { sesion: { ...nuevaSesion, clienteNegocio: { nombre: nuevaSesion.clienteNombre } } } } };
    }

    // 6. Sesiones Detalle (GET)
    if (config.url.includes('/sesiones-inventario/') && config.method === 'get' && !config.url.includes('productos')) {
        // Extraer ID
        // const id = config.url.split('/').pop();
        // Devolver sesión mock o buscar
        // Por simplicidad devolvemos estructura básica
        return { 
            data: { 
                exito: true, 
                datos: { 
                    sesion: {
                        _id: 'mock-id',
                        numeroSesion: 1,
                        fecha: new Date().toISOString(),
                        estado: 'en_progreso',
                        clienteNegocio: { nombre: 'Cliente Local', _id: 'cli-local' },
                        totales: { totalProductosContados: 0, valorTotalInventario: 0 },
                        productosContados: []
                    }
                } 
            } 
        };
    }

    // 7. Productos Listar
    if (config.url.includes('/productos/generales') && config.method === 'get') {
        const params = config.params || {};
        const productos = await localDb.obtenerProductos(params);
        return { data: { exito: true, datos: { productos } } };
    }

    // 7.0 Buscar por código de barras
    if (config.url.includes('/productos/generales/buscar/codigo-barras/') && config.method === 'get') {
        const barcode = config.url.split('/').pop();
        const producto = await localDb.buscarProductoPorCodigo(barcode);
        if (producto) {
            return { data: { exito: true, datos: { producto } } };
        } else {
            throw { response: { status: 404, data: { mensaje: 'Producto no encontrado' } } };
        }
    }

    // 7.1 Productos Crear
    if (config.url.includes('/productos/generales') && config.method === 'post') {
        const productData = JSON.parse(config.data);
        const nuevo = await localDb.crearProductoLocal(productData);
        return { data: { exito: true, datos: nuevo } };
    }

    // 7.2 Productos Actualizar/Eliminar
    if (config.url.includes('/productos/generales/')) {
        const id = config.url.split('/').pop();
        if (config.method === 'put') {
            const productData = JSON.parse(config.data);
            await localDb.actualizarProductoLocal(id, productData);
            return { data: { exito: true, datos: { id } } };
        }
        if (config.method === 'delete') {
            await localDb.eliminarProductoLocal(id);
            return { data: { exito: true, datos: { id } } };
        }
    }

    // 8. Solicitud Conexión (Invitación) - MODO LOCAL/FALLBACK
    // NOTA: Esta función solo se llama si el backend remoto no está disponible
    // El flujo normal es: tryRemoteBackend() -> si falla -> mockLocalResponse()
    if (config.url.includes('/solicitudes-conexion/solicitar') && config.method === 'post') {
        const requestData = JSON.parse(config.data);
        const { codigoNumerico, nombreColaborador } = requestData;
        
        console.log('🔑 [LOCAL] Intentando conectar con código:', codigoNumerico);
        console.log('⚠️ [LOCAL] Backend remoto no disponible, usando DB local');
        
        const invitacion = await localDb.verificarCodigoInvitacion(codigoNumerico);
        
        if (invitacion) {
            console.log('✅ [LOCAL] Conexión autorizada para:', nombreColaborador || invitacion.nombre);
            return {
                data: {
                    exito: true,
                    datos: { 
                        id: 'solicitud-local-' + Date.now(), 
                        estado: 'aceptada',
                        nombre: invitacion.nombre || nombreColaborador,
                        modoLocal: true
                    }
                }
            };
        } else {
            // Si llegamos aquí, significa que:
            // 1. El backend remoto no está disponible (o no tiene el código)
            // 2. La base de datos local tampoco tiene el código
            // Esto puede pasar si el admin creó el código en desktop/web y el backend no responde
            console.log('❌ [LOCAL] Código no encontrado en DB local');
            console.log('💡 Sugerencia: Verifica que el servidor backend esté corriendo');
            console.log('   URL del backend:', API_BASE_URL);
            
            throw { 
                response: { 
                    status: 400, 
                    data: { 
                        mensaje: 'No se pudo verificar el código. Asegúrate de que:\n' +
                                '1. El servidor del administrador esté en línea\n' +
                                '2. El código de invitación sea correcto\n' +
                                '3. Estés conectado a la misma red que el administrador' 
                    } 
                } 
            };
        }
    }

    // 12. Usuarios Listar
    if (config.url.includes('/usuarios') && config.method === 'get') {
        const usuarios = await localDb.obtenerUsuarios();
        return { data: { exito: true, datos: usuarios } };
    }

    // 12.1 Usuarios Subordinados (usado en UsuariosScreen)
    if (config.url.includes('/usuarios/subordinados') && config.method === 'get') {
        const usuarios = await localDb.obtenerUsuarios();
        // Filtrar solo los que no son administradores si se desea, 
        // pero por ahora devolvemos todos los que el admin creó localmente.
        return { data: { exito: true, datos: usuarios } };
    }

    // 13. Usuarios Crear
    if (config.url.includes('/usuarios') && config.method === 'post') {
        const userData = JSON.parse(config.data);
        console.log('👤 Creando usuario:', userData.nombre, 'Rol:', userData.rol);
        
        const res = await localDb.registrarUsuarioLocal(userData);
        
        if (res.success) {
            console.log('✅ Usuario creado con ID:', res.id);
            
            // Si es colaborador, incluir el código de acceso generado
            const response = { 
                _id: res.id, 
                id: res.id,
                nombre: userData.nombre,
                email: userData.email,
                rol: userData.rol
            };
            
            if (res.codigoAcceso) {
                response.codigoAcceso = res.codigoAcceso;
                console.log('🔑 Código de acceso generado:', res.codigoAcceso);
                
                // Verificar inmediatamente que la invitación existe
                const verificacion = await localDb.verificarCodigoInvitacion(res.codigoAcceso);
                if (verificacion) {
                    console.log('✅ Invitación VERIFICADA correctamente');
                } else {
                    console.error('❌ ERROR: La invitación NO se puede verificar inmediatamente después de crear');
                }
            }
            
            return { 
                data: { 
                    exito: true, 
                    datos: response, 
                    mensaje: res.codigoAcceso 
                        ? `Usuario creado. Código de acceso: ${res.codigoAcceso}` 
                        : 'Usuario creado exitosamente' 
                } 
            };
        } else {
            console.error('❌ Error creando usuario:', res.error);
            throw { response: { status: 400, data: { mensaje: res.error } } };
        }
    }

    // 14. Usuarios Actualizar/Eliminar
    if (config.url.includes('/usuarios/')) {
        const id = config.url.split('/').pop();
        if (config.method === 'put') {
            const userData = JSON.parse(config.data);
            await localDb.actualizarUsuarioLocal(id, userData);
            return { data: { exito: true, datos: { id } } };
        }
        if (config.method === 'delete') {
            await localDb.eliminarUsuario(id);
            return { data: { exito: true, datos: { id } } };
        }
    }

    // 9. Verificar estado solicitud (LOCAL/FALLBACK)
    // NOTA: Esta función se llama cuando el backend remoto no está disponible
    if (config.url.includes('/solicitudes-conexion/estado')) {
        // En modo local, si el usuario llegó hasta aquí significa que se conectó localmente
        // Automáticamente lo marcamos como aceptado para permitir continuar
        console.log('✅ [LOCAL] Estado de solicitud: aceptada (modo local)');
        return { data: { exito: true, datos: { estado: 'aceptada', modoLocal: true } } };
    }

    // 10. Invitaciones Crear
    if (config.url.includes('/invitaciones/qr') && config.method === 'post') {
        const payload = JSON.parse(config.data);
        const invitacion = await localDb.crearInvitacionLocal({
            rol: payload.rol || 'colaborador',
            creadoPor: 'admin-local',
            nombre: payload.nombre
        });
        return { 
            data: { 
                exito: true, 
                datos: {
                    _id: invitacion._id,
                    id: invitacion._id,
                    codigoNumerico: invitacion.codigoNumerico,
                    codigoQR: invitacion.codigoQR,
                    qrDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + invitacion.codigoQR,
                    rol: payload.rol,
                    expiraEn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    nombre: payload.nombre
                } 
            } 
        };
    }

    // 11. Invitaciones Listar (Mis Invitaciones)
    if (config.url.includes('/invitaciones/mis-invitaciones') && config.method === 'get') {
        const invitaciones = await localDb.listarInvitaciones();
        return { data: { exito: true, datos: invitaciones } };
    }

    // 11.1 Colaboradores Listar
    if (config.url.includes('/invitaciones/colaboradores') && config.method === 'get') {
        // Usar la función mejorada que devuelve colaboradores con sus códigos
        const colaboradores = await localDb.listarColaboradoresConCodigo();
        return { data: { exito: true, datos: colaboradores } };
    }

    // 11.2 Obtener QR Colaborador
    if (config.url.includes('/invitaciones/colaboradores/') && config.url.includes('/qr')) {
        const id = config.url.split('/')[3]; // /invitaciones/colaboradores/:id/qr
        const invitaciones = await localDb.listarInvitaciones();
        const inv = invitaciones.find(i => i._id === id);
        if (inv) {
            return { 
                data: { 
                    exito: true, 
                    datos: {
                        ...inv,
                        qrDataUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + inv.codigoQR
                    } 
                } 
            };
        }
    }

    // Default: Return empty success for unhandled gets to prevent crashes
    if (config.method === 'get') {
        return { data: { exito: true, datos: [] } };
    }
    
    return { data: { exito: true, datos: {} } };

  } catch (e) {
    console.error('Local Adapter Error:', e);
    throw e;
  }
};

// Rutas publicas que NO requieren token
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/invitaciones/consumir-sin-cuenta',
  '/invitaciones/consumir-codigo',
  '/solicitudes-conexion/solicitar',
  '/solicitudes-conexion/estado',
  '/solicitudes-conexion/productos-offline',
  '/salud',
]

// Función para verificar si una ruta debe intentar el backend remoto primero
const shouldTryRemoteFirst = (url) => {
  return ROUTES_PREFER_REMOTE.some(route => url.includes(route));
};

// Función para hacer request al backend remoto
const tryRemoteBackend = async (requestConfig) => {
  try {
    // Crear una instancia de axios sin el interceptor standalone
    const remoteApi = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Type': 'mobile',
        'X-App-Version': config.appVersion,
      },
    });
    
    console.log('🌐 [REMOTE] Intentando conexión al backend:', API_BASE_URL + requestConfig.url);
    
    const response = await remoteApi({
      method: requestConfig.method,
      url: requestConfig.url,
      data: requestConfig.data ? JSON.parse(requestConfig.data) : undefined,
      params: requestConfig.params,
    });
    
    console.log('✅ [REMOTE] Respuesta exitosa del backend');
    return { success: true, response };
  } catch (error) {
    // Distinguir entre error de red y error de validación del servidor
    if (error.response) {
      // El servidor respondió con un código de error (400, 404, etc.)
      // Esto significa que el servidor está activo pero el código es inválido
      console.log('⚠️ [REMOTE] Servidor respondió con error:', error.response.status);
      console.log('   Mensaje:', error.response.data?.mensaje || error.response.data?.message);
      
      // Re-lanzar el error para que el frontend lo maneje (mostrar mensaje de error)
      return { success: false, error, isServerResponse: true };
    }
    
    // Error de red (servidor no disponible, timeout, etc.)
    console.log('❌ [REMOTE] Error de conexión al backend:', error.message);
    return { success: false, error, isServerResponse: false };
  }
};

// Interceptor para requests
api.interceptors.request.use(
  async (requestConfig) => {
    // === INTERCEPCION MODO STANDALONE ===
    if (FORCE_STANDALONE) {
        // Para rutas que prefieren el backend remoto (como solicitudes de conexión)
        // Primero intentamos el servidor, y solo usamos local como fallback
        if (shouldTryRemoteFirst(requestConfig.url)) {
          requestConfig.adapter = async (config) => {
            // Intentar primero el backend remoto
            const remoteResult = await tryRemoteBackend(config);
            
            if (remoteResult.success) {
              // El backend remoto respondió exitosamente, usar esa respuesta
              return remoteResult.response;
            }
            
            // Si el servidor respondió con un error de validación (código inválido, etc.)
            // NO usar fallback local, propagar el error del servidor
            if (remoteResult.isServerResponse) {
              console.log('⚠️ Servidor respondió con error de validación - propagando error');
              throw remoteResult.error;
            }
            
            // Si fue un error de red (servidor no disponible), usar el adaptador local como fallback
            console.log('🔄 [FALLBACK] Backend no disponible, usando base de datos local como respaldo');
            return mockLocalResponse(config);
          };
        } else {
          // Para otras rutas, usar directamente el adaptador local
          requestConfig.adapter = async (config) => {
            return mockLocalResponse(config);
          };
        }
        return requestConfig;
    }
    // ====================================

    const isPublicRoute = PUBLIC_ROUTES.some(route => requestConfig.url.includes(route))

    if (!isPublicRoute) {
      try {
        const token = await storage.getItem('auth_token')
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.log('⚠️ No se pudo obtener el token:', error.message)
      }
    }

    if (requestConfig.data instanceof FormData) {
      delete requestConfig.headers['Content-Type']
    }

    requestConfig.params = {
      ...requestConfig.params,
      _t: Date.now(),
    }

    return requestConfig
  },
  (error) => Promise.reject(error)
)

// Interceptor para responses - Manejo de errores y modo offline
api.interceptors.response.use(
  (response) => {
    // Conexion exitosa - marcar como online
    if (!isOnline()) {
      setOnlineStatus(true)
      showMessage({
        message: 'Conexion restaurada',
        description: 'Sincronizando con el servidor...',
        type: 'success',
        duration: 2000,
      })
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Error de red o timeout - cambiar a modo offline
    if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      if (isOnline()) {
        setOnlineStatus(false)
        console.log('📴 Cambiando a modo OFFLINE')
        
        // Solo mostrar mensaje una vez
        if (!global._offlineMessageShown) {
          global._offlineMessageShown = true
          showMessage({
            message: 'Modo sin conexion',
            description: 'Usando datos locales',
            type: 'warning',
            duration: 3000,
          })
          setTimeout(() => { global._offlineMessageShown = false }, 30000)
        }
      }
      
      return Promise.reject(error)
    }

    // Error 401 - Token expirado
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = await storage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          })

          const { accessToken, refreshToken: newRefreshToken } = response.data.datos

          await storage.setItem('auth_token', accessToken)
          await storage.setItem('refresh_token', newRefreshToken)

          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        await storage.removeItem('auth_token')
        await storage.removeItem('refresh_token')
        await storage.removeItem('user_data')
      }
    }

    // Otros errores HTTP
    const statusCode = error.response?.status
    const shouldShowToast = !originalRequest?._silent

    if (statusCode >= 500 && shouldShowToast && !originalRequest?._serverErrorShown) {
      originalRequest._serverErrorShown = true
      showMessage({
        message: 'Error del servidor',
        description: 'Intenta mas tarde o usa modo offline',
        type: 'danger',
        duration: 3000,
      })
    } else if (statusCode === 403 && shouldShowToast) {
      showMessage({
        message: 'Sin permisos',
        description: 'No tienes acceso a este recurso',
        type: 'warning',
        duration: 2000,
      })
    } else if (statusCode === 429) {
      showMessage({
        message: 'Demasiadas solicitudes',
        description: 'Espera un momento',
        type: 'warning',
        duration: 2000,
      })
    }

    return Promise.reject(error)
  }
)

// Utilidades de respuesta
export const handleApiResponse = (response) => {
  if (!response || !response.data) {
    throw new Error('Respuesta invalida del servidor')
  }

  const { data } = response

  if (data.exito !== undefined) {
    if (!data.exito) {
      throw new Error(data.mensaje || 'Error en la operacion')
    }
    return data.datos || data
  }

  return data
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

// =============================================
// ENDPOINTS DE LA API
// =============================================

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
  getAll: (params = {}) => api.get('/productos/generales', { params }),
  getAllGenerales: (params = {}) => api.get('/productos/generales', { params }),
  getGeneralByBarcode: (barcode) => api.get(`/productos/generales/buscar/codigo-barras/${barcode}`),
  getByClient: (clienteId, params = {}) => api.get(`/productos/cliente/${clienteId}`, { params }),
  getById: (id) => api.get(`/productos/generales/${id}`),
  create: (productData) => api.post('/productos/generales', productData),
  createForClient: (clienteId, productData) => api.post(`/productos/cliente/${clienteId}`, productData),
  update: (id, productData) => api.put(`/productos/generales/${id}`, productData),
  delete: (id) => api.delete(`/productos/generales/${id}`),
  search: (params = {}) => api.get('/productos/buscar', { params }),
  importarDesdeArchivo: (formData) => api.post('/productos/generales/importar', formData, { timeout: 120000 }),
  buscarPorNombre: (nombre) => api.get('/productos/generales', { params: { buscar: nombre, limite: 20 } }),
  getByBarcode: (barcode) => api.get(`/productos/generales/buscar/codigo-barras/${barcode}`),
  asignarGenerales: (clienteId, productosIds, costoPersonalizado = {}) =>
    api.post(`/productos/cliente/${clienteId}/asignar`, { productosIds, costoPersonalizado }),
}

export const saludApi = {
  check: () => api.get('/salud', { _silent: true }),
  checkDB: () => api.get('/salud/db'),
  getSystemInfo: () => api.get('/salud/sistema'),
}

export const usuariosApi = {
  getSubordinados: () => api.get('/usuarios/subordinados'),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  changePassword: (id, password) => api.patch(`/usuarios/${id}/password`, { password }),
  delete: (id) => api.delete(`/usuarios/${id}`),
}

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

export const solicitudesConexionApi = {
  // Públicas (sin auth) - Colaboradores
  solicitar: (data) => api.post('/solicitudes-conexion/solicitar', data),
  verificarEstado: (solicitudId) => api.get(`/solicitudes-conexion/estado/${solicitudId}`),
  agregarProductoOffline: (solicitudId, productoData) => api.post(`/solicitudes-conexion/${solicitudId}/productos-offline`, { productoData }),
  
  // Estados de conexión (colaboradores)
  ping: (solicitudId) => api.post(`/solicitudes-conexion/${solicitudId}/ping`),
  conectar: (solicitudId) => api.post(`/solicitudes-conexion/${solicitudId}/conectar`),
  cerrarSesion: (solicitudId) => api.post(`/solicitudes-conexion/${solicitudId}/cerrar-sesion`),
  enviarProductos: (solicitudId, sesionInventarioId) => api.post(`/solicitudes-conexion/${solicitudId}/enviar-productos`, { sesionInventarioId }),
  
  // Protegidas (requieren auth) - Admin
  listarPendientes: () => api.get('/solicitudes-conexion/pendientes'),
  listarConectados: (sesionId) => api.get('/solicitudes-conexion/conectados', { params: { sesionId } }),
  aceptar: (solicitudId, sesionInventarioId) => api.post(`/solicitudes-conexion/${solicitudId}/aceptar`, { sesionInventarioId }),
  rechazar: (solicitudId) => api.post(`/solicitudes-conexion/${solicitudId}/rechazar`),
  obtenerProductosOffline: (solicitudId) => api.get(`/solicitudes-conexion/${solicitudId}/productos-offline`),
  sincronizar: (solicitudId, temporalIds) => api.post(`/solicitudes-conexion/${solicitudId}/sincronizar`, { temporalIds }),
  desconectar: (solicitudId) => api.post(`/solicitudes-conexion/${solicitudId}/desconectar`),
  
  // Cola de productos (Admin)
  obtenerColasPendientes: () => api.get('/solicitudes-conexion/colas-pendientes'),
  obtenerDetalleCola: (colaId) => api.get(`/solicitudes-conexion/colas/${colaId}`),
  marcarColaEnRevision: (colaId) => api.post(`/solicitudes-conexion/colas/${colaId}/revisar`),
  aceptarProductosCola: (colaId, productosIds, notas = '') => api.post(`/solicitudes-conexion/colas/${colaId}/aceptar`, { productosIds, notas }),
  aceptarTodosCola: (colaId, notas = '') => api.post(`/solicitudes-conexion/colas/${colaId}/aceptar-todos`, { notas }),
  rechazarProductosCola: (colaId, productosIds, notas = '') => api.post(`/solicitudes-conexion/colas/${colaId}/rechazar`, { productosIds, notas }),
  rechazarTodosCola: (colaId, notas = '') => api.post(`/solicitudes-conexion/colas/${colaId}/rechazar-todos`, { notas }),
}

// Inicializar base de datos local al cargar
export const initializeOfflineMode = async () => {
  console.log('📱 Inicializando base de datos local...')
  try {
    await localDb.init()
    console.log('✅ Base de datos local lista')
    return true
  } catch (error) {
    console.error('❌ Error inicializando DB local:', error)
    return false
  }
}

// Verificar conectividad al backend
export const checkBackendHealth = async () => {
  try {
    const response = await saludApi.check()
    setOnlineStatus(true)
    return { online: true, data: response.data }
  } catch (error) {
    setOnlineStatus(false)
    return { online: false, error: error.message }
  }
}

export default api
