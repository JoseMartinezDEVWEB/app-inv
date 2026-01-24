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
        # Leer Excel - intentar todas las hojas si hay múltiples
        excel_file = pd.ExcelFile(archivo_path)
        df = None
        
        # Intentar leer la primera hoja que tenga datos
        for sheet_name in excel_file.sheet_names:
            try:
                temp_df = pd.read_excel(archivo_path, sheet_name=sheet_name, dtype=str, header=None)
                # Verificar si tiene al menos 2 filas (encabezado + datos)
                if len(temp_df) > 1:
                    # Intentar detectar si la primera fila es encabezado
                    primera_fila = temp_df.iloc[0].astype(str).str.lower().str.strip()
                    # Si la primera fila parece tener nombres de columnas (texto, no números)
                    if primera_fila.str.contains('nombre|producto|descrip|articulo|item|precio|costo|valor', case=False, na=False).any():
                        df = pd.read_excel(archivo_path, sheet_name=sheet_name, dtype=str, header=0)
                    else:
                        # Si no parece encabezado, usar la primera fila como datos
                        df = temp_df
                        df.columns = [f'Columna_{i+1}' for i in range(len(df.columns))]
                    break
            except:
                continue
        
        # Si no se encontró ninguna hoja válida, intentar leer la primera hoja directamente
        if df is None or len(df) == 0:
            df = pd.read_excel(archivo_path, dtype=str)
        
        # Si el DataFrame está vacío
        if df is None or len(df) == 0:
            return {'error': 'El archivo Excel está vacío o no contiene datos'}
        
        # Normalizar nombres de columnas (minusculas, sin acentos, sin espacios extra)
        df.columns = df.columns.astype(str).str.strip().str.lower()
        
        # Mapeo de posibles nombres de columnas a nuestro esquema (más amplio)
        mapa_columnas = {
            'nombre': ['nombre', 'producto', 'descripción', 'descripcion', 'articulo', 'item', 'product', 'desc', 'detalle'],
            'codigo_barras': ['codigo', 'código', 'barras', 'barcode', 'ean', 'sku', 'referencia', 'ref', 'cod'],
            'precio': ['precio', 'costo', 'valor', 'pvp', 'precio venta', 'precio_venta', 'costobase', 'costo base', 'precio unitario', 'unitario'],
            'categoria': ['categoria', 'categoría', 'grupo', 'familia', 'departamento', 'tipo', 'clase'],
            'cantidad': ['cantidad', 'stock', 'existencia', 'inventario', 'unidades', 'qty', 'qty.', 'cant']
        }
        
        # Identificar columnas (búsqueda más flexible)
        columnas_encontradas = {}
        for campo_destino, posibles_nombres in mapa_columnas.items():
            for posible in posibles_nombres:
                # Buscar coincidencias exactas o parciales
                matches = [col for col in df.columns if posible in col or col in posible]
                if matches:
                    columnas_encontradas[campo_destino] = matches[0]
                    break
        
        # Si no encontramos columna nombre, intentar estrategias alternativas
        if 'nombre' not in columnas_encontradas:
            # Estrategia 1: Buscar la primera columna que tenga texto no vacío
            for col in df.columns:
                valores_no_vacios = df[col].astype(str).str.strip()
                valores_no_vacios = valores_no_vacios[valores_no_vacios != '']
                valores_no_vacios = valores_no_vacios[valores_no_vacios != 'nan']
                # Si tiene al menos un valor no vacío y parece texto (no solo números)
                if len(valores_no_vacios) > 0:
                    # Verificar si tiene al menos un valor que no sea solo números
                    tiene_texto = valores_no_vacios.str.match(r'^[^0-9]+$', na=False).any()
                    if tiene_texto or len(valores_no_vacios) > len(df) * 0.5:  # Al menos 50% de filas con datos
                        columnas_encontradas['nombre'] = col
                        break
            
            # Estrategia 2: Si aún no encontramos, usar la primera columna
            if 'nombre' not in columnas_encontradas and len(df.columns) > 0:
                columnas_encontradas['nombre'] = df.columns[0]
            else:
                return {'error': 'No se pudo identificar la columna de Nombre del producto. Verifica que el archivo tenga al menos una columna con nombres de productos.'}
        
        productos = []
        filas_procesadas = 0
        
        for idx, row in df.iterrows():
            nombre = limpiar_texto(row.get(columnas_encontradas.get('nombre'), ''))
            
            # Saltar filas vacías o que solo tengan espacios/números
            if not nombre or nombre == 'nan' or nombre.strip() == '':
                continue
            
            # Validar que el nombre tenga al menos 2 caracteres (no solo un número o símbolo)
            if len(nombre.strip()) < 2:
                continue
            
            # Intentar obtener precio de diferentes columnas
            precio = 0
            if 'precio' in columnas_encontradas:
                precio = parsear_numero(row.get(columnas_encontradas.get('precio')))
            else:
                # Buscar en todas las columnas numéricas
                for col in df.columns:
                    if col != columnas_encontradas.get('nombre'):
                        try:
                            val = parsear_numero(row.get(col))
                            if val > 0:
                                precio = val
                                break
                        except:
                            continue
            
            cantidad = 1
            if 'cantidad' in columnas_encontradas:
                cantidad = int(parsear_numero(row.get(columnas_encontradas.get('cantidad'))))
            
            codigo_barras = ''
            if 'codigo_barras' in columnas_encontradas:
                codigo_barras = limpiar_texto(row.get(columnas_encontradas.get('codigo_barras')))
            
            categoria = 'General'
            if 'categoria' in columnas_encontradas:
                cat = limpiar_texto(row.get(columnas_encontradas.get('categoria')))
                if cat and cat != 'nan':
                    categoria = cat
                
            producto = {
                'nombre': nombre,
                'codigoBarras': codigo_barras,
                'cantidad': cantidad,
                'precio': precio,
                'costoBase': precio,  # Mapear precio a costoBase para el backend
                'categoria': categoria
            }

            productos.append(producto)
            filas_procesadas += 1
        
        # Validar que se encontraron productos
        if len(productos) == 0:
            return {'error': f'No se encontraron productos válidos en el archivo. Se procesaron {len(df)} filas pero ninguna contenía un nombre de producto válido. Verifica que el archivo tenga al menos una columna con nombres de productos.'}
            
        return productos

    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        return {'error': f'Error procesando Excel: {str(e)}. Detalles: {error_detail[-500:]}'}

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
