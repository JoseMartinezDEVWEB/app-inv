// Script para verificar el estado del backend
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('\n' + '='.repeat(70))
console.log('🔍 VERIFICACIÓN DE ESTADO - Backend SQLite')
console.log('='.repeat(70) + '\n')

const checks = []

// 1. Verificar archivos esenciales
console.log('📁 Verificando archivos esenciales...\n')

const essentialFiles = [
  '.env',
  'package.json',
  'src/server.js',
  'src/config/database.js',
  'src/config/env.js',
  'database/inventario.db',
]

essentialFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file))
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
  checks.push({ name: file, status: exists })
})

// 2. Verificar estructura de directorios
console.log('\n📂 Verificando estructura de directorios...\n')

const directories = [
  'src/models',
  'src/controllers',
  'src/routes',
  'src/middlewares',
  'src/services',
  'src/utils',
  'src/migrations',
  'src/seeds',
  'database',
  'database/backups',
  'logs',
]

directories.forEach(dir => {
  const exists = fs.existsSync(path.join(__dirname, dir))
  if (!exists) {
    try {
      fs.mkdirSync(path.join(__dirname, dir), { recursive: true })
      console.log(`   ✅ ${dir} (creado)`)
    } catch (error) {
      console.log(`   ❌ ${dir} (error al crear)`)
    }
  } else {
    console.log(`   ✅ ${dir}`)
  }
})

// 3. Contar archivos por categoría
console.log('\n📊 Conteo de archivos...\n')

const countFiles = (dir) => {
  try {
    const files = fs.readdirSync(path.join(__dirname, dir))
    return files.filter(f => f.endsWith('.js')).length
  } catch (error) {
    return 0
  }
}

const fileCounts = {
  'Modelos': countFiles('src/models'),
  'Controladores': countFiles('src/controllers'),
  'Rutas': countFiles('src/routes'),
  'Middlewares': countFiles('src/middlewares'),
  'Servicios': countFiles('src/services'),
  'Utilidades': countFiles('src/utils'),
  'Migraciones': countFiles('src/migrations'),
  'Seeds': countFiles('src/seeds'),
}

Object.entries(fileCounts).forEach(([name, count]) => {
  console.log(`   ${count > 0 ? '✅' : '⚠️'}  ${name}: ${count}`)
})

// 4. Verificar base de datos
console.log('\n💾 Verificando base de datos...\n')

const dbPath = path.join(__dirname, 'database/inventario.db')
const dbExists = fs.existsSync(dbPath)

if (dbExists) {
  const stats = fs.statSync(dbPath)
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)
  console.log(`   ✅ Base de datos existe`)
  console.log(`   📏 Tamaño: ${sizeInMB} MB`)
  console.log(`   📅 Última modificación: ${stats.mtime.toLocaleString()}`)
} else {
  console.log(`   ⚠️  Base de datos no existe (ejecuta: npm run seed)`)
}

// 5. Verificar variables de entorno
console.log('\n⚙️  Verificando configuración...\n')

const envExists = fs.existsSync(path.join(__dirname, '.env'))
if (envExists) {
  console.log(`   ✅ Archivo .env existe`)
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8')
  const requiredVars = ['NODE_ENV', 'PORT', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
  
  requiredVars.forEach(varName => {
    const exists = envContent.includes(varName)
    console.log(`   ${exists ? '✅' : '⚠️'}  ${varName}`)
  })
} else {
  console.log(`   ⚠️  Archivo .env no existe (copia .env.example)`)
}

// 6. Verificar node_modules
console.log('\n📦 Verificando dependencias...\n')

const nodeModulesExists = fs.existsSync(path.join(__dirname, 'node_modules'))
if (nodeModulesExists) {
  console.log(`   ✅ node_modules existe`)
  
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')
  )
  const depCount = Object.keys(packageJson.dependencies || {}).length
  console.log(`   📦 Dependencias: ${depCount}`)
} else {
  console.log(`   ❌ node_modules no existe (ejecuta: npm install)`)
}

// 7. Resumen final
console.log('\n' + '='.repeat(70))

const allEssentialExist = checks.every(c => c.status)
const totalFiles = Object.values(fileCounts).reduce((a, b) => a + b, 0)

if (allEssentialExist && dbExists && nodeModulesExists && totalFiles >= 25) {
  console.log('✅ ESTADO: LISTO PARA USAR')
  console.log('='.repeat(70))
  console.log('\n🚀 Comandos disponibles:')
  console.log('   npm run dev      - Iniciar en modo desarrollo')
  console.log('   npm start        - Iniciar en producción')
  console.log('   npm run seed     - Crear datos de prueba')
  console.log('   node test-api.js - Probar endpoints')
  console.log('\n📚 Documentación:')
  console.log('   README.md - Documentación completa')
  console.log('   QUICK_START.md - Inicio rápido')
  console.log('   DEPLOYMENT_GUIDE.md - Guía de despliegue')
} else {
  console.log('⚠️  ESTADO: REQUIERE CONFIGURACIÓN')
  console.log('='.repeat(70))
  console.log('\n🔧 Acciones requeridas:')
  
  if (!nodeModulesExists) {
    console.log('   1. Ejecutar: npm install')
  }
  if (!envExists) {
    console.log('   2. Copiar: cp .env.example .env')
  }
  if (!dbExists) {
    console.log('   3. Ejecutar: npm run seed')
  }
  
  console.log('\n📚 Consulta: README.md para más información')
}

console.log('='.repeat(70) + '\n')
