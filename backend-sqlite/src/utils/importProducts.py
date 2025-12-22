#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para importar productos desde archivos XLSX o PDF
Utiliza IA (Google Gemini) para procesar archivos complejos
"""

import sys
import json
import os
import pandas as pd
import PyPDF2
import pdfplumber
from typing import List, Dict, Any
import re

# Intentar importar Google Gemini (opcional, para PDFs complejos)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Warning: Google Gemini no está disponible. Instala: pip install google-generativeai", file=sys.stderr)


def limpiar_texto(texto: str) -> str:
    """Limpia y normaliza texto"""
    if pd.isna(texto) or texto is None:
        return ""
    return str(texto).strip()


def parsear_numero(valor: Any) -> float:
    """Convierte un valor a número, manejando diferentes formatos"""
    if pd.isna(valor) or valor is None:
        return 0.0
    
    # Si es string, limpiar y convertir
    if isinstance(valor, str):
        # Remover caracteres no numéricos excepto punto y coma
        valor = re.sub(r'[^\d.,]', '', valor)
        # Reemplazar coma por punto si es necesario
        valor = valor.replace(',', '.')
        try:
            return float(valor)
        except ValueError:
            return 0.0
    
    try:
        return float(valor)
    except (ValueError, TypeError):
        return 0.0


def procesar_excel(archivo_path: str) -> List[Dict[str, Any]]:
    """
    Procesa un archivo Excel y extrae productos
    
    Formato esperado (basado en Inv_MINI MARKET LOS PEREZ.xlsx):
    - Encabezados en fila 4: SKU, Nombre, Cantidad, Costo, Total, Precio
    - Los datos empiezan desde la fila 5
    """
    productos = []
    
    try:
        # Leer el archivo Excel
        # Intentar leer sin encabezados primero para detectar la estructura
        df_raw = pd.read_excel(archivo_path, header=None)
        
        # Buscar la fila con los encabezados (SKU, Nombre, etc.)
        header_row = None
        for idx, row in df_raw.iterrows():
            row_str = ' '.join([str(cell).lower() for cell in row if pd.notna(cell)])
            if 'sku' in row_str and ('nombre' in row_str or 'producto' in row_str):
                header_row = idx
                break
        
        if header_row is None:
            # Si no encontramos encabezados, intentar leer con header=0
            df = pd.read_excel(archivo_path)
        else:
            # Leer con los encabezados encontrados
            df = pd.read_excel(archivo_path, header=header_row)
            # Limpiar nombres de columnas
            df.columns = [str(col).strip() for col in df.columns]
        
        # Mapear columnas comunes
        nombre_col = None
        costo_col = None
        codigo_col = None
        sku_col = None
        
        for col in df.columns:
            col_lower = str(col).lower()
            if 'nombre' in col_lower or 'producto' in col_lower or 'descripcion' in col_lower:
                nombre_col = col
            elif 'costo' in col_lower or 'precio' in col_lower:
                if costo_col is None or 'costo' in col_lower:
                    costo_col = col
            elif 'codigo' in col_lower or 'barras' in col_lower or 'barcode' in col_lower:
                codigo_col = col
            elif 'sku' in col_lower:
                sku_col = col
        
        # Si no encontramos nombre_col, usar la primera columna que no sea numérica
        if nombre_col is None:
            for col in df.columns:
                if df[col].dtype == 'object':
                    nombre_col = col
                    break
        
        # Si no encontramos costo_col, buscar columnas numéricas
        if costo_col is None:
            for col in df.columns:
                if df[col].dtype in ['float64', 'int64']:
                    costo_col = col
                    break
        
        # Procesar cada fila
        for idx, row in df.iterrows():
            nombre = limpiar_texto(row.get(nombre_col, ''))
            
            # Saltar filas vacías o sin nombre
            if not nombre or nombre == '' or nombre.lower() in ['nan', 'none', '']:
                continue
            
            # Obtener código de barras (SKU o código)
            codigo_barras = None
            if codigo_col:
                codigo_barras = limpiar_texto(row.get(codigo_col, ''))
            elif sku_col:
                codigo_barras = limpiar_texto(row.get(sku_col, ''))
            
            # Si el código está vacío, usar None
            if not codigo_barras or codigo_barras.lower() in ['nan', 'none', '']:
                codigo_barras = None
            
            # Obtener costo
            costo = 0.0
            if costo_col:
                costo = parsear_numero(row.get(costo_col, 0))
            
            # Si el costo es 0, intentar buscar en otras columnas numéricas
            if costo == 0:
                for col in df.columns:
                    if col != nombre_col and df[col].dtype in ['float64', 'int64']:
                        valor = parsear_numero(row.get(col, 0))
                        if valor > 0:
                            costo = valor
                            break
            
            # Crear producto
            producto = {
                'nombre': nombre,
                'codigoBarras': codigo_barras,
                'costoBase': costo,
                'categoria': 'General',
                'unidad': 'unidad',
                'descripcion': None,
                'proveedor': None
            }
            
            productos.append(producto)
        
        return productos
        
    except Exception as e:
        return {
            'error': f'Error al procesar Excel: {str(e)}',
            'productos': []
        }


def extraer_texto_pdf(archivo_path: str) -> str:
    """Extrae texto de un PDF usando pdfplumber (mejor para tablas)"""
    texto_completo = ""
    
    try:
        with pdfplumber.open(archivo_path) as pdf:
            for page in pdf.pages:
                # Intentar extraer tablas primero
                tablas = page.extract_tables()
                if tablas:
                    for tabla in tablas:
                        for fila in tabla:
                            if fila:
                                texto_completo += ' | '.join([str(cell) if cell else '' for cell in fila]) + '\n'
                
                # También extraer texto normal
                texto = page.extract_text()
                if texto:
                    texto_completo += texto + '\n'
    except Exception as e:
        print(f"Error con pdfplumber: {e}", file=sys.stderr)
        # Fallback a PyPDF2
        try:
            with open(archivo_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    texto_completo += page.extract_text() + '\n'
        except Exception as e2:
            print(f"Error con PyPDF2: {e2}", file=sys.stderr)
    
    return texto_completo


def procesar_pdf_con_ia(archivo_path: str, api_key: str = None) -> List[Dict[str, Any]]:
    """
    Procesa un PDF usando IA (Google Gemini) para extraer productos
    """
    if not GEMINI_AVAILABLE or not api_key:
        # Si no hay IA, intentar extracción básica
        texto = extraer_texto_pdf(archivo_path)
        return procesar_texto_basico(texto)
    
    try:
        # Configurar Gemini
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Extraer texto del PDF
        texto = extraer_texto_pdf(archivo_path)
        
        # Limitar el texto a 30k caracteres para evitar límites de tokens
        texto_limite = texto[:30000] if len(texto) > 30000 else texto
        
        # Prompt para la IA
        prompt = f"""
