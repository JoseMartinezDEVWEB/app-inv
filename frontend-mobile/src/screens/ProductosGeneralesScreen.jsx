import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Ionicons } from '@expo/vector-icons';
import { productosApi, handleApiError } from '../services/api';
import localDb from '../services/localDb';
import { useNetInfo } from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import ProductModal from '../components/ProductModal'; // Importar el modal
import ImportModal from '../components/modals/ImportModal';
import { showMessage } from 'react-native-flash-message';

// Esqueleto de carga para las tarjetas de producto
const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <LinearGradient colors={['#e2e8f0', '#f1f5f9', '#e2e8f0']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
  </View>
);

// Tarjeta para mostrar cada producto
const ProductCard = ({ item, onEdit }) => (
  <TouchableOpacity style={styles.productCard} onPress={() => onEdit(item)}>
    <View style={styles.cardHeader}>
      <Text style={styles.productName} numberOfLines={2}>{item.nombre}</Text>
      <Text style={styles.productPrice}>${(item.precioVenta || 0).toFixed(2)}</Text>
    </View>
    <View style={styles.cardBody}>
      <Text style={styles.productDescription} numberOfLines={3}>{item.descripcion || 'Sin descripción'}</Text>
    </View>
    <View style={styles.cardFooter}>
      <View style={styles.footerItem}>
        <Ionicons name="barcode-outline" size={16} color="#64748b" />
        <Text style={styles.footerText}>{item.codigoBarras || 'N/A'}</Text>
      </View>
      <View style={styles.footerItem}>
        <Ionicons name="cube-outline" size={16} color="#64748b" />
        <Text style={styles.footerText}>Stock: {item.stock}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const ProductosGeneralesScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();
  const [isModalVisible, setModalVisible] = useState(false);
  const [isImportModalVisible, setImportModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const netInfo = useNetInfo();

  const { data, isLoading, isError, refetch } = useQuery(
    ['productos', searchTerm, netInfo.isConnected],
    async () => {
      // Si hay internet, intentar obtener de la API y guardar localmente
      if (netInfo.isConnected) {
        try {
          const response = await productosApi.getAll({ buscar: searchTerm, limite: 50, pagina: 1 });
          const productos = response.data.datos.productos;

          // Guardar en DB local para uso offline
          await localDb.guardarProductos(productos);

          return { productos };
        } catch (error) {
          console.log('⚠️ Error API, intentando local:', error.message);
          // Si falla la API, intentar local
          const productosLocales = await localDb.obtenerProductos(searchTerm);
          return { productos: productosLocales };
        }
      } else {
        // Si no hay internet, usar DB local
        console.log('📴 Modo Offline: Usando DB local');
        const productosLocales = await localDb.obtenerProductos(searchTerm);
        return { productos: productosLocales };
      }
    },
    {
      // select: (response) => response.data.datos, // Ya no es necesario porque retornamos la estructura correcta
    }
  );

  // Mutación para crear producto
  const createMutation = useMutation(productosApi.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('productos');
      showMessage({ message: 'Producto creado exitosamente', type: 'success' });
      setModalVisible(false);
    },
    onError: handleApiError,
  });

  // Mutación para actualizar producto
  const updateMutation = useMutation(({ id, data }) => productosApi.update(id, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('productos');
      showMessage({ message: 'Producto actualizado exitosamente', type: 'success' });
      setModalVisible(false);
    },
    onError: handleApiError,
  });

  const handleOpenModal = (product = null) => {
    setSelectedProduct(product);
    setModalVisible(true);
  };

  const handleSaveProduct = (productData) => {
    if (selectedProduct) {
      updateMutation.mutate({ id: selectedProduct._id, data: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const handleImportProducts = async (products) => {
    // Los productos ya vienen procesados del backend, solo necesitamos mostrarlos
    // El backend ya los ha creado/actualizado en la base de datos
    try {
      // Los productos ya están en la base de datos, solo invalidar la query
      queryClient.invalidateQueries('productos');
      showMessage({ 
        message: `Se importaron ${products.length} productos correctamente`, 
        type: 'success' 
      });
    } catch (error) {
      showMessage({ 
        message: `Error al finalizar la importación: ${error.message}`, 
        type: 'danger' 
      });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.listContainer}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Error al cargar los productos</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={data?.productos || []}
        renderItem={({ item }) => <ProductCard item={item} onEdit={handleOpenModal} />}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No se encontraron productos</Text>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>Productos Generales</Text>
          <TouchableOpacity onPress={() => setImportModalVisible(true)} style={{ padding: 5 }}>
            <Ionicons name="cloud-upload-outline" size={24} color="#1e40af" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o código..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {renderContent()}

      <TouchableOpacity style={styles.fab} onPress={() => handleOpenModal()}>
        <Ionicons name="add" size={30} color="#ffffff" />
      </TouchableOpacity>

      <ProductModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveProduct}
        product={selectedProduct}
      />

      <ImportModal
        visible={isImportModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImportProducts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  searchContainer: { padding: 20 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 15, paddingVertical: 12 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#1e293b' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 80 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#64748b', marginTop: 15, textAlign: 'center' },
  errorText: { fontSize: 16, color: '#b91c1c', marginTop: 15, textAlign: 'center' },
  retryButton: { marginTop: 20, backgroundColor: '#1e40af', paddingVertical: 10, paddingHorizontal: 25, borderRadius: 20 },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  skeletonCard: { backgroundColor: '#e2e8f0', borderRadius: 16, height: 160, marginBottom: 16, overflow: 'hidden' },
  productCard: { backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productName: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1e293b' },
  productPrice: { fontSize: 18, fontWeight: 'bold', color: '#1e40af', marginLeft: 10 },
  cardBody: { padding: 16 },
  productDescription: { fontSize: 14, color: '#475569', lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#64748b', marginLeft: 8 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e40af', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
});

export default ProductosGeneralesScreen;
