import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import ProductoGeneral from '../models/ProductoGeneral.js'
import { respuestaExito } from '../utils/helpers.js'
import { AppError } from '../middlewares/errorHandler.js'

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Procesa un archivo XLSX o PDF usando el script Python
 */
export const importarProductosDesdeArchivo = async (req, res) => {
  try {
    // Verificar que se haya subido un archivo
    if (!req.file) {
      throw new AppError('No se proporcionó ningún archivo', 400)
    }

    const archivo = req.file
    const extension = path.extname(archivo.originalname).toLowerCase().slice(1)
    
    // Validar extensión
    if (!['xlsx', 'xls', 'pdf'].includes(extension)) {
      throw new AppError('Formato de archivo no soportado. Use XLSX, XLS o PDF', 400)
    }

    // Obtener API key de Gemini si está disponible (opcional para PDFs)
    const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY || null

    // Ruta del script Python
    const scriptPath = path.join(__dirname, '../utils/importProducts.py')
    
    // Verificar que el script existe
    if (!existsSync(scriptPath)) {
      throw new AppError('Script de importación no encontrado', 500)
    }

    // Ejecutar script Python
    const comando = `python "${scriptPath}" ${extension} "${archivo.path}" ${apiKey ? `"${apiKey}"` : ''}`
    
    console.log('Ejecutando comando:', comando.replace(apiKey || '', '***'))
    
    const { stdout } = await execAsync(comando, {
      maxBuffer: 10 * 1024 * 1024, // 10MB
      encoding: 'utf8'
    })

    // Limpiar archivo temporal
    try {
      await fs.unlink(archivo.path)
    } catch (err) {
      console.error('Error al eliminar archivo temporal:', err)
    }

    // Parsear respuesta del script
    let resultado
    try {
      resultado = JSON.parse(stdout)
    } catch (parseError) {
      console.error('Error al parsear respuesta:', stdout)
      throw new AppError('Error al procesar respuesta del script de importación', 500)
    }

    // Verificar si hubo error en el script
    if (resultado.error) {
      throw new AppError(resultado.error, 400)
    }

    if (!resultado.productos || !Array.isArray(resultado.productos)) {
      throw new AppError('Formato de respuesta inválido del script', 500)
    }

    // Validar y crear productos en la base de datos
    const productosCreados = []
    const productosConError = []
    const usuarioId = req.usuario?.id || null

    for (const productoData of resultado.productos) {
      try {
        // Validar datos mínimos
        if (!productoData.nombre || productoData.nombre.trim() === '') {
          productosConError.push({
            producto: productoData,
            error: 'Nombre vacío'
          })
          continue
        }

        // Preparar datos del producto
        const datosProducto = {
          nombre: productoData.nombre.trim(),
          codigoBarras: productoData.codigoBarras && productoData.codigoBarras.trim() !== '' 
            ? productoData.codigoBarras.trim() 
            : null,
          costoBase: Number.parseFloat(productoData.costoBase) || 0,
          categoria: productoData.categoria || 'General',
          unidad: productoData.unidad || 'unidad',
          descripcion: productoData.descripcion || null,
          proveedor: productoData.proveedor || null,
          creadoPorId: usuarioId,
          tipoCreacion: 'importacion'
        }

        // Verificar si el producto ya existe (por código de barras o nombre)
        let productoExistente = null
        if (datosProducto.codigoBarras) {
          productoExistente = ProductoGeneral.buscarPorCodigoBarras(datosProducto.codigoBarras)
        }
        
        if (!productoExistente) {
          // Buscar por nombre (búsqueda aproximada)
          const productos = ProductoGeneral.buscar({
            buscar: datosProducto.nombre,
            limite: 1
          })
          
          if (productos.datos && productos.datos.length > 0) {
            const productoSimilar = productos.datos[0]
            // Si el nombre es muy similar, considerarlo duplicado
            if (productoSimilar.nombre.toLowerCase() === datosProducto.nombre.toLowerCase()) {
              productoExistente = productoSimilar
            }
          }
        }

        if (productoExistente) {
          // Actualizar producto existente
          ProductoGeneral.actualizar(productoExistente.id, {
            costoBase: datosProducto.costoBase,
            categoria: datosProducto.categoria
          })
          productosCreados.push({
            ...productoExistente,
            accion: 'actualizado'
          })
        } else {
          // Crear nuevo producto
          const nuevoProducto = ProductoGeneral.crear(datosProducto)
          productosCreados.push({
            ...nuevoProducto,
            accion: 'creado'
          })
        }

      } catch (error) {
        console.error('Error al procesar producto:', productoData, error)
        productosConError.push({
          producto: productoData,
          error: error.message || 'Error desconocido'
        })
      }
    }

    // Preparar respuesta
    const respuesta = {
      totalProcesados: resultado.productos.length,
      totalCreados: productosCreados.filter(p => p.accion === 'creado').length,
      totalActualizados: productosCreados.filter(p => p.accion === 'actualizado').length,
      totalErrores: productosConError.length,
      productos: productosCreados,
      errores: productosConError
    }

    res.json(respuestaExito(respuesta, `Importación completada: ${respuesta.totalCreados} creados, ${respuesta.totalActualizados} actualizados`))

  } catch (error) {
    // Limpiar archivo temporal en caso de error
    if (req.file?.path && existsSync(req.file.path)) {
      try {
        await fs.unlink(req.file.path)
      } catch (err) {
        console.error('Error al eliminar archivo temporal:', err)
      }
    }

    if (error instanceof AppError) {
      throw error
    }

    console.error('Error en importarProductosDesdeArchivo:', error)
    throw new AppError(`Error al importar productos: ${error.message}`, 500)
  }
}

export default {
  importarProductosDesdeArchivo
}

