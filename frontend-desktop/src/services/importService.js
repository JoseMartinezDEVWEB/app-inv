import { read, utils } from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker para PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Parsea un archivo Excel y devuelve un array de objetos
 */
export const parseExcel = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = read(data, { type: 'array' });

                // Tomamos la primera hoja
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convertimos a JSON
                const jsonData = utils.sheet_to_json(worksheet, { header: 1 });

                // Estructura básica: asumimos que las filas son productos
                // Intentaremos detectar cabeceras o usar IA para limpiar después
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Extrae texto de un PDF
 */
export const parsePDF = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }

                resolve(fullText);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Procesa datos crudos (texto o array) usando Gemini para estructurarlos
 */
export const processWithAI = async (rawData, apiKey) => {
    // 1. Fallback: Si es un array de Excel y tiene cabeceras obvias, intentar mapeo directo
    if (Array.isArray(rawData) && rawData.length > 0) {
        const headers = rawData[0].map(h => String(h).toLowerCase());
        const hasName = headers.some(h => h.includes('nombre') || h.includes('producto') || h.includes('descripcion'));
        const hasCost = headers.some(h => h.includes('costo') || h.includes('precio') || h.includes('valor'));

        // Si parece muy estructurado, y no hay API Key, o si fallamos luego, podemos usar esto.
        // Por ahora, seguimos con la lógica de AI si hay API Key, pero mejoramos el prompt.
    }

    if (!apiKey) throw new Error("API Key de Gemini es requerida para el procesamiento inteligente. Obtén una gratis.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        let prompt = "";

        if (typeof rawData === 'string') {
            // PDF / Texto
            prompt = `
        Analiza el siguiente texto de un inventario. Extrae productos en JSON array.
        Campos: nombre, costoBase (solo numero), codigoBarras (string o null).
        Categoria: "Productos Generales".
        
        Texto (max 30k chars):
        ${rawData.substring(0, 30000)}
      `;
        } else {
            // Excel (Array)
            // Optimizamos: Enviamos solo las primeras 50 filas para detectar estructura, 
            // o enviamos todo si es pequeño. Gemini tiene límite de tokens.
            // ESTRATEGIA MEJORADA: Enviamos una muestra para que deduzca el mapeo, o le pedimos que procese.
            // Dado el límite de salida, procesar TODO el archivo con IA es arriesgado para listas grandes.
            // Mejor enfoque: Pedirle a la IA que identifique los INDICES de las columnas.

            const sample = rawData.slice(0, 10); // Cabecera + 9 filas

            prompt = `
        Analiza esta muestra de datos de Excel (filas y columnas):
        ${JSON.stringify(sample)}
        
        Identifica qué índice de columna corresponde a:
        - Nombre interactivo del producto
        - Costo/Precio
        - Código de Barras (si existe)
        
        Responde SOLO con un JSON con los índices (0-based) o null si no existe.
        Ejemplo: {"nombreIndex": 1, "costoIndex": 4, "codigoIndex": 0}
      `;

            // Primera llamada para entender estructura
            const resultStructure = await model.generateContent(prompt);
            const structureText = resultStructure.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

            let structure;
            try {
                structure = JSON.parse(structureText);
            } catch (e) {
                console.warn("Fallo al parsear estructura, intentando método bruto...");
            }

            if (structure && typeof structure.nombreIndex === 'number') {
                // Mapeo manual basado en la inteligencia de columnas
                return rawData.slice(1).map(row => ({
                    nombre: row[structure.nombreIndex],
                    costoBase: parseFloat(String(row[structure.costoIndex]).replace(/[^0-9.]/g, '')) || 0,
                    codigoBarras: row[structure.codigoIndex] ? String(row[structure.codigoIndex]) : null,
                    categoria: 'Productos Generales'
                })).filter(p => p.nombre); // Filtrar filas vacías
            }

            // Si falla la estrategia de índices, volvemos a la estrategia "bruta" con pocas filas
            prompt = `
        Extrae productos de este array JSON.
        Campos: nombre, costoBase, codigoBarras, categoria="Productos Generales".
        
        Datos:
        ${JSON.stringify(rawData.slice(0, 40))}
      `;
        }

        // Ejecucion para PDF o fallback de Excel
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error detallado IA:", error);
        let msg = "Error en el procesamiento IA.";
        if (error.message?.includes('API key')) msg = "API Key inválida o expirada.";
        if (error.message?.includes('candidate')) msg = "La IA no pudo generar una respuesta válida (bloqueo de seguridad o formato).";

        throw new Error(`${msg} Detalles: ${error.message}`);
    }
};
