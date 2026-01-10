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
            'precio': ['precio', 'costo', 'valor', 'pvp', 'precio venta', 'precio_venta'],
            'categoria': ['categoria', 'categoría', 'grupo', 'familia', 'departamento'],
            'stock': ['stock', 'cantidad', 'existencia', 'inventario', 'unidades']
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
                
            producto = {
                'nombre': nombre,
                'codigo_barras': limpiar_texto(row.get(columnas_encontradas.get('codigo_barras'))) if 'codigo_barras' in columnas_encontradas else '',
                'precio': parsear_numero(row.get(columnas_encontradas.get('precio'))) if 'precio' in columnas_encontradas else 0,
                'categoria': limpiar_texto(row.get(columnas_encontradas.get('categoria'))) if 'categoria' in columnas_encontradas else 'General',
                'stock': int(parsear_numero(row.get(columnas_encontradas.get('stock')))) if 'stock' in columnas_encontradas else 0,
                'descripcion': '' # Opcional
            }
            
            # Generar código de barras si no existe (usando nombre o aleatorio es responsabilidad del backend, aquí lo dejamos vacío o limpio)
            if not producto['codigo_barras']:
                 # Si no tiene código, usamos algo derivado del nombre o vacío para que el backend decida
                 pass 

            productos.append(producto)
            
        return productos

    except Exception as e:
        return {'error': f'Error procesando Excel: {str(e)}'}

def procesar_pdf(archivo_path: str) -> List[Dict[str, Any]]:
    """
    Procesamiento básico de PDF (extracción de texto)
    Nota: Para PDFs complejos se recomienda usar servicios de IA o librerías más avanzadas.
    Esta es una implementación básica compatible.
    """
    try:
        import pdfplumber
        texto_completo = ""
        productos = []
        
        with pdfplumber.open(archivo_path) as pdf:
            for page in pdf.pages:
                # Intentar extraer tablas
                tablas = page.extract_tables()
                
                if tablas:
                    for tabla in tablas:
                        # Asumir que la primera fila es encabezado si parece texto
                        # Heurística simple: buscar columnas
                        if not tabla: continue
                        
                        header = [str(c).lower().strip() if c else '' for c in tabla[0]]
                        
                        # Buscar índices
                        idx_nombre = -1
                        idx_precio = -1
                        idx_codigo = -1
                        
                        for i, col in enumerate(header):
                            if 'nombre' in col or 'descrip' in col or 'articulo' in col: idx_nombre = i
                            elif 'precio' in col or 'valor' in col: idx_precio = i
                            elif 'cod' in col or 'ref' in col: idx_codigo = i
                        
                        # Procesar filas de datos (saltando encabezado si se detectó)
                        start_idx = 1 if (idx_nombre != -1 or idx_precio != -1) else 0
                        
                        for fila in tabla[start_idx:]:
                            if not fila: continue
                            
                            # Si no detectamos encabezados, asumir orden común: Codigo, Nombre, ..., Precio
                            p_nombre = ""
                            p_precio = 0
                            p_codigo = ""
                            
                            if idx_nombre != -1 and len(fila) > idx_nombre:
                                p_nombre = limpiar_texto(fila[idx_nombre])
                            elif len(fila) >= 2: # Fallback: segunda columna suele ser nombre
                                p_nombre = limpiar_texto(fila[1])
                            elif len(fila) == 1:
                                p_nombre = limpiar_texto(fila[0])
                                
                            if not p_nombre: continue

                            if idx_precio != -1 and len(fila) > idx_precio:
                                p_precio = parsear_numero(fila[idx_precio])
                            elif len(fila) >= 3: # Fallback: última o tercera columna suele ser precio
                                # Intentar buscar un número en las columnas restantes
                                for cell in reversed(fila):
                                    try:
                                        val = parsear_numero(cell)
                                        if val > 0: 
                                            p_precio = val
                                            break
                                    except: continue
                            
                            if idx_codigo != -1 and len(fila) > idx_codigo:
                                p_codigo = limpiar_texto(fila[idx_codigo])
                            elif len(fila) >= 1: # Fallback: primera columna suele ser código
                                possible_code = limpiar_texto(fila[0])
                                if len(possible_code) < 20 and any(c.isdigit() for c in possible_code):
                                    p_codigo = possible_code

                            productos.append({
                                'nombre': p_nombre,
                                'codigo_barras': p_codigo,
                                'precio': p_precio,
                                'categoria': 'General',
                                'stock': 0
                            })

        if not productos:
            return {'error': 'No se pudieron extraer productos del PDF de forma estructurada. Intente convertirlo a Excel.'}
            
        return productos

    except ImportError:
        return {'error': 'Librería pdfplumber no instalada en el servidor'}
    except Exception as e:
        return {'error': f'Error procesando PDF: {str(e)}'}

def main():
    """Función principal de entrada"""
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Argumentos insuficientes'}))
        sys.exit(1)
        
    tipo = sys.argv[1].lower()
    archivo = sys.argv[2]
    
    # Validar archivo
    if not os.path.exists(archivo):
        print(json.dumps({'error': f'Archivo no encontrado: {archivo}'}))
        sys.exit(1)
        
    resultado = []
    
    try:
        if tipo in ['xlsx', 'xls']:
            resultado = procesar_excel(archivo)
        elif tipo == 'pdf':
            resultado = procesar_pdf(archivo)
        else:
            resultado = {'error': 'Formato no soportado'}
            
        # Verificar si el resultado es un dict de error
        if isinstance(resultado, dict) and 'error' in resultado:
            # Imprimir JSON de error
            print(json.dumps({'exito': False, 'mensaje': resultado['error']}))
        else:
            # Imprimir JSON de éxito
            print(json.dumps({'exito': True, 'productos': resultado}, ensure_ascii=False))
            
    except Exception as e:
        # Capturar cualquier error no controlado
        tb = traceback.format_exc()
        print(json.dumps({'exito': False, 'mensaje': f'Error interno: {str(e)}', 'trace': tb}))
        sys.exit(1)

if __name__ == '__main__':
    main()
