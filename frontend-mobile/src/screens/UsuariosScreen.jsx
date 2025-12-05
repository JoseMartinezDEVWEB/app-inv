import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { usuariosApi, handleApiError } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { showMessage } from 'react-native-flash-message'

const UsuariosScreen = () => {
  const { hasRole } = useAuth()
  const queryClient = useQueryClient()

  const [modalCrear, setModalCrear] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalPassword, setModalPassword] = useState(false)
  const [usuarioSel, setUsuarioSel] = useState(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', telefono: '', rol: 'colaborador' })

  const { data, isLoading, isFetching } = useQuery(
    ['usuarios-subordinados'],
    () => usuariosApi.getSubordinados(),
    { select: (r) => r.data.datos || [], enabled: hasRole('contable') || hasRole('administrador'), onError: handleApiError }
  )

  const resetForm = () => setForm({ nombre: '', email: '', password: '', telefono: '', rol: 'colaborador' })

  const createMutation = useMutation((payload) => usuariosApi.create(payload), {
    onSuccess: () => {
      showMessage({ message: 'Usuario creado', type: 'success' })
      setModalCrear(false)
      resetForm()
      queryClient.invalidateQueries(['usuarios-subordinados'])
    },
    onError: handleApiError,
  })

  const updateMutation = useMutation(({ id, data }) => usuariosApi.update(id, data), {
    onSuccess: () => {
      showMessage({ message: 'Usuario actualizado', type: 'success' })
      setModalEditar(false)
      resetForm()
      queryClient.invalidateQueries(['usuarios-subordinados'])
    },
    onError: handleApiError,
  })

  const passMutation = useMutation(({ id, password }) => usuariosApi.changePassword(id, password), {
    onSuccess: () => {
      showMessage({ message: 'Contraseña actualizada', type: 'success' })
      setModalPassword(false)
      resetForm()
    },
    onError: handleApiError,
  })

  const deleteMutation = useMutation((id) => usuariosApi.delete(id), {
    onSuccess: () => {
      showMessage({ message: 'Usuario desactivado', type: 'success' })
      queryClient.invalidateQueries(['usuarios-subordinados'])
    },
    onError: handleApiError,
  })

  const openEdit = (u) => {
    setUsuarioSel(u)
    setForm({ nombre: u.nombre, email: u.email, telefono: u.telefono || '', rol: u.rol, password: '' })
    setModalEditar(true)
  }

  const openPass = (u) => {
    setUsuarioSel(u)
    setForm((f) => ({ ...f, password: '' }))
    setModalPassword(true)
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.nombre}</Text>
        <Text style={styles.meta}>{item.email}</Text>
        <Text style={styles.meta}>Rol: {item.rol}</Text>
        <Text style={[styles.badge, item.activo ? styles.badgeActive : styles.badgeInactive]}>
          {item.activo ? 'Activo' : 'Inactivo'}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconButton}>
          <Ionicons name="create-outline" size={20} color="#1d4ed8" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openPass(item)} style={styles.iconButton}>
          <Ionicons name="key-outline" size={20} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          Alert.alert('Confirmar', '¿Desactivar este usuario?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Desactivar', style: 'destructive', onPress: () => deleteMutation.mutate(item._id) },
          ])
        }} style={styles.iconButton}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  )

  if (!hasRole('contable') && !hasRole('administrador')) {
    return (
      <View style={styles.center}> 
        <Text style={styles.info}>No tienes permisos para acceder a esta sección</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Usuarios</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalCrear(true)}>
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Crear</Text>
        </TouchableOpacity>
      </View>

      {isLoading || isFetching ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#1e40af" /></View>
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.info}>No hay usuarios subordinados</Text>}
        />
      )}

      {/* Modal Crear */}
      <Modal visible={modalCrear} animationType="slide" onRequestClose={() => setModalCrear(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Crear Usuario</Text>
          <TextInput style={styles.input} placeholder="Nombre" value={form.nombre} onChangeText={(t) => setForm({ ...form, nombre: t })} />
          <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Contraseña" value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry />
          <TextInput style={styles.input} placeholder="Teléfono" value={form.telefono} onChangeText={(t) => setForm({ ...form, telefono: t })} />
          <View style={styles.roleRow}>
            <TouchableOpacity onPress={() => setForm({ ...form, rol: 'colaborador' })} style={[styles.roleChip, form.rol === 'colaborador' ? styles.roleChipActive : null]}>
              <Text style={[styles.roleChipText, form.rol === 'colaborador' ? styles.roleChipTextActive : null]}>Colaborador</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForm({ ...form, rol: 'contador' })} style={[styles.roleChip, form.rol === 'contador' ? styles.roleChipActive : null]}>
              <Text style={[styles.roleChipText, form.rol === 'contador' ? styles.roleChipTextActive : null]}>Contador</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => setModalCrear(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => createMutation.mutate(form)} disabled={createMutation.isLoading}>
              <Text style={styles.primaryText}>{createMutation.isLoading ? 'Guardando...' : 'Crear'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Editar */}
      <Modal visible={modalEditar} animationType="slide" onRequestClose={() => setModalEditar(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Editar Usuario</Text>
          <TextInput style={styles.input} placeholder="Nombre" value={form.nombre} onChangeText={(t) => setForm({ ...form, nombre: t })} />
          <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Teléfono" value={form.telefono} onChangeText={(t) => setForm({ ...form, telefono: t })} />
          <View style={styles.roleRow}>
            <TouchableOpacity onPress={() => setForm({ ...form, rol: 'colaborador' })} style={[styles.roleChip, form.rol === 'colaborador' ? styles.roleChipActive : null]}>
              <Text style={[styles.roleChipText, form.rol === 'colaborador' ? styles.roleChipTextActive : null]}>Colaborador</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForm({ ...form, rol: 'contador' })} style={[styles.roleChip, form.rol === 'contador' ? styles.roleChipActive : null]}>
              <Text style={[styles.roleChipText, form.rol === 'contador' ? styles.roleChipTextActive : null]}>Contador</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => setModalEditar(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => updateMutation.mutate({ id: usuarioSel._id, data: { nombre: form.nombre, email: form.email, telefono: form.telefono, rol: form.rol } })} disabled={updateMutation.isLoading}>
              <Text style={styles.primaryText}>{updateMutation.isLoading ? 'Guardando...' : 'Actualizar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Password */}
      <Modal visible={modalPassword} animationType="slide" onRequestClose={() => setModalPassword(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
          <Text style={styles.info}>Usuario: {usuarioSel?.nombre}</Text>
          <TextInput style={styles.input} placeholder="Nueva contraseña" value={form.password} onChangeText={(t) => setForm({ ...form, password: t })} secureTextEntry />
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => setModalPassword(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => passMutation.mutate({ id: usuarioSel._id, password: form.password })} disabled={passMutation.isLoading}>
              <Text style={styles.primaryText}>{passMutation.isLoading ? 'Guardando...' : 'Cambiar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1e40af' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', marginLeft: 6, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 11, fontWeight: '700', marginTop: 6, overflow: 'hidden' },
  badgeActive: { backgroundColor: '#dcfce7', color: '#166534' },
  badgeInactive: { backgroundColor: '#fee2e2', color: '#991b1b' },
  actions: { justifyContent: 'center' },
  iconButton: { padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  info: { color: '#64748b', fontSize: 14 },
  modalContent: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  button: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  cancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  cancelText: { color: '#374151', fontWeight: '600' },
  primary: { backgroundColor: '#2563eb' },
  primaryText: { color: '#fff', fontWeight: '700' },
  roleRow: { flexDirection: 'row', marginBottom: 10 },
  roleChip: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: '#fff' },
  roleChipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleChipText: { color: '#374151', fontWeight: '600' },
  roleChipTextActive: { color: '#1d4ed8' },
})

export default UsuariosScreen
