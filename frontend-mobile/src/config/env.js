/**
 * Configuración de entorno para la aplicación móvil
 * Soporta detección automática de entorno (nube/local)
 * y conectividad flexible
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Función para detectar si estamos en un dispositivo real o emulador
const detectDeviceType = () => {
  if (Platform.OS === 'android') {
    return Constants.isDevice ? 'physical-android' : 'emulator-android';
  } else if (Platform.OS === 'ios') {
    return Constants.isDevice ? 'physical-ios' : 'simulator-ios';
  }
  return 'unknown';
};

// Función para obtener la IP local de la LAN (si está configurada)
const getLanIpFromConfig = () => {
  const extra = Constants.expoConfig?.extra ?? {};
  const endpoints = extra.API_ENDPOINTS ?? {};
  return endpoints.lan || null;
};

// Función para detectar si estamos en un build de producción
const isProductionBuild = () => {
  // __DEV__ es false en builds de producción de React Native
  return !__DEV__;
};

// Función para resolver la URL de la API con prioridad inteligente
export const resolveApiBaseUrl = () => {
  const extra = Constants.expoConfig?.extra ?? {};
  const endpoints = extra.API_ENDPOINTS ?? {};
  const deviceType = detectDeviceType();
  const isProduction = isProductionBuild();
  
  // URL por defecto en la nube (siempre accesible)
  const fallbackCloudUrl = 'https://appj4-hlqj.onrender.com/api';
  
  // Log para debugging
  console.log('🔧 Configuración de API (Móvil):');
  console.log('   Dispositivo:', deviceType);
  console.log('   ¿Es producción?:', isProduction);
  console.log('   Variables disponibles:', {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    DEFAULT_REMOTE_API_URL: extra.DEFAULT_REMOTE_API_URL,
    cloud: endpoints.cloud,
    lan: endpoints.lan,
    local: endpoints.local,
    emulator: endpoints.emulator,
  });
  
  let candidates;
  
  if (isProduction) {
    // En producción (APK/AAB): SOLO usar URLs remotas
    candidates = [
      process.env.EXPO_PUBLIC_API_URL,      // Variable de entorno de build
      extra.EXPO_PUBLIC_API_URL,            // Variable en app.json
      extra.DEFAULT_REMOTE_API_URL,         // URL remota por defecto
      endpoints.cloud,                      // Endpoint de la nube
      fallbackCloudUrl,                     // Fallback garantizado
    ];
  } else {
    // En desarrollo (Expo Go, Dev Client): priorizar LAN/local
    // FORZAR USO DE BACKEND LOCAL (ignorar variables de entorno en dev)
    candidates = [
      endpoints.emulator,                   // Emulador (desarrollo) <- PRIORIDAD #1
      endpoints.lan,                        // LAN (desarrollo en red local)
      endpoints.local,                      // Localhost (desarrollo)
      extra.DEFAULT_REMOTE_API_URL,         // Remoto como fallback
      endpoints.cloud,                      // Endpoint de la nube
      fallbackCloudUrl,                     // Último recurso
    ];
  }
  
  // Encontrar la primera URL válida
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
export const resolveWebSocketUrl = () => {
  const apiUrl = resolveApiBaseUrl();
  
  // El WebSocket está en el mismo host que la API, solo quitamos '/api'
  const wsUrl = apiUrl.replace('/api', '');
  
  console.log('✅ URL de WebSocket:', wsUrl);
  
  return wsUrl;
};

// Función para verificar conectividad con el backend
export const checkBackendConnectivity = async () => {
  const apiUrl = resolveApiBaseUrl();
  
  try {
    console.log('🔍 Verificando conectividad con:', `${apiUrl}/salud`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
    
    const response = await fetch(`${apiUrl}/salud`, {
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

// Exportar configuración
export const config = {
  apiUrl: resolveApiBaseUrl(),
  wsUrl: resolveWebSocketUrl(),
  deviceType: detectDeviceType(),
  appName: Constants.expoConfig?.name || 'Gestor de Inventario J4 Pro',
  appVersion: Constants.expoConfig?.version || '2.0.0',
  platform: Platform.OS,
};

// Log de configuración
console.log('📋 Configuración cargada (Móvil):', config);

export default config;
