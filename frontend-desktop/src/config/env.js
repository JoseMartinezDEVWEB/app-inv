/**
 * Configuración de entorno para la aplicación
 * Soporta múltiples plataformas de despliegue (Vercel, Netlify, etc.)
 * y entornos (local, producción)
 */

const getRuntimeHostname = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return '';
};

// Función para detectar el entorno actual
export const detectEnvironment = () => {
  const hostname = getRuntimeHostname();

  // Verificar si estamos en Vercel
  if (
    import.meta.env.VITE_VERCEL_ENV ||
    import.meta.env.VERCEL ||
    hostname.endsWith('vercel.app')
  ) {
    return 'vercel';
  }

  // Verificar si estamos en Netlify
  if (
    import.meta.env.VITE_NETLIFY ||
    hostname.endsWith('netlify.app')
  ) {
    return 'netlify';
  }

  // Verificar si estamos en localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development';
  }

  // Por defecto, asumir producción
  return 'production';
};

// Función para detectar si estamos en Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electron?.isElectron;
};

// Función para resolver la URL de la API basándose en el entorno
export const resolveApiBaseUrl = async () => {
  const env = import.meta.env;
  const environment = detectEnvironment();

  // URL por defecto en la nube (Render) - siempre disponible
  const fallbackCloudUrl = 'https://appj4-hlqj.onrender.com/api';

  // Log para debugging
  console.log('🔧 Detectando configuración de API...');
  console.log('   Entorno detectado:', environment);

  // Si estamos en Electron, usar el backend embebido
  if (isElectron()) {
    console.log('   🖥️ Ejecutando en Electron - Usando backend embebido');
    try {
      const backendUrl = await window.electron.getBackendUrl();
      console.log('✅ Backend embebido:', backendUrl);
      return backendUrl;
    } catch (error) {
      console.error('❌ Error al obtener URL del backend embebido:', error);
      // Fallback a localhost
      console.log('   ⚠️ Usando fallback: http://localhost:4500/api');
      return 'http://localhost:4500/api';
    }
  }

  // Detectar si estamos en producción (Vercel, Netlify, etc.)
  const isProduction = environment === 'vercel' || environment === 'netlify' || environment === 'production';

  console.log('   ¿Es producción?:', isProduction);
  console.log('   Variables disponibles:', {
    VITE_API_URL: env.VITE_API_URL,
    VITE_API_URL_REMOTE: env.VITE_API_URL_REMOTE,
    VITE_API_URL_LAN: env.VITE_API_URL_LAN,
  });

  let candidates;

  if (isProduction) {
    // En producción: SOLO usar URLs remotas, NUNCA localhost
    candidates = [
      env.VITE_API_URL,           // Variable principal
      env.VITE_API_URL_REMOTE,    // URL remota/producción
      fallbackCloudUrl,           // Fallback a la nube (SIEMPRE disponible)
    ];
  } else {
    // En desarrollo local: priorizar localhost, luego LAN, luego remoto
    candidates = [
      env.VITE_API_URL,           // Variable principal
      env.VITE_API_URL_LAN,       // URL LAN (desarrollo local en red)
      'http://localhost:4500/api', // Desarrollo local (puerto estable)
      env.VITE_API_URL_REMOTE,    // Remoto como fallback
      fallbackCloudUrl,           // Último recurso
    ];
  }

  // Encontrar la primera URL válida (no vacía y bien formada)
  const url = candidates.find(
    (value) => typeof value === 'string' && value.trim().length > 0
  ) || fallbackCloudUrl;

  // Remover slash final si existe
  const cleanUrl = url.replace(/\/$/, '');

  console.log('✅ URL de API seleccionada:', cleanUrl);
  console.log('   Backend:', isProduction ? '☁️ Remoto (Render)' : '💻 Local/LAN');

  return cleanUrl;
};

// Función para resolver la URL de WebSocket
export const resolveWebSocketUrl = async () => {
  const env = import.meta.env;
  const environment = detectEnvironment();

  // URL por defecto en la nube (Render)
  const fallbackCloudUrl = 'https://appj4-hlqj.onrender.com';

  // Si estamos en Electron, usar el backend embebido
  if (isElectron()) {
    try {
      const backendUrl = await window.electron.getBackendUrl();
      // Extraer el base URL sin /api
      const wsUrl = backendUrl.replace('/api', '');
      console.log('✅ WebSocket embebido:', wsUrl);
      return wsUrl;
    } catch (error) {
      console.error('❌ Error al obtener WS del backend embebido:', error);
      return 'http://localhost:4500';
    }
  }

  // Detectar si estamos en producción
  const isProduction = environment === 'vercel' || environment === 'netlify' || environment === 'production';

  let candidates;

  if (isProduction) {
    // En producción: SOLO usar URLs remotas
    candidates = [
      env.VITE_WS_URL,
      env.VITE_WS_URL_REMOTE,
      fallbackCloudUrl,
    ];
  } else {
    // En desarrollo: priorizar localhost
    candidates = [
      env.VITE_WS_URL,
      env.VITE_WS_URL_LAN,
      'http://localhost:4500',
      env.VITE_WS_URL_REMOTE,
      fallbackCloudUrl,
    ];
  }

  const url = candidates.find(
    (value) => typeof value === 'string' && value.trim().length > 0
  ) || fallbackCloudUrl;

  console.log('✅ URL de WebSocket seleccionada:', url.replace(/\/$/, ''));

  return url.replace(/\/$/, '');
};

// Función para verificar conectividad con el backend
export const checkBackendConnectivity = async () => {
  const apiUrl = resolveApiBaseUrl();

  try {
    console.log('🔍 Verificando conectividad con:', `${apiUrl}/ping`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

    const response = await fetch(`${apiUrl}/ping`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend conectado:', data);
      return { success: true, data };
    } else {
      console.log('⚠️ Backend respondió con error:', response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log('❌ Error al conectar con el backend:', error.message);
    return { success: false, error: error.message };
  }
};

// Configuración base (se inicializará con initConfig)
let configInstance = null;

// Función para inicializar la configuración
export const initConfig = async () => {
  if (configInstance) return configInstance;

  const apiUrl = await resolveApiBaseUrl();
  const wsUrl = await resolveWebSocketUrl();

  configInstance = {
    apiUrl,
    wsUrl,
    environment: detectEnvironment(),
    appName: import.meta.env.VITE_APP_NAME || 'Gestor de Inventario J4 Pro',
    appVersion: import.meta.env.VITE_APP_VERSION || '2.0.0',
    debug: import.meta.env.VITE_DEBUG === 'true',
  };

  // Log de configuración
  console.log('📋 Configuración cargada:', configInstance);

  return configInstance;
};

// Getter para acceder a la configuración
export const getConfig = () => {
  if (!configInstance) {
    // No mostrar warning en consola para evitar confusión - solo retornar valores por defecto
    // Retornar configuración por defecto silenciosamente
    return {
      apiUrl: 'http://localhost:4500/api',
      wsUrl: 'http://localhost:4500',
      environment: 'development',
      appName: 'Gestor de Inventario J4 Pro',
      appVersion: '2.0.0',
      debug: false,
    };
  }
  return configInstance;
};

// Exportar config como getter
export const config = new Proxy({}, {
  get(target, prop) {
    return getConfig()[prop];
  }
});

export default config;
