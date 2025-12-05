/**
 * Script para empaquetar el backend con la aplicación desktop
 * Copia los archivos necesarios del backend a la carpeta de recursos
 */

import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const projectRoot = path.join(__dirname, '..')
const backendSource = path.join(projectRoot, '../backend-sqlite')
const backendDest = path.join(projectRoot, 'resources/backend')

console.log('📦 Empaquetando backend...')
console.log('   Origen:', backendSource)
console.log('   Destino:', backendDest)

try {
  // Limpiar carpeta destino
  if (fs.existsSync(backendDest)) {
    console.log('🗑️  Limpiando carpeta destino...')
    fs.removeSync(backendDest)
  }

  // Crear carpeta destino
  fs.ensureDirSync(backendDest)

  // Copiar archivos necesarios
  console.log('📋 Copiando archivos...')

  // 1. Copiar src completo
  fs.copySync(
    path.join(backendSource, 'src'),
    path.join(backendDest, 'src'),
    { overwrite: true }
  )

  // 2. Copiar package.json
  fs.copySync(
    path.join(backendSource, 'package.json'),
    path.join(backendDest, 'package.json')
  )

  // 3. Copiar .env.example como .env
  const envExample = path.join(backendSource, '.env.example')
  if (fs.existsSync(envExample)) {
    fs.copySync(
      envExample,
      path.join(backendDest, '.env')
    )
  }

  // 4. Crear carpeta database vacía (se creará en runtime)
  fs.ensureDirSync(path.join(backendDest, 'database'))
  fs.ensureDirSync(path.join(backendDest, 'database/backups'))
  fs.ensureDirSync(path.join(backendDest, 'logs'))

  // 5. Copiar node_modules necesarios (solo producción)
  console.log('📦 Instalando dependencias de producción...')
  const { execSync } = await import('child_process')
  
  try {
    execSync('npm install --production --omit=dev', {
      cwd: backendDest,
      stdio: 'inherit'
    })
  } catch (error) {
    console.error('❌ Error al instalar dependencias:', error.message)
    throw error
  }

  console.log('✅ Backend empaquetado correctamente')
  console.log('📊 Archivos copiados:')
  console.log('   - Código fuente (src/)')
  console.log('   - package.json')
  console.log('   - Variables de entorno')
  console.log('   - Dependencias de producción')
  console.log('   - Carpetas de datos (database/, logs/)')

} catch (error) {
  console.error('❌ Error al empaquetar backend:', error)
  process.exit(1)
}
