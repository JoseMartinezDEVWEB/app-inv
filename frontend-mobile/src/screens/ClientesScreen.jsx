import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { clientesApi, handleApiError } from '../services/api';
import { showMessage } from 'react-native-flash-message';
import { LinearGradient } from 'expo-linear-gradient';
import ClienteModal from '../components/ClienteModal';
import ImportarPDFModal from '../components/ImportarPDFModal';

// --- Componentes Internos ---

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <LinearGradient
      colors={['#e2e8f0', '#f1f5f9', '#e2e8f0']}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    />
  </View>
);

const ClienteCard = ({ item, onEdit, onDelete, onView }) => (
  <View style={styles.clienteCard}>
    <View style={styles.cardTopRow}>
      <View style={styles.clienteInfo}>
        <Text style={styles.clienteNombre}>{item.nombre}</Text>
        <Text style={styles.clienteTelefono}>{item.telefono || 'Sin teléfono'}</Text>
      </View>
      <View style={[styles.statusIndicator, { backgroundColor: item.activo ? '#22c55e' : '#ef4444' }]} />
    </View>
    <Text style={styles.clienteDireccion} numberOfLines={2}>{item.direccion || 'Sin dirección'}</Text>
    <View style={styles.cardBottomRow}>
      <View style={styles.statItem}>
        <Ionicons name="archive-outline" size={16} color="#475569" />
        <Text style={styles.statText}>{item.estadisticas?.totalInventarios || 0} Inventarios</Text>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => onView(item)}>
          <Ionicons name="eye-outline" size={20} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)}>
          <Ionicons name="create-outline" size={20} color="#10b981" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// --- Pantalla Principal ---

const ClientesScreen = ({ navigation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [isViewModalVisible, setViewModalVisible] = useState(false);
  const [isImportarPDFModalVisible, setImportarPDFModalVisible] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const queryClient = useQueryClient();

  const { data: clientesData, isLoading, isError, refetch } = useQuery(
    ['clientes', searchTerm],
    () => clientesApi.getAll({ buscar: searchTerm, limite: 50, pagina: 1 }),
    { 
      select: (response) => response.data.datos, 
    }
  );

  const createMutation = useMutation(clientesApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('clientes');
      showMessage({ message: 'Cliente creado exitosamente', type: 'success' });
      setModalVisible(false);
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation(({ id, data }) => clientesApi.update(id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('clientes');
      showMessage({ message: 'Cliente actualizado exitosamente', type: 'success' });
      setModalVisible(false);
    },
    onError: handleApiError,
  });

  const deleteMutation = useMutation(clientesApi.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('clientes');
      showMessage({ message: 'Cliente eliminado exitosamente', type: 'success' });
    },
    onError: handleApiError,
  });

  const handleOpenModal = (cliente = null) => {
    setSelectedCliente(cliente);
    setModalVisible(true);
  };

  const handleViewCliente = (cliente) => {
    setSelectedCliente(cliente);
    setViewModalVisible(true);
  };

  const handleOpenImportarPDF = () => {
    setViewModalVisible(false);
    setImportarPDFModalVisible(true);
  };

  const handleSaveCliente = (clienteData) => {
    if (selectedCliente) {
      updateMutation.mutate({ id: selectedCliente._id, data: clienteData });
    } else {
      createMutation.mutate(clienteData);
    }
  };

  const handleDelete = (cliente) => {
    Alert.alert(
      'Eliminar Cliente',
      `¿Estás seguro de eliminar a ${cliente.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(cliente._id) },
      ]
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <View style={styles.listContainer}>{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</View>;
    }
    if (isError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Error al cargar los clientes</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <FlatList
        data={clientesData?.datos || []}
        renderItem={({ item }) => (
          <ClienteCard 
            item={item} 
            onEdit={handleOpenModal} 
            onDelete={handleDelete}
            onView={handleViewCliente}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No se encontraron clientes</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => handleOpenModal()}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar clientes..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {renderContent()}

      <ClienteModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveCliente}
        cliente={selectedCliente}
      />

      {/* Modal de detalles del cliente */}
      <Modal
        visible={isViewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.viewModalContainer}>
            <View style={styles.viewModalHeader}>
              <Text style={styles.viewModalTitle}>Detalles del Cliente</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.viewModalContent}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Nombre</Text>
                <Text style={styles.detailValue}>{selectedCliente?.nombre}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Teléfono</Text>
                <Text style={styles.detailValue}>{selectedCliente?.telefono || 'Sin teléfono'}</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Dirección</Text>
                <Text style={styles.detailValue}>{selectedCliente?.direccion || 'Sin dirección'}</Text>
              </View>

              {selectedCliente?.notas && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Notas</Text>
                  <Text style={styles.detailValue}>{selectedCliente.notas}</Text>
                </View>
              )}

              <View style={styles.separator} />

              <TouchableOpacity
                style={styles.importPDFButton}
                onPress={handleOpenImportarPDF}
              >
                <Ionicons name="document-text" size={20} color="#ffffff" />
                <Text style={styles.importPDFButtonText}>
                  Importar Inventario desde PDF
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para importar PDF */}
      <ImportarPDFModal
        visible={isImportarPDFModalVisible}
        onClose={() => {
          setImportarPDFModalVisible(false);
          setSelectedCliente(null);
        }}
        cliente={selectedCliente}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  addButton: { width: 40, height: 40, backgroundColor: '#3b82f6', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { padding: 20 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 15, paddingVertical: 12 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#1e293b' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  clienteCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  clienteInfo: { flex: 1 },
  clienteNombre: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  clienteTelefono: { fontSize: 14, color: '#64748b', marginTop: 4 },
  statusIndicator: { width: 10, height: 10, borderRadius: 5, marginLeft: 10 },
  clienteDireccion: { fontSize: 14, color: '#475569', marginBottom: 12, lineHeight: 20 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, marginTop: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 14, color: '#475569', marginLeft: 6 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  viewModalContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  viewModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  viewModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  viewModalContent: { padding: 20 },
  detailItem: { marginBottom: 20 },
  detailLabel: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  detailValue: { fontSize: 16, color: '#1e293b' },
  separator: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },
  importPDFButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, gap: 8 },
  importPDFButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#64748b', marginTop: 15, textAlign: 'center' },
  errorText: { fontSize: 16, color: '#b91c1c', marginTop: 15, textAlign: 'center' },
  retryButton: { marginTop: 20, backgroundColor: '#1e40af', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20 },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  skeletonCard: { backgroundColor: '#e2e8f0', borderRadius: 15, height: 120, marginBottom: 15, overflow: 'hidden' },
});

export default ClientesScreen;
