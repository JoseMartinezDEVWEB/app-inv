import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Modal para agregar cantidad y costo después de escanear código de barras
 */
const BarcodeProductModal = ({ 
  visible, 
  onClose, 
  producto, 
  codigoBarras,
  onConfirm,
  costoInicial = '',
  cantidadInicial = '1'
}) => {
  const [cantidad, setCantidad] = useState(cantidadInicial);
  const [costo, setCosto] = useState(costoInicial);

  useEffect(() => {
    if (visible && producto) {
      // Si el producto tiene costo, usarlo como valor inicial
      const costoProducto = producto.costo || producto.costoBase || '';
      setCosto(costoProducto ? String(costoProducto) : '');
      setCantidad(cantidadInicial || '1');
    }
  }, [visible, producto, cantidadInicial]);

  const handleConfirm = () => {
    const cantidadNum = parseFloat(cantidad) || 1;
    const costoNum = parseFloat(costo) || 0;

    if (cantidadNum <= 0) {
      return; // Validación básica - el componente padre puede manejar mejor
    }

    onConfirm({
      cantidad: cantidadNum,
      costo: costoNum,
    });
  };

  const handleClose = () => {
    setCantidad('1');
    setCosto('');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="barcode" size={24} color="#3b82f6" />
              <Text style={styles.title}>Agregar Producto</Text>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close-circle" size={28} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Información del producto */}
            {producto && (
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{producto.nombre}</Text>
                {codigoBarras && (
                  <Text style={styles.productCode}>Código: {codigoBarras}</Text>
                )}
                {producto.sku && (
                  <Text style={styles.productSku}>SKU: {producto.sku}</Text>
                )}
                {(producto.costo || producto.costoBase) && (
                  <Text style={styles.productCost}>
                    Costo sugerido: ${(producto.costo || producto.costoBase || 0).toFixed(2)}
                  </Text>
                )}
              </View>
            )}

            {/* Campos de entrada */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cantidad *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  keyboardType="numeric"
                  value={cantidad}
                  onChangeText={setCantidad}
                  autoFocus
                  selectTextOnFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Costo por unidad</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={costo}
                  onChangeText={setCosto}
                />
              </View>

              {/* Cálculo total */}
              {cantidad && costo && (
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>
                    ${((parseFloat(cantidad) || 0) * (parseFloat(costo) || 0)).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Botones */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Ionicons name="add-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.confirmButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  productInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  productCode: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  productCost: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default BarcodeProductModal;

