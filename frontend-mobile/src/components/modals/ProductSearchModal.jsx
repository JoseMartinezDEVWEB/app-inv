import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from 'react-query';
import { productosApi } from '../../services/api';

const ProductSearchModal = ({ visible, onClose, onSelectProduct, clienteId }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Buscar tanto productos del cliente como productos generales
  const { data: clientProducts, isLoading: loadingClient, error: clientError } = useQuery(
    ['searchProductosCliente', clienteId, searchTerm],
    () => productosApi.getByClient(clienteId, { buscar: searchTerm, limite: 10 }),
    {
      select: (response) => response.data.datos?.productos || response.data.productos || [],
      enabled: Boolean(searchTerm.length > 2 && visible && clienteId),
      retry: false, // No reintentar para evitar loops
      staleTime: 30000, // Mantener datos por 30 segundos
      onError: (error) => {
        console.log('⚠️ Error buscando productos del cliente:', error.response?.status, error.message);
        // Si es 404, significa que no hay productos para este cliente, no es un error crítico
        if (error.response?.status !== 404) {
          console.error('❌ Error crítico en búsqueda de productos del cliente:', error);
        }
      }
    }
  );

  const { data: generalProducts, isLoading: loadingGeneral, error: generalError } = useQuery(
    ['searchProductosGenerales', searchTerm],
    () => productosApi.getAll({ buscar: searchTerm, limite: 10 }),
    {
      select: (response) => response.data.datos?.productos || response.data.productos || [],
      enabled: Boolean(searchTerm.length > 2 && visible),
      retry: false, // No reintentar para evitar loops
      staleTime: 30000, // Mantener datos por 30 segundos
      onError: (error) => {
        console.log('⚠️ Error buscando productos generales:', error.response?.status, error.message);
        console.error('❌ Error en búsqueda de productos generales:', error);
      }
    }
  );

  // Combinar resultados, priorizando productos del cliente
  const searchResults = React.useMemo(() => {
    try {
      const client = Array.isArray(clientProducts) ? clientProducts : [];
      const general = Array.isArray(generalProducts) ? generalProducts : [];
      
      // Marcar productos del cliente vs generales
      const clientMarked = client.map(p => ({ ...p, isClientProduct: true }));
      const generalMarked = general.map(p => ({ ...p, isClientProduct: false }));
      
      return [...clientMarked, ...generalMarked];
    } catch (error) {
      console.log('⚠️ Error combinando resultados de búsqueda:', error.message);
      return [];
    }
  }, [clientProducts, generalProducts]);

  const isLoading = loadingClient || loadingGeneral;

  useEffect(() => {
    if (!visible) {
      setSearchTerm('');
    }
  }, [visible]);

  const handleSelect = (product) => {
    onSelectProduct(product);
    onClose();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.nombre}</Text>
          {!item.isClientProduct && (
            <View style={styles.generalBadge}>
              <Text style={styles.generalBadgeText}>General</Text>
            </View>
          )}
        </View>
        <Text style={styles.productSku}>
          {item.isClientProduct ? (item.sku || 'Sin SKU') : (item.codigoBarras || 'Sin código')}
        </Text>
      </View>
      <Text style={styles.productCost}>
        ${(item.isClientProduct ? item.costo : item.costoBase || 0).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Buscar Producto</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={30} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Escribe el nombre del producto..."
              placeholderTextColor="#94a3b8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoFocus
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#1e40af" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={searchResults || []}
              renderItem={renderItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {(clientError || generalError) && searchTerm.length > 2 
                      ? 'Error al buscar productos. Intenta de nuevo.' 
                      : searchTerm.length > 2 
                        ? 'No se encontraron productos.' 
                        : 'Escribe al menos 3 letras para buscar.'}
                  </Text>
                  {(clientError || generalError) && (
                    <Text style={styles.errorText}>
                      {clientError && !generalError 
                        ? 'Buscando solo en productos generales...' 
                        : 'Verifica tu conexión a internet.'}
                    </Text>
                  )}
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { height: '85%', backgroundColor: '#f8fafc', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#1e293b' },
  listContainer: { paddingBottom: 20 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productInfo: { flex: 1 },
  productHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1e293b', flex: 1 },
  generalBadge: { backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  generalBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#ffffff' },
  productSku: { fontSize: 13, color: '#64748b', marginTop: 2 },
  productCost: { fontSize: 16, fontWeight: 'bold', color: '#1e40af' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#64748b' },
  errorText: { fontSize: 14, color: '#ef4444', marginTop: 8, textAlign: 'center' },
});

export default ProductSearchModal;
