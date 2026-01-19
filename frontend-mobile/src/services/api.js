import axios from 'axios'
import { showMessage } from 'react-native-flash-message'
import AsyncStorage from '@react-native-async-storage/async-storage'
import storage from './storage'
import { config, setOnlineStatus, isOnline } from '../config/env'
import localDb from './localDb'

// MODO STANDALONE: Activado para priorizar SQLite
const FORCE_STANDALONE = true; 

// Rutas que requieren conexión real (Colaboración, Auth inicial, Sync, Importación, Usuarios)
const ROUTES_PREFER_REMOTE = [
  '/solicitudes-conexion',
  '/invitaciones',
  '/auth/login', // Login inicial requiere nube para obtener token
  '/auth/refresh', // Refresh token requiere servidor
  '/sync',       // Nueva ruta de sincronización
  '/salud',
  '/importar',   // Importación de archivos requiere servidor (procesamiento Python/IA)
  '/productos/generales/importar', // Importación de productos requiere servidor
  '/usuarios',   // Gestión de usuarios requiere servidor (admin/contador)
];

const API_BASE_URL = config.apiUrl

const getRuntimeApiBaseUrl = async () => {
  try {
    const stored = await AsyncStorage.getItem('apiUrl')
    return stored || API_BASE_URL
  } catch (e) {
    return API_BASE_URL
  }
}

/**
 * Guardar y aplicar una nueva API URL en runtime.
 * - Persiste en AsyncStorage (clave: apiUrl)
 * - Actualiza defaults de Axios (instancia `api` y axios global, usado por websocket)
 */
export const setRuntimeApiBaseUrl = async (apiUrl) => {
  if (!apiUrl || typeof apiUrl !== 'string') {
    throw new Error('apiUrl inválida')
  }
  const clean = apiUrl.replace(/\/+$/, '')
  await AsyncStorage.setItem('apiUrl', clean)
  api.defaults.baseURL = clean
  axios.defaults.baseURL = clean
  return clean
}

/**
 * Recibe la URL base del backend (sin /api) y deriva apiUrl.
 * Ej: "http://192.168.1.10:4001" -> "http://192.168.1.10:4001/api"
 */
