import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Verificar si SecureStore está disponible
const canUseSecureStore = async () => {
  try {
    // SecureStore solo funciona en dispositivos reales
    await SecureStore.isAvailableAsync()
    return true
  } catch (_) {
    return false
  }
}

export async function setInternetCredentials(service, username, password) {
  const useSecure = await canUseSecureStore()
  const data = JSON.stringify({ username, password })
  
  if (useSecure) {
    try {
      await SecureStore.setItemAsync(`ss:${service}`, data)
      return true
    } catch (_) {
      // Fallback a AsyncStorage si falla
    }
  }
  
  await AsyncStorage.setItem(`ss:${service}`, data)
  return true
}

export async function getInternetCredentials(service) {
  const useSecure = await canUseSecureStore()
  
  if (useSecure) {
    try {
      const raw = await SecureStore.getItemAsync(`ss:${service}`)
      if (raw) {
        const v = JSON.parse(raw)
        return v && typeof v === 'object' ? v : null
      }
    } catch (_) {
      // Fallback a AsyncStorage si falla
    }
  }
  
  const raw = await AsyncStorage.getItem(`ss:${service}`)
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v : null
  } catch (_) {
    return null
  }
}

export async function resetInternetCredentials(service) {
  const useSecure = await canUseSecureStore()
  
  if (useSecure) {
    try {
      await SecureStore.deleteItemAsync(`ss:${service}`)
    } catch (_) {
      // Continuar aunque falle
    }
  }
  
  await AsyncStorage.removeItem(`ss:${service}`)
}