Analiza el siguiente texto extraído de un inventario en PDF. 
Extrae todos los productos y devuélvelos en formato JSON array.

Para cada producto, identifica:
- nombre: El nombre del producto
- codigoBarras: El código de barras o SKU (si existe)
- costoBase: El costo o precio (solo el número, sin símbolos)
- categoria: Siempre "General"

Formato de respuesta (SOLO JSON, sin markdown, sin explicaciones):
[
  {{
    "nombre": "Nombre del producto",
    "codigoBarras": "123456789" o null,
    "costoBase": 10.50,
    "categoria": "General"
  }}
]

Texto del inventario:
{texto_limite}
"""
        
        # Generar respuesta
        response = model.generate_content(prompt)
        respuesta_texto = response.text
        
        # Limpiar la respuesta (remover markdown si existe)
        respuesta_texto = respuesta_texto.strip()
        if respuesta_texto.startswith('```json'):
            respuesta_texto = respuesta_texto[7:]
        if respuesta_texto.startswith('```'):
            respuesta_texto = respuesta_texto[3:]
        if respuesta_texto.endswith('```'):
            respuesta_texto = respuesta_texto[:-3]
        respuesta_texto = respuesta_texto.strip()
        
        # Parsear JSON
        productos = json.loads(respuesta_texto)
        
        # Validar y normalizar
        productos_validos = []
        for producto in productos:
            if isinstance(producto, dict) and 'nombre' in producto:
                productos_validos.append({
                    'nombre': str(producto.get('nombre', '')).strip(),
                    'codigoBarras': str(producto.get('codigoBarras', '')).strip() if producto.get('codigoBarras') else None,
                    'costoBase': parsear_numero(producto.get('costoBase', 0)),
                    'categoria': 'General',
                    'unidad': 'unidad',
                    'descripcion': None,
                    'proveedor': None
                })
        
        return productos_validos
        
    except json.JSONDecodeError as e:
        return {
            'error': f'Error al parsear respuesta de IA: {str(e)}',
            'productos': []
        }
    except Exception as e:
        return {
            'error': f'Error al procesar PDF con IA: {str(e)}',
            'productos': []
        }


def procesar_texto_basico(texto: str) -> List[Dict[str, Any]]:
    """Procesa texto básico sin IA (método simple)"""
    productos = []
    lineas = texto.split('\n')
    
    for linea in lineas:
        linea = linea.strip()
        if not linea or len(linea) < 3:
            continue
        
        # Intentar detectar patrones básicos
        # Formato: Nombre | Código | Costo
        partes = [p.strip() for p in linea.split('|')]
        
        if len(partes) >= 2:
            nombre = partes[0]
            costo = 0.0
            codigo = None
            
            # Buscar número en las partes
            for parte in partes[1:]:
                num = parsear_numero(parte)
                if num > 0:
                    costo = num
                    break
                elif len(parte) > 5 and parte.replace('.', '').replace(',', '').isdigit():
                    codigo = parte
            
            if nombre and nombre.lower() not in ['nombre', 'producto', 'descripcion', 'sku']:
                productos.append({
                    'nombre': nombre,
                    'codigoBarras': codigo,
                    'costoBase': costo,
                    'categoria': 'General',
                    'unidad': 'unidad',
                    'descripcion': None,
                    'proveedor': None
                })
    
    return productos


def main():
    """Función principal"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Uso: python importProducts.py <tipo> <archivo> [api_key]',
            'productos': []
        }))
        sys.exit(1)
    
    tipo_archivo = sys.argv[1].lower()
    archivo_path = sys.argv[2]
    api_key = sys.argv[3] if len(sys.argv) > 3 else None
    
    # Verificar que el archivo existe
    if not os.path.exists(archivo_path):
        print(json.dumps({
            'error': f'Archivo no encontrado: {archivo_path}',
            'productos': []
        }))
        sys.exit(1)
    
    try:
        if tipo_archivo in ['xlsx', 'xls']:
            productos = procesar_excel(archivo_path)
        elif tipo_archivo == 'pdf':
            productos = procesar_pdf_con_ia(archivo_path, api_key)
        else:
            print(json.dumps({
                'error': f'Tipo de archivo no soportado: {tipo_archivo}',
                'productos': []
            }))
            sys.exit(1)
        
        # Si hay error en el resultado, manejarlo
        if isinstance(productos, dict) and 'error' in productos:
            print(json.dumps(productos))
            sys.exit(1)
        
        # Retornar productos
        resultado = {
            'exito': True,
            'productos': productos,
            'total': len(productos)
        }
        
        print(json.dumps(resultado, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({
            'error': f'Error inesperado: {str(e)}',
            'productos': []
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()


