import { productosApi, handleApiResponse, handleApiError } from './api';
import * as FileSystem from 'expo-file-system';

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
        // Convertir el archivo a FormData para enviarlo al backend
        const formData = new FormData();
        
        // Leer el archivo como blob/base64 y convertirlo a formato que el backend pueda procesar
        const fileUri = file.uri;
        const fileName = file.name || 'archivo.xlsx';
        
        // Determinar el tipo MIME basado en la extensión del archivo
        let fileType = file.mimeType;
        if (!fileType) {
            const parts = fileName.split('.');
            const ext = parts.length > 0 ? parts[parts.length - 1].toLowerCase() : '';
            if (ext === 'xlsx') {
                fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (ext === 'xls') {
                fileType = 'application/vnd.ms-excel';
            } else if (ext === 'pdf') {
                fileType = 'application/pdf';
            } else {
                fileType = 'application/octet-stream';
            }
        }
        
        // Crear objeto de archivo para FormData (formato React Native)
        formData.append('archivo', {
            uri: fileUri,
            type: fileType,
            name: fileName,
        });
        
        if (apiKey) {
            formData.append('apiKey', apiKey);
        }

        // Llamar al endpoint del backend
        const response = await productosApi.importarDesdeArchivo(formData, apiKey);
        const resultado = handleApiResponse(response);
        
        // El backend devuelve los productos ya procesados
        return resultado.productos || [];
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

// Funciones legacy para compatibilidad (ahora se usa el backend)
export const parseExcelMobile = async (uri) => {
    // Esta función ya no se usa, pero se mantiene por compatibilidad
    console.warn('parseExcelMobile está deprecado. Use importarProductosDesdeArchivo');
    return [];
};

/**
 * Procesa datos crudos (texto o array) usando Gemini para estructurarlos
 * DEPRECADO: Ahora se usa el backend Python que procesa todo
 */
export const processWithAIMobile = async (rawData, apiKey) => {
    // Esta función ya no se usa, pero se mantiene por compatibilidad
    console.warn('processWithAIMobile está deprecado. Use importarProductosDesdeArchivo');
    return [];
};
