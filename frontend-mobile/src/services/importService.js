import * as FileSystem from 'expo-file-system';
import { read, utils } from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Parsea un archivo Excel desde una URI local
 */
export const parseExcelMobile = async (uri) => {
    try {
        const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const workbook = read(b64, { type: 'base64' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
        return jsonData;
    } catch (error) {
        console.error("Error parsing Excel on mobile:", error);
        throw new Error("No se pudo leer el archivo Excel.");
    }
};

/**
 * Procesa datos con IA (reutilizando lógica similar a web)
 */
export const processWithAIMobile = async (rawData, apiKey) => {
    // 1. Fallback simple
    if (Array.isArray(rawData) && rawData.length > 0) {
        const headers = rawData[0].map(h => String(h).toLowerCase());
        const hasName = headers.some(h => h.includes('nombre'));

        // Si no hay key, o falla, intentaremos mapeo simple en la UI o aquí
    }

    if (!apiKey) throw new Error("Se requiere API Key de Gemini.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        // Tomamos muestra
        const sample = rawData.slice(0, 15);

        const prompt = `
      Analiza esta muestra de Excel (JSON array) desde una app móvil:
      ${JSON.stringify(sample)}
      
      Identifica índices de columnas para: Nombre, Costo, Código de Barras.
      Responde JSON: {"nombreIndex": number, "costoIndex": number, "codigoIndex": number}
    `;

        const resultStructure = await model.generateContent(prompt);
        const structureText = resultStructure.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const structure = JSON.parse(structureText);

        if (structure && typeof structure.nombreIndex === 'number') {
            return rawData.slice(1).map(row => ({
                nombre: row[structure.nombreIndex],
                costoBase: parseFloat(String(row[structure.costoIndex]).replace(/[^0-9.]/g, '')) || 0,
                codigoBarras: row[structure.codigoIndex] ? String(row[structure.codigoIndex]) : null,
                categoria: 'Productos Generales'
            })).filter(p => p.nombre);
        }

        throw new Error("No se pudo detectar la estructura del archivo.");

    } catch (error) {
        console.log("Error IA Mobile:", error);
        throw new Error("Error en procesamiento inteligente. Verifica tu API Key o el formato del archivo.");
    }
};
