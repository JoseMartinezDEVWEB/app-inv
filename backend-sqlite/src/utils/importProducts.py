#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para importar productos desde archivos XLSX o PDF
Versión mejorada y robusta para integración con backend Node.js
"""

import sys
import json
import os
import pandas as pd
import io
from typing import List, Dict, Any
import traceback

# Configurar encoding para salida estándar (importante para Windows/Node.js)
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def limpiar_texto(texto: Any) -> str:
    """Limpia y normaliza texto"""
    if pd.isna(texto) or texto is None:
        return ""
    return str(texto).strip()

def parsear_numero(valor: Any) -> float:
    """Convierte un valor a número, manejando diferentes formatos"""
    if pd.isna(valor) or valor is None or valor == '':
        return 0.0
    
    if isinstance(valor, (int, float)):
        return float(valor)
        
    s_valor = str(valor).strip()
    # Eliminar símbolos de moneda y separadores de miles
    s_valor = s_valor.replace('$', '').replace('€', '').replace(',', '')
    
    try:
        return float(s_valor)
    except ValueError:
        return 0.0

def procesar_excel(archivo_path: str) -> List[Dict[str, Any]]:
    """Procesa un archivo Excel y retorna una lista de diccionarios"""
    try:
        # Leer Excel
        df = pd.read_excel(archivo_path, dtype=str) # Leer todo como string para evitar conversiones automáticas erróneas
        
        # Normalizar nombres de columnas (minusculas, sin acentos, sin espacios extra)
        df.columns = df.columns.astype(str).str.strip().str.lower()
        
        # Mapeo de posibles nombres de columnas a nuestro esquema
        mapa_columnas = {
            'nombre': ['nombre', 'producto', 'descripción', 'descripcion', 'articulo', 'item'],
            'codigo_barras': ['codigo', 'código', 'barras', 'barcode', 'ean', 'sku', 'referencia'],
            'precio': ['precio', 'costo', 'valor', 'pvp', 'precio venta', 'precio_venta', 'costobase'],
            'categoria': ['categoria', 'categoría', 'grupo', 'familia', 'departamento'],
            'cantidad': ['cantidad', 'stock', 'existencia', 'inventario', 'unidades']
        }
        
        # Identificar columnas
        columnas_encontradas = {}
        for campo_destino, posibles_nombres in mapa_columnas.items():
            for posible in posibles_nombres:
                match = next((col for col in df.columns if posible in col), None)
                if match:
                    columnas_encontradas[campo_destino] = match
                    break
        
        # Si no encontramos columna nombre, es crítico
        if 'nombre' not in columnas_encontradas:
            # Intentar usar la primera columna de texto como nombre si no se encontró explícitamente
            if len(df.columns) > 0:
                columnas_encontradas['nombre'] = df.columns[0]
            else:
                return {'error': 'No se pudo identificar la columna de Nombre del producto'}

        productos = []
        
        for _, row in df.iterrows():
            nombre = limpiar_texto(row.get(columnas_encontradas.get('nombre')))
            
            # Saltar filas vacías
            if not nombre:
                continue
            
            precio = parsear_numero(row.get(columnas_encontradas.get('precio'))) if 'precio' in columnas_encontradas else 0
            cantidad = int(parsear_numero(row.get(columnas_encontradas.get('cantidad')))) if 'cantidad' in columnas_encontradas else 1
                
            producto = {
                'nombre': nombre,
                'codigoBarras': limpiar_texto(row.get(columnas_encontradas.get('codigo_barras'))) if 'codigo_barras' in columnas_encontradas else '',
                'cantidad': cantidad,
                'precio': precio,
                'costoBase': precio,  # Mapear precio a costoBase para el backend
                'categoria': limpiar_texto(row.get(columnas_encontradas.get('categoria'))) if 'categoria' in columnas_encontradas else 'General'
            }

            productos.append(producto)
            
        return productos

    except Exception as e:
        return {'error': f'Error procesando Excel: {str(e)}'}

def procesar_pdf_con_gemini(archivo_path: str, api_key: str) -> List[Dict[str, Any]]:
    """
    Procesa un PDF usando Gemini AI para extraer productos con prompt estricto JSON
    """
    try:
        import pdfplumber
        import google.generativeai as genai
        
        # Extraer texto del PDF primero
        texto_completo = ""
        with pdfplumber.open(archivo_path) as pdf:
            for page in pdf.pages:
                texto_pagina = page.extract_text()
                if texto_pagina:
                    texto_completo += texto_pagina + "\n"
        
        if not texto_completo or len(texto_completo.strip()) < 10:
            return {'error': 'No se pudo extraer texto del PDF. El archivo podría estar escaneado o protegido.'}
        
        # Configurar Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        
        # Prompt estricto para obtener solo JSON
        system_prompt = """Eres un asistente que extrae información de inventarios de documentos. 
