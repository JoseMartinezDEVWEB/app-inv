import { productosApi, handleApiResponse, handleApiError } from './api';
import api from './api';

/**
 * Importa productos desde un archivo XLSX o PDF usando el backend Python
 * Esta función envía el archivo al backend que lo procesa con Python e IA
 * 
 * @param {Object} file - Objeto de archivo de expo-document-picker con { uri, name, mimeType }
 * @param {string} apiKey - API Key de Google Gemini (opcional, solo para PDFs complejos)
 * @returns {Promise<Array>} Array de productos procesados
 */
export const importarProductosDesdeArchivo = async (file, apiKey = null) => {
    try {
        console.log('📤 Preparando envío de archivo:', file.name);

        const formData = new FormData();
        
        // React Native espera este formato específico para archivos en FormData
        formData.append('archivo', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream' // Fallback si no hay mimeType
        });

        if (apiKey) {
            formData.append('apiKey', apiKey);
        }

        console.log('📡 Enviando al backend...');

        // Usar la instancia de axios 'api' que ya tiene la configuración base
        // Nota: No poner 'Content-Type': 'multipart/form-data' manualmente en axios,
        // axios lo hace automáticamente y si lo fuerzas puede fallar el boundary.
        const response = await api.post('/productos/generales/importar', formData, {
            headers: {
                'Accept': 'application/json',
                // Dejar que axios maneje el Content-Type multipart
            },
            transformRequest: (data, headers) => {
                // Evitar que axios transforme el FormData
                return data;
            },
        });

        console.log('✅ Respuesta del servidor:', response.data);

        if (response.data && response.data.exito) {
            return response.data.datos || [];
        } else {
            throw new Error(response.data?.mensaje || 'Error desconocido en la respuesta');
        }

    } catch (error) {
        console.error('❌ Error en importarProductosDesdeArchivo:', error);
        
        let mensaje = 'Error al importar archivo';
        
        if (error.response) {
            // Error del servidor (500, 400, etc.)
            console.error('Data error:', error.response.data);
            mensaje = error.response.data?.mensaje || `Error del servidor (${error.response.status})`;
        } else if (error.request) {
            // Error de conexión
            mensaje = 'No se pudo conectar con el servidor. Verifica tu conexión.';
        } else {
            // Error de configuración
            mensaje = error.message;
        }
        
        throw new Error(mensaje);
    }
};