export const setRuntimeApiFromJ4ProUrl = async (j4proUrl) => {
  if (!j4proUrl || typeof j4proUrl !== 'string') {
    throw new Error('j4pro_url inválida')
  }
  const cleanBase = j4proUrl.replace(/\/+$/, '')
  const apiUrl = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`
  return await setRuntimeApiBaseUrl(apiUrl)
}

// Crear instancia de Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Aumentado a 30s para Cold Starts de Render
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'mobile',
    'X-App-Version': config.appVersion,
  },
})

// === ADAPTADOR LOCAL (SQLite) ===
// Intercepta lecturas y escrituras para usar SQLite como fuente de verdad
const mockLocalResponse = async (config) => {
  // Simular latencia mínima para UX
  await new Promise(r => setTimeout(r, 100)); 

  try {
    const { url, method, data: dataStr } = config;
    
    // Si es FormData o no es un string JSON, no intentar parsearlo
    let data = {};
    if (dataStr && typeof dataStr === 'string') {
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        // Si no es JSON válido, dejar data como objeto vacío
        // Esto evita errores con FormData u otros formatos
        console.log('⚠️ Adaptador local: data no es JSON, omitiendo parseo');
        data = {};
      }
    } else if (dataStr && typeof dataStr === 'object' && !(dataStr instanceof FormData)) {
      // Si ya es un objeto (pero no FormData), usarlo directamente
      data = dataStr;
    }
    
    // --- LECTURAS (GET) SIEMPRE A LOCAL ---
    
    if (method === 'get') {
        if (url.includes('/clientes-negocios')) {
            const clientes = await localDb.obtenerClientes(config.params?.buscar);
            return { data: { exito: true, datos: { datos: clientes } } };
        }
        if (url.includes('/sesiones-inventario')) {
            if (url.includes('/agenda')) {
                // Ruta de agenda - retornar vacío por ahora
                return { data: { exito: true, datos: { sesiones: [] } } };
            } else if (url.match(/\/sesiones-inventario\/[^\/]+$/)) {
                // GET por ID
                const id = url.split('/').pop();
                const sesiones = await localDb.obtenerSesiones();
                const sesion = sesiones.find(s => s._id === id || s.id === id);
                return { data: { exito: true, datos: { sesion } } };
            } else {
                // GET all
                const sesiones = await localDb.obtenerSesiones();
                return { data: { exito: true, datos: { sesiones } } };
            }
        }
        if (url.includes('/productos/generales')) {
            const productos = await localDb.obtenerProductos(config.params);
            return { data: { exito: true, datos: { productos } } };
        }
        // ... otros GETs se mapean similar ...
    }

    // --- ESCRITURAS (POST/PUT/DELETE) SIEMPRE A LOCAL PRIMERO ---
    // El SyncService se encargará de subirlas después
    
    if (url.includes('/productos/generales')) {
        if (method === 'post') return { data: { exito: true, datos: await localDb.crearProductoLocal(data) } };
        if (method === 'put') {
            const id = url.split('/').pop();
            return { data: { exito: true, datos: await localDb.actualizarProductoLocal(id, data) } };
        }
    }
    
    if (url.includes('/sesiones-inventario')) {
        if (method === 'post' && !url.includes('/productos')) {
            // Crear nueva sesión
            const nueva = { ...data, _id: 'local-' + Date.now(), fecha: new Date().toISOString() };
            await localDb.crearSesionLocal(nueva);
            return { data: { exito: true, datos: { sesion: nueva } } };
        }
        
        // Actualizar datos financieros de sesión
        if (method === 'put' && url.includes('/financieros')) {
            const sesionId = url.split('/sesiones-inventario/')[1].split('/')[0];
            await localDb.actualizarDatosFinancierosSesion(sesionId, data);
            return { data: { exito: true, datos: data } };
        }
        
        // Agregar producto a sesión
        if (method === 'post' && url.includes('/productos')) {
            const sesionId = url.split('/sesiones-inventario/')[1].split('/')[0];
            const productoGuardado = await localDb.guardarConteoLocal({
                ...data, 
                sesionId, 
                productoId: data.producto || data.productoId,
                nombreProducto: data.nombre,
                skuProducto: data.sku
            });
            return { data: { exito: true, datos: productoGuardado } };
        }
        
        // Actualizar producto en sesión
        if (method === 'put' && url.includes('/productos/')) {
            const parts = url.split('/');
            const productoId = parts.pop();
            const sesionId = parts[parts.indexOf('sesiones-inventario') + 1];
            await localDb.actualizarConteoLocal(sesionId, productoId, data);
            return { data: { exito: true, datos: data } };
        }
        
        // Eliminar producto de sesión
        if (method === 'delete' && url.includes('/productos/')) {
            const parts = url.split('/');
            const productoId = parts.pop();
            const sesionId = parts[parts.indexOf('sesiones-inventario') + 1];
            await localDb.eliminarConteoLocal(sesionId, productoId);
            return { data: { exito: true, datos: {} } };
        }
        
        // Completar sesión
        if (method === 'patch' && url.includes('/completar')) {
            const sesionId = url.split('/sesiones-inventario/')[1].split('/')[0];
            await localDb.completarSesionLocal(sesionId);
            return { data: { exito: true, datos: { completada: true } } };
        }
    }

    // Fallback por defecto
    return { data: { exito: true, datos: {} } };

  } catch (e) {
    console.error('Local Adapter Error:', e);
    throw e;
  }
};

// === INTERCEPTOR DE REQUESTS ===
api.interceptors.request.use(
  async (requestConfig) => {
    // Resolver baseURL en runtime (AsyncStorage) para soportar IP:PUERTO dinámicos
    // (p.ej. Desktop cambia de puerto 4000 -> 4003)
    const runtimeBaseUrl = await getRuntimeApiBaseUrl()
    requestConfig.baseURL = runtimeBaseUrl

    // Verificar si es ruta remota obligatoria
    const isRemoteRoute = ROUTES_PREFER_REMOTE.some(r => requestConfig.url.includes(r));

    if (!isRemoteRoute && FORCE_STANDALONE) {
        requestConfig.adapter = mockLocalResponse;
        return requestConfig;
    }

    // Siempre inyectar token si existe (para rutas remotas)
    // IMPORTANTE: Para FormData, debemos asegurarnos de que el token se inyecte ANTES
    // de que Axios procese el FormData, y NO debemos sobrescribir Content-Type
    try {
        const token = await storage.getItem('auth_token');
        
        // Rutas que pueden funcionar sin token (públicas o que manejan su propia autenticación)
        const publicRoutes = [
            '/auth/login',
            '/auth/registro',
            '/salud',
            '/solicitudes-conexion/solicitar',
            '/solicitudes-conexion/estado/',
            '/solicitudes-conexion/', // Rutas de ping, conectar, cerrar-sesion son públicas
        ];
        
        // Verificar si es una ruta pública (puede ser parte de una URL más larga)
        const isPublicRoute = publicRoutes.some(route => {
            // Para rutas con /, verificar que no esté en una ruta protegida
            if (route === '/solicitudes-conexion/') {
                // Permitir ping, conectar, cerrar-sesion, enviar-productos (son públicas)
                const publicSubRoutes = ['/ping', '/conectar', '/cerrar-sesion', '/productos-offline'];
                return publicSubRoutes.some(subRoute => requestConfig.url.includes(subRoute));
            }
            return requestConfig.url.includes(route);
        });
        
        if (token) {
            // Asegurar que los headers existan
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            
            // Inyectar token siempre
            requestConfig.headers.Authorization = `Bearer ${token}`;
            
            // Verificar si es FormData (en React Native, FormData puede no ser instanceof)
            const isFormData = requestConfig.data instanceof FormData || 
                             (requestConfig.data && 
                              typeof requestConfig.data === 'object' && 
                              requestConfig.data.constructor && 
                              requestConfig.data.constructor.name === 'FormData');
            
            if (isFormData) {
                // Para FormData, NO establecer Content-Type manualmente
                // Axios lo establece automáticamente con el boundary correcto
                // Si ya está establecido, eliminarlo para que Axios lo maneje
                if (requestConfig.headers['Content-Type'] === 'multipart/form-data') {
                    delete requestConfig.headers['Content-Type'];
                }
            }
        } else if (!isPublicRoute) {
            // No mostrar advertencia para rutas de sync que pueden funcionar sin token
            const isSyncRoute = requestConfig.url.includes('/sync/');
            
            // Solo mostrar advertencia en desarrollo para rutas que requieren autenticación
            // y que no son rutas de sync (que pueden funcionar en modo offline)
            if (__DEV__ && !isSyncRoute) {
                console.warn('⚠️ No se encontró token de autenticación para la petición:', requestConfig.url);
            }
            // Para /sync/batch y otras rutas de sync, si no hay token, simplemente continuar (modo offline)
            // En otros casos, dejar que el servidor responda 401
        }
    } catch (e) {
        // Silencioso - si no hay token, continuar sin él
        // Solo mostrar error en desarrollo
        if (__DEV__) {
            console.error('Error al obtener token:', e);
        }
    }

    // Log de depuración para peticiones de importación
    if (requestConfig.url && requestConfig.url.includes('/importar')) {
        console.log('🔍 Debug importación:', {
            url: requestConfig.url,
            hasToken: !!requestConfig.headers?.Authorization,
            isFormData: requestConfig.data instanceof FormData || 
                       (requestConfig.data && typeof requestConfig.data === 'object' && 
                        requestConfig.data.constructor?.name === 'FormData'),
            contentType: requestConfig.headers?.['Content-Type']
        });
    }

    return requestConfig;
  },
  (error) => Promise.reject(error)
);

// === INTERCEPTOR DE RESPUESTAS (COLD START RETRY) ===
api.interceptors.response.use(
  (response) => {
    setOnlineStatus(true);
    return response;
  },
  async (error) => {
    const originalRequest = error?.config;

    // Verificar que originalRequest existe antes de acceder a sus propiedades
    if (originalRequest) {
      // Detectar COLD START o problemas de red en rutas remotas
      if (!originalRequest._retry && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
        console.log('🔄 Detectado posible Cold Start o error de servidor. Reintentando...');
        originalRequest._retry = true;
        
        // Esperar 3 segundos antes de reintentar (dar tiempo a Render para despertar)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return api(originalRequest);
      }
    }

    // Fallback a offline si falla lo remoto (para casos híbridos)
    if (!error.response) {
        setOnlineStatus(false);
    }

    return Promise.reject(error);
  }
);

// Exports igual que antes...
export const handleApiResponse = (res) => res.data?.datos || res.data;
export const handleApiError = (err) => {
    const msg = err.response?.data?.mensaje || err.message;
    showMessage({ message: 'Error', description: msg, type: 'danger' });
    return msg;
};

// ... (Resto de exports de endpoints API se mantienen igual que tu archivo original para compatibilidad)
export const authApi = { 
    login: (d) => api.post('/auth/login', d),
    refresh: (d) => api.post('/auth/refresh', d),
};

export const clientesApi = { 
    getAll: (p) => api.get('/clientes-negocios', { params: p }),
    getById: (id) => api.get(`/clientes-negocios/${id}`),
    create: (d) => api.post('/clientes-negocios', d),
    update: (id, d) => api.put(`/clientes-negocios/${id}`, d),
    delete: (id) => api.delete(`/clientes-negocios/${id}`),
};

export const sesionesApi = { 
    getAll: (p) => api.get('/sesiones-inventario', { params: p }),
    getById: (id) => api.get(`/sesiones-inventario/${id}`),
    create: (d) => api.post('/sesiones-inventario', d),
    update: (id, d) => api.put(`/sesiones-inventario/${id}`, d),
    delete: (id) => api.delete(`/sesiones-inventario/${id}`),
    
    // Funciones de productos en sesión
    addProduct: (id, d) => api.post(`/sesiones-inventario/${id}/productos`, d),
    updateProduct: (id, productoId, d) => api.put(`/sesiones-inventario/${id}/productos/${productoId}`, d),
    removeProduct: (id, productoId) => api.delete(`/sesiones-inventario/${id}/productos/${productoId}`),
    getProducts: (id) => api.get(`/sesiones-inventario/${id}/productos`),
    
    // Funciones financieras
    updateFinancial: (id, d) => api.put(`/sesiones-inventario/${id}/financieros`, d),
    
    // Funciones de estado de sesión
    complete: (id) => api.patch(`/sesiones-inventario/${id}/completar`),
    cancel: (id) => api.patch(`/sesiones-inventario/${id}/cancelar`),
    
    // Funciones de timer
    pauseTimer: (id) => api.patch(`/sesiones-inventario/${id}/timer/pause`),
    resumeTimer: (id) => api.patch(`/sesiones-inventario/${id}/timer/resume`),
};

export const productosApi = { 
    getAll: (p) => api.get('/productos/generales', { params: p }),
    // Alias para getAllGenerales - usado en ProductSearchModal y ProductosGeneralesModal
    getAllGenerales: (p) => api.get('/productos/generales', { params: p }),
    getById: (id) => api.get(`/productos/generales/${id}`),
    create: async (d) => {
        const response = await api.post('/productos/generales', d);
        // Después de crear en servidor, guardar también en local
        if (response.data?.exito && response.data?.datos) {
            try {
                await localDb.guardarProductos([response.data.datos]);
            } catch (e) {
                // Silencioso - si falla guardar local, no es crítico
            }
        }
        return response;
    },
    update: (id, d) => api.put(`/productos/generales/${id}`, d),
    delete: (id) => api.delete(`/productos/generales/${id}`),
    buscarPorNombre: async (nombre) => {
        // Offline-first: buscar en localDb primero
        try {
            const productosLocales = await localDb.obtenerProductos({ buscar: nombre });
            if (productosLocales && productosLocales.length > 0) {
                return { data: { exito: true, datos: { productos: productosLocales } } };
            }
        } catch (e) {
            // Continuar con búsqueda en servidor si falla local
        }
        
        // Si no se encuentra localmente y hay conexión, buscar en servidor
        try {
            const response = await api.get('/productos/generales', { params: { buscar: nombre, limite: 50, pagina: 1 } });
            // Guardar productos encontrados en local para próximas búsquedas
            if (response.data?.exito && response.data?.datos?.productos) {
                try {
                    await localDb.guardarProductos(response.data.datos.productos);
                } catch (e) {
                    // Silencioso
                }
            }
            return response;
        } catch (e) {
            // Si falla el servidor, retornar respuesta vacía en lugar de lanzar error
            return { data: { exito: true, datos: { productos: [] } } };
        }
    },
    getByBarcode: async (codigo) => {
        // Offline-first: buscar en localDb primero
        try {
            const productoLocal = await localDb.buscarProductoPorCodigo(codigo);
            if (productoLocal) {
                return { data: { exito: true, datos: productoLocal } };
            }
        } catch (e) {
            // Continuar con búsqueda en servidor
        }
        // Si no se encuentra localmente y hay conexión, buscar en servidor
        try {
            return await api.get(`/productos/generales/buscar/codigo/${codigo}`);
        } catch (e) {
            // Si falla, retornar respuesta vacía
            return { data: { exito: false, datos: null } };
        }
    },
    getByClient: (clienteId, params) => api.get(`/productos/cliente/${clienteId}`, { params }),
    getByCliente: (clienteId, params) => api.get(`/productos/cliente/${clienteId}`, { params }),
    createForClient: (clienteId, data) => api.post(`/productos/cliente/${clienteId}`, data),
    createForCliente: (clienteId, data) => api.post(`/productos/cliente/${clienteId}`, data),
    // Asignar productos generales a un cliente
    asignarGenerales: (clienteId, productosIds) => api.post(`/productos/cliente/${clienteId}/asignar`, { productosIds }),
};

export const reportesApi = {
    getStats: (p) => {
        // Implementación local para estadísticas
        return Promise.resolve({
            data: {
                exito: true,
                datos: {
                    totalProductos: 0,
                    totalSesiones: 0,
                    totalClientes: 0,
                    productosContados: 0
                }
            }
        });
    }
};

export const invitacionesApi = {
    listMine: () => {
        // Implementación local para invitaciones
        return Promise.resolve({
            data: {
                exito: true,
                datos: []
            }
        });
    },
    listarColaboradores: () => {
        // Implementación local para colaboradores
        return Promise.resolve({
            data: {
                exito: true,
                datos: []
            }
        });
    },
    create: (d) => api.post('/invitaciones', d),
    createQR: (d) => api.post('/invitaciones/generar-qr', d), // Generar código QR para invitaciones
    delete: (id) => api.delete(`/invitaciones/${id}`),
    getQR: (invitacionId) => api.get(`/invitaciones/qr/${invitacionId}`),
    cancel: (id) => api.delete(`/invitaciones/${id}`),
    consumirSinCuenta: (token) => api.post('/invitaciones/consumir-sin-cuenta', { token }),
    consumirCodigo: (codigo) => api.post('/invitaciones/consumir-codigo', { codigo }),
};

// API para solicitudes de conexión de colaboradores
// Estas rutas están en ROUTES_PREFER_REMOTE, así que van directamente al servidor
export const solicitudesConexionApi = {
  // Públicas (sin auth) - Colaboradores
  solicitar: (data) => api.post('/solicitudes-conexion/solicitar', data),
  verificarEstado: (solicitudId) => api.get(`/solicitudes-conexion/estado/${solicitudId}`),
  agregarProductoOffline: (solicitudId, productoData) => api.post(`/solicitudes-conexion/${solicitudId}/productos-offline`, productoData),
  
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
};

// API para gestión de usuarios (admin/contador)
export const usuariosApi = {
  // Obtener usuarios subordinados (colaboradores, contadores)
  getSubordinados: () => api.get('/usuarios/subordinados'),
  
  // Crear nuevo usuario
  create: (data) => api.post('/usuarios', data),
  
  // Obtener usuario por ID
  getById: (id) => api.get(`/usuarios/${id}`),
  
  // Actualizar usuario
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  
  // Cambiar contraseña de usuario
  changePassword: (id, password) => api.patch(`/usuarios/${id}/password`, { password }),
  
  // Desactivar usuario
  delete: (id) => api.delete(`/usuarios/${id}`),
};

// Export default
export const initializeOfflineMode = async () => localDb.init();
export default api;
