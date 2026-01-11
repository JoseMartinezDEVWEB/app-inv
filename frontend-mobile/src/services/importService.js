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
        // Validar que el archivo existe
        if (!file || !file.uri || !file.name) {
            throw new Error('Archivo no válido. Por favor selecciona un archivo.');
        }

        // Validar extensión del archivo
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'xls', 'pdf'].includes(extension)) {
            throw new Error('Formato de archivo no soportado. Use XLSX, XLS o PDF');
        }

        console.log('📤 Preparando envío de archivo:', file.name);

        const formData = new FormData();
        
        // React Native espera este formato específico para archivos en FormData
        formData.append('archivo', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || getMimeType(extension) || 'application/octet-stream'
        });

        if (apiKey && apiKey.trim()) {
            formData.append('apiKey', apiKey.trim());
        }

        console.log('📡 Enviando al backend...');

        // La ruta /importar está en ROUTES_PREFER_REMOTE, así que irá directamente al servidor
        // No usar transformRequest para FormData - axios lo maneja automáticamente
        const response = await api.post('/productos/generales/importar', formData, {
            headers: {
                'Accept': 'application/json',
                // No establecer Content-Type - axios lo hace automáticamente para FormData
            },
            timeout: 120000, // 2 minutos para procesamiento de archivos grandes
        });

        console.log('✅ Respuesta del servidor recibida');

        // Validar estructura de respuesta
        if (!response || !response.data) {
            throw new Error('Respuesta inválida del servidor');
        }

        if (response.data.exito !== false && response.data.datos) {
            const productos = Array.isArray(response.data.datos) 
                ? response.data.datos 
                : (response.data.datos.productos || []);
            return productos;
        } else {
            const mensajeError = response.data?.mensaje || response.data?.error || 'Error desconocido en la respuesta';
            throw new Error(mensajeError);
        }

    } catch (error) {
        console.error('❌ Error en importarProductosDesdeArchivo:', error);
        
        let mensaje = 'Error al importar archivo';
        
        // Manejar diferentes tipos de errores
        if (error.response) {
            // Error del servidor (500, 400, etc.)
            const errorData = error.response.data;
            if (typeof errorData === 'string') {
                mensaje = errorData;
            } else if (errorData?.mensaje) {
                mensaje = errorData.mensaje;
            } else if (errorData?.error) {
                mensaje = errorData.error;
            } else {
                mensaje = `Error del servidor (${error.response.status})`;
            }
            console.error('Error del servidor:', errorData);
        } else if (error.request) {
            // Error de conexión (timeout, red, etc.)
            if (error.code === 'ECONNABORTED') {
                mensaje = 'Tiempo de espera agotado. El archivo puede ser muy grande o el servidor está ocupado.';
            } else {
                mensaje = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
            }
        } else {
            // Error de configuración o validación
            mensaje = error.message || 'Error desconocido al procesar la solicitud';
        }
        
        throw new Error(mensaje);
    }
};

// Función auxiliar para obtener MIME type basado en extensión
const getMimeType = (extension) => {
    const mimeTypes = {
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'pdf': 'application/pdf',
    };
    return mimeTypes[extension?.toLowerCase()] || null;
};