Analiza el siguiente texto de un inventario y extrae todos los productos listados.

IMPORTANTE: Debes responder ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin explicaciones.

El formato de respuesta debe ser exactamente:
[
  {
    "nombre": "Nombre del producto",
    "codigoBarras": "código o SKU si está disponible",
    "cantidad": número,
    "precio": número
  }
]

Si no encuentras información completa para algún campo, usa valores por defecto:
- codigoBarras: "" (string vacío)
- cantidad: 1
- precio: 0

Responde SOLO con el array JSON, sin texto adicional."""
        
        prompt = f"{system_prompt}\n\nTexto del documento:\n{texto_completo[:8000]}"  # Limitar a 8000 chars
        
        # Llamar a Gemini
        response = model.generate_content(prompt)
        
        # Extraer JSON de la respuesta (puede venir con markdown code blocks)
        respuesta_texto = response.text.strip()
        
        # Eliminar markdown code blocks si existen
        if respuesta_texto.startswith('```'):
            # Remover ```json o ``` al inicio y ``` al final
            lineas = respuesta_texto.split('\n')
            lineas = [l for l in lineas if not l.strip().startswith('```')]
            respuesta_texto = '\n'.join(lineas)
        
        # Parsear JSON
        try:
            productos = json.loads(respuesta_texto)
            
            # Validar que sea una lista
            if not isinstance(productos, list):
                return {'error': 'La respuesta de la IA no es un array válido'}
            
            # Normalizar productos al formato esperado
            productos_normalizados = []
            for p in productos:
                producto_normalizado = {
                    'nombre': limpiar_texto(p.get('nombre', '')),
                    'codigoBarras': limpiar_texto(p.get('codigoBarras', '')),
                    'cantidad': int(parsear_numero(p.get('cantidad', 1))),
                    'precio': parsear_numero(p.get('precio', 0)),
                    'categoria': 'General',
                    'costoBase': parsear_numero(p.get('precio', 0))  # Mapear precio a costoBase
                }
                
                if producto_normalizado['nombre']:
                    productos_normalizados.append(producto_normalizado)
            
            if not productos_normalizados:
                return {'error': 'No se encontraron productos válidos en el documento'}
            
            return productos_normalizados
            
        except json.JSONDecodeError as e:
            return {'error': f'Error al parsear respuesta de la IA como JSON: {str(e)}. Respuesta recibida: {respuesta_texto[:200]}'}
        
    except ImportError as e:
        if 'google.generativeai' in str(e):
            return {'error': 'Librería google-generativeai no instalada. Instala con: pip install google-generativeai'}
        return {'error': f'Librería requerida no instalada: {str(e)}'}
    except Exception as e:
        return {'error': f'Error procesando PDF con Gemini: {str(e)}'}

def procesar_pdf(archivo_path: str, api_key: str = None) -> List[Dict[str, Any]]:
    """
    Procesamiento de PDF: Si hay API key, usa Gemini. Si no, usa extracción básica con pdfplumber.
    """
    # Si hay API key, usar Gemini
    if api_key and api_key.strip():
        resultado = procesar_pdf_con_gemini(archivo_path, api_key.strip())
        if isinstance(resultado, list):
            return resultado
        # Si falló Gemini, intentar método básico como fallback
        if 'error' in resultado:
            pass  # Continuar con método básico
    
    # Método básico con pdfplumber (fallback o cuando no hay API key)
    try:
        import pdfplumber
        productos = []
        
        with pdfplumber.open(archivo_path) as pdf:
            for page in pdf.pages:
                # Intentar extraer tablas
                tablas = page.extract_tables()
                
                if tablas:
                    for tabla in tablas:
                        if not tabla: continue
                        
                        header = [str(c).lower().strip() if c else '' for c in tabla[0]]
                        
                        # Buscar índices
                        idx_nombre = -1
                        idx_precio = -1
                        idx_codigo = -1
                        
                        for i, col in enumerate(header):
                            if 'nombre' in col or 'descrip' in col or 'articulo' in col: idx_nombre = i
                            elif 'precio' in col or 'valor' in col or 'costo' in col: idx_precio = i
                            elif 'cod' in col or 'ref' in col or 'sku' in col: idx_codigo = i
                        
                        start_idx = 1 if (idx_nombre != -1 or idx_precio != -1) else 0
                        
                        for fila in tabla[start_idx:]:
                            if not fila: continue
                            
                            p_nombre = ""
                            p_precio = 0
                            p_codigo = ""
                            
                            if idx_nombre != -1 and len(fila) > idx_nombre:
                                p_nombre = limpiar_texto(fila[idx_nombre])
                            elif len(fila) >= 2:
                                p_nombre = limpiar_texto(fila[1])
                            elif len(fila) == 1:
                                p_nombre = limpiar_texto(fila[0])
                                
                            if not p_nombre: continue

                            if idx_precio != -1 and len(fila) > idx_precio:
                                p_precio = parsear_numero(fila[idx_precio])
                            elif len(fila) >= 3:
                                for cell in reversed(fila):
                                    try:
                                        val = parsear_numero(cell)
                                        if val > 0: 
                                            p_precio = val
                                            break
                                    except: continue
                            
                            if idx_codigo != -1 and len(fila) > idx_codigo:
                                p_codigo = limpiar_texto(fila[idx_codigo])
                            elif len(fila) >= 1:
                                possible_code = limpiar_texto(fila[0])
                                if len(possible_code) < 20 and any(c.isdigit() for c in possible_code):
                                    p_codigo = possible_code

                            productos.append({
                                'nombre': p_nombre,
                                'codigoBarras': p_codigo,
                                'cantidad': 1,
                                'precio': p_precio,
                                'categoria': 'General',
                                'costoBase': p_precio  # Mapear precio a costoBase
                            })

        if not productos:
            return {'error': 'No se pudieron extraer productos del PDF. Intenta usar una API Key de Gemini para PDFs complejos.'}
            
        return productos

    except ImportError:
        return {'error': 'Librería pdfplumber no instalada en el servidor'}
    except Exception as e:
        return {'error': f'Error procesando PDF: {str(e)}'}

def main():
    """Función principal de entrada"""
    if len(sys.argv) < 3:
        print(json.dumps({'exito': False, 'mensaje': 'Argumentos insuficientes'}))
        sys.exit(1)
        
    tipo = sys.argv[1].lower()
    archivo = sys.argv[2]
    api_key = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Validar archivo
    if not os.path.exists(archivo):
        print(json.dumps({'exito': False, 'mensaje': f'Archivo no encontrado: {archivo}'}))
        sys.exit(1)
        
    resultado = []
    
    try:
        if tipo in ['xlsx', 'xls']:
            resultado = procesar_excel(archivo)
        elif tipo == 'pdf':
            resultado = procesar_pdf(archivo, api_key)
        else:
            resultado = {'error': 'Formato no soportado. Use XLSX, XLS o PDF'}
            
        # Verificar si el resultado es un dict de error
        if isinstance(resultado, dict) and 'error' in resultado:
            # Imprimir JSON de error
            print(json.dumps({'exito': False, 'mensaje': resultado['error']}))
        else:
            # Validar que sea una lista
            if not isinstance(resultado, list):
                print(json.dumps({'exito': False, 'mensaje': 'Formato de respuesta inválido'}))
                sys.exit(1)
            
            # Imprimir JSON de éxito
            print(json.dumps({'exito': True, 'productos': resultado}, ensure_ascii=False))
            
    except Exception as e:
        # Capturar cualquier error no controlado
        tb = traceback.format_exc()
        print(json.dumps({'exito': False, 'mensaje': f'Error interno: {str(e)}', 'trace': tb}))
        sys.exit(1)

if __name__ == '__main__':
    main()
