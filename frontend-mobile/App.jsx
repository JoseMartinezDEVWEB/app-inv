import 'react-native-gesture-handler';
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View, ActivityIndicator, Modal, AppState } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { AuthProvider, useAuth } from './src/context/AuthContext'
import { LoaderProvider, useLoader } from './src/context/LoaderContext'
import { MessageProvider } from './src/context/MessageContext'
import { gestureHandlerRootHOC } from 'react-native-gesture-handler'
import FlashMessage from 'react-native-flash-message'
import { QueryClient, QueryClientProvider } from 'react-query'
import LoaderPortal from './src/components/LoaderPortal'
import { initializeOfflineMode } from './src/services/api'

// Pantallas
import LoginScreen from './src/screens/LoginScreen'
import DrawerNavigator from './src/navigation/DrawerNavigator'
import SplashScreen from './src/components/SplashScreen'
import EsperaAutorizacionScreen from './src/screens/EsperaAutorizacionScreen'
import SesionColaboradorScreen from './src/screens/SesionColaboradorScreen'

const Stack = createStackNavigator()

// Crear QueryClient para React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
})

// Pantalla de carga
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  )
}

// Componente para las rutas autenticadas
// Navegador principal que decide entre autenticación y el contenido principal
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true)
  const { durationMs } = useLoader()

  React.useEffect(() => {
    if (!showSplash) return
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, durationMs)
    return () => clearTimeout(timer)
  }, [showSplash, durationMs])

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} durationMs={durationMs} />
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="MainApp" component={DrawerNavigator} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="EsperaAutorizacion" component={EsperaAutorizacionScreen} />
          <Stack.Screen name="SesionColaborador" component={SesionColaboradorScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Componente principal
function AppContent() {
  const { showAnimation } = useLoader()
  const navigationRef = React.useRef()
  const routeNameRef = React.useRef()

  const getActiveRouteName = (state) => {
    if (!state) return null
    const route = state.routes[state.index]
    if (route.state) {
      return getActiveRouteName(route.state)
    }
    return route.name
  }

  return (
    <>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          try {
            routeNameRef.current = getActiveRouteName(navigationRef.current.getRootState())
          } catch {}
        }}
        onStateChange={(state) => {
          try {
            const previousRouteName = routeNameRef.current
            const currentRouteName = getActiveRouteName(state)
            if (currentRouteName && previousRouteName && currentRouteName !== previousRouteName) {
              // Solo animar cuando cambia la pantalla activa
              showAnimation('navigate', 800)
            }
            routeNameRef.current = currentRouteName
          } catch {}
        }}
      >
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
      <LoaderPortal />
    </>
  )
}

export default gestureHandlerRootHOC(function App() {
  const [dbInitialized, setDbInitialized] = React.useState(false)
  const appState = React.useRef(AppState.currentState)

  React.useEffect(() => {
    // Inicializar base de datos local al iniciar la app
    const initDb = async () => {
      try {
        console.log('🔧 Inicializando base de datos local...')
        await initializeOfflineMode()
        console.log('✅ Base de datos local inicializada correctamente')
        setDbInitialized(true)
      } catch (error) {
        console.error('❌ Error inicializando base de datos:', error)
        // Continuar aunque falle (modo degradado)
        setDbInitialized(true)
      }
    }

    initDb()

    // Mantener la app activa en background (prevenir cierre)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('✅ App vuelve a foreground')
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('📴 App va a background (manteniendo sesión activa)')
      }

      appState.current = nextAppState
    })

    return () => {
      subscription?.remove()
    }
  }, [])

  if (!dbInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LoaderProvider>
        <MessageProvider>
          <AuthProvider>
            <AppContent />
            <FlashMessage position="top" />
          </AuthProvider>
        </MessageProvider>
      </LoaderProvider>
    </QueryClientProvider>
  )
})

// Estilos usando React Native StyleSheet (sin Tailwind)
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
