import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { authApi, handleApiResponse, handleApiError } from '../services/api'
import webSocketService from '../services/websocket'
import { showMessage } from 'react-native-flash-message'
import { getInternetCredentials, setInternetCredentials, resetInternetCredentials } from '../services/secureStorage'
import { useLoader } from './LoaderContext'

// Estado inicial
const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
}

// Tipos de acciones
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_ERROR: 'LOGIN_ERROR',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
}

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      }
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    
    case AUTH_ACTIONS.LOGIN_ERROR:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      }
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }
    
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      }
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      }
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      }
    
    default:
      return state
  }
}

// Crear contexto
const AuthContext = createContext()

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

// Provider del contexto
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const { showAnimation } = useLoader()

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const [tokenCredentials, refreshCredentials, userCredentials] = await Promise.all([
          getInternetCredentials('auth_token'),
          getInternetCredentials('refresh_token'),
          getInternetCredentials('user_data'),
        ])

        const access = tokenCredentials?.password
        const userJson = userCredentials?.password
        const refresh = refreshCredentials?.password

        if (access && userJson) {
          const userData = JSON.parse(userJson)

          // Permitir sesión temporal de colaborador sin refresh token
          const isTempCollaborator = userData?.tipo === 'colaborador_temporal' || userData?.rol === 'colaborador'

          if (isTempCollaborator || (access && refresh)) {
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user: userData,
                accessToken: access,
                refreshToken: refresh || null,
              },
            })

            // Conectar WebSocket
            webSocketService.connect(access)
          } else {
            dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
          }
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false })
      }
    }

    checkAuth()
  }, [])

  // Función de login
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START })
      
      const response = await authApi.login(credentials)
      const { usuario, accessToken, refreshToken } = handleApiResponse(response)

      // Guardar en Keychain
      await Promise.all([
        setInternetCredentials('auth_token', 'token', accessToken),
        setInternetCredentials('refresh_token', 'refresh', refreshToken),
        setInternetCredentials('user_data', 'user', JSON.stringify(usuario)),
      ])

      // Actualizar estado
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: usuario,
          accessToken,
          refreshToken,
        },
      })

      // Conectar WebSocket
      webSocketService.connect(accessToken)

      showMessage({
        message: '¡Bienvenido!',
        description: `Hola, ${usuario.nombre}`,
        type: 'success',
      })
      
      return { success: true, user: usuario }
    } catch (error) {
      const errorMessage = handleApiError(error)
      dispatch({
        type: AUTH_ACTIONS.LOGIN_ERROR,
        payload: errorMessage,
      })
      return { success: false, error: errorMessage }
    }
  }

  // Función de registro (deshabilitada temporalmente)
  const register = async () => {
    const msg = 'El registro está temporalmente deshabilitado'
    dispatch({ type: AUTH_ACTIONS.LOGIN_ERROR, payload: msg })
    showMessage({ message: 'Registro deshabilitado', description: msg, type: 'warning' })
    return { success: false, error: msg }
  }

  // Función de logout
  const logout = useCallback(async () => {
    try {
      showAnimation('logout', 1200)
      // Desconectar WebSocket
      webSocketService.disconnect(true)

      // Limpiar Keychain
      await Promise.all([
        resetInternetCredentials('auth_token'),
        resetInternetCredentials('refresh_token'),
        resetInternetCredentials('user_data'),
      ])

      // Actualizar estado
      dispatch({ type: AUTH_ACTIONS.LOGOUT })

      showMessage({
        message: 'Sesión cerrada',
        description: 'Hasta luego',
        type: 'info',
      })
    } catch (error) {
      console.error('Error durante logout:', error)
      // Aún así limpiar el estado local
      dispatch({ type: AUTH_ACTIONS.LOGOUT })
    }
  }, [dispatch])

  // Adoptar sesión temporal de colaborador (QR)
  const loginAsCollaborator = useCallback(async (datos) => {
    try {
      const accessToken = datos?.sessionToken
      if (!accessToken) throw new Error('Token de sesión inválido')

      const user = {
        nombre: 'Colaborador',
        rol: datos?.rol || 'colaborador',
        contablePrincipal: datos?.contable?.id || datos?.contable?._id || null,
        tipo: 'colaborador_temporal',
        invitacionId: datos?.invitacionId || null,
        email: datos?.contable?.email || 'colaborador@temporal'
      }

      await Promise.all([
        setInternetCredentials('auth_token', 'token', accessToken),
        setInternetCredentials('user_data', 'user', JSON.stringify(user)),
      ])

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user,
          accessToken,
          refreshToken: null,
        },
      })

      webSocketService.connect(accessToken)

      showMessage({
        message: '¡Conectado como colaborador!',
        description: `Contable: ${datos?.contable?.nombre || ''}`,
        type: 'success',
      })

      return { success: true }
    } catch (e) {
      const msg = e?.message || 'No se pudo adoptar la sesión temporal'
      showMessage({ message: 'Error', description: msg, type: 'danger' })
      return { success: false, error: msg }
    }
  }, [])

  useEffect(() => {
    const handleWsAuthError = ({ message }) => {
      showMessage({
        message: 'Sesión expirada',
        description: message || 'Vuelve a iniciar sesión para continuar.',
        type: 'danger',
      })
      logout()
    }

    webSocketService.on('auth_error', handleWsAuthError)
    return () => webSocketService.off('auth_error', handleWsAuthError)
  }, [logout])

  // Función para actualizar datos del usuario
  const updateUser = async (userData) => {
    const updatedUser = { ...state.user, ...userData }
    
    try {
      await setInternetCredentials('user_data', 'user', JSON.stringify(updatedUser))
      
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: userData,
      })
    } catch (error) {
      console.error('Error actualizando usuario:', error)
    }
  }

  // Función para limpiar errores
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR })
  }

  // Función para verificar si el usuario tiene un rol específico
  const hasRole = (role) => {
    return state.user?.rol === role
  }

  // Función para verificar si el usuario tiene permisos
  const hasPermission = (permission) => {
    if (!state.user) return false
    
    const role = state.user.rol
    
    // Definir permisos por rol
    const permissions = {
      administrador: ['all'],
      contable: ['inventarios', 'reportes', 'clientes'],
      contador: ['inventarios', 'clientes'],
    }
    
    const userPermissions = permissions[role] || []
    return userPermissions.includes('all') || userPermissions.includes(permission)
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    loginAsCollaborator,
    updateUser,
    clearError,
    hasRole,
    hasPermission,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext



