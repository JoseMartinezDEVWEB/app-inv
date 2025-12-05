import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import { useLoader } from '../context/LoaderContext'
import { useQueryClient } from 'react-query'

const { width } = Dimensions.get('window')

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth()
  const { showLoader } = useLoader()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = React.useState(false)

  const onRefresh = React.useCallback(() => {
    setRefreshing(true)
    showLoader(800)
    queryClient.invalidateQueries()
    setTimeout(() => setRefreshing(false), 900)
  }, [queryClient, showLoader])

  // Tarjetas de estadísticas
  const statCards = [
    {
      title: 'Total Clientes',
      value: '12',
      icon: 'people',
      color: '#3b82f6',
      gradient: ['#3b82f6', '#2563eb'],
    },
    {
      title: 'Sesiones Activas',
      value: '3',
      icon: 'time',
      color: '#f59e0b',
      gradient: ['#f59e0b', '#d97706'],
    },
    {
      title: 'Sesiones Completadas',
      value: '8',
      icon: 'checkmark-circle',
      color: '#22c55e',
      gradient: ['#22c55e', '#16a34a'],
    },
    {
      title: 'Valor Total',
      value: '$45,000',
      icon: 'cash',
      color: '#ef4444',
      gradient: ['#ef4444', '#dc2626'],
    },
  ]

  // Acciones rápidas
  const quickActions = [
    {
      title: 'Nueva Sesión',
      icon: 'add-circle',
      color: '#3b82f6',
      onPress: () => navigation.navigate('Inventarios'),
    },
    {
      title: 'Ver Clientes',
      icon: 'people',
      color: '#22c55e',
      onPress: () => navigation.navigate('Clientes'),
    },
    {
      title: 'Agenda',
      icon: 'calendar-outline',
      color: '#f59e0b',
      onPress: () => navigation.navigate('Agenda'),
    },
  ]

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      {/* Header */}
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>¡Hola, {user?.nombre || 'Usuario'}!</Text>
            <Text style={styles.subtitle}>Aquí tienes un resumen de tu actividad</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Perfil')}
          >
            <Ionicons name="person" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tarjetas de estadísticas */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Estadísticas</Text>
        <View style={styles.statsGrid}>
          {statCards.map((card, index) => (
            <TouchableOpacity key={index} style={styles.statCard}>
              <LinearGradient
                colors={card.gradient}
                style={styles.statCardGradient}
              >
                <View style={styles.statCardContent}>
                  <View style={styles.statCardIcon}>
                    <Ionicons name={card.icon} size={24} color="#ffffff" />
                  </View>
                  <View style={styles.statCardText}>
                    <Text style={styles.statCardValue}>{card.value}</Text>
                    <Text style={styles.statCardTitle}>{card.title}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Acciones rápidas */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={24} color="#ffffff" />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Actividades recientes */}
      <View style={styles.activitiesContainer}>
        <Text style={styles.sectionTitle}>Actividades Recientes</Text>
        <View style={styles.activitiesList}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#22c55e' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Sesión completada</Text>
              <Text style={styles.activityDescription}>Cliente: Tienda ABC - Valor: $15,000</Text>
              <Text style={styles.activityTime}>Hace 2 horas</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="people" size={20} color="#ffffff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Nuevo cliente agregado</Text>
              <Text style={styles.activityDescription}>Supermercado XYZ registrado</Text>
              <Text style={styles.activityTime}>Hace 4 horas</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#f59e0b' }]}>
              <Ionicons name="document-text" size={20} color="#ffffff" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Reporte generado</Text>
              <Text style={styles.activityDescription}>Balance mensual - Enero 2024</Text>
              <Text style={styles.activityTime}>Hace 6 horas</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  profileButton: {
    width: 50,
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCardIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statCardText: {
    flex: 1,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  statCardTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  activitiesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  activitiesList: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
})

export default DashboardScreen



