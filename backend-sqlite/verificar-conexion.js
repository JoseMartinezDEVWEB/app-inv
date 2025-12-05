// Script para verificar que todo está listo para la conexión
import fs from 'fs'
import fetch from 'node-fetch'

console.log('\n' + '='.repeat(70))
console.log('🔍 VERIFICACIÓN DE CONEXIÓN BACKEND ↔ FRONTEND DESKTOP')
console.log('='.repeat(70) + '\n')

let allGood = true

// 1. Verificar estructura de archivos
console.log('1️⃣  Verificando estructura de archivos...\n')

const requiredFiles = [
  '.env',
  'database/inventario.db',
  'src/server.js',
  '../frontend-desktop/.env',
  '../frontend-desktop/src/config/env.js',
]

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file)
  console.log(`   ${exists ? '✅' : '❌'} ${file}`)
  if (!exists) allGood = false
})

// 2. Verificar que el backend responde
console.log('\n2️⃣  Verificando que el backend está corriendo...\n')

try {
  const healthResponse = await fetch('http://localhost:4000/api/salud')
  const healthData = await healthResponse.json()
  
  if (healthData.exito && healthData.datos.estado === 'OK') {
    console.log('   ✅ Backend está corriendo en http://localhost:4000')
    console.log(`   ⏱️  Uptime: ${Math.floor(healthData.datos.uptime)} segundos`)
  } else {
    console.log('   ⚠️  Backend responde pero con error')
    allGood = false
  }
} catch (error) {
  console.log('   ❌ Backend NO está corriendo')
  console.log('   💡 Inicia el backend: cd backend-sqlite && npm run dev')
  allGood = false
}

// 3. Probar login del admin
console.log('\n3️⃣  Probando login del administrador...\n')

try {
  const loginResponse = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@j4pro.com',
      password: 'Jose.1919'
    })
  })
  
  const loginData = await loginResponse.json()
  
  if (loginData.exito) {
    console.log('   ✅ Login exitoso')
    console.log(`   👤 Usuario: ${loginData.datos.usuario.nombre}`)
    console.log(`   🎭 Rol: ${loginData.datos.usuario.rol}`)
    console.log('   🔑 Token JWT generado correctamente')
  } else {
    console.log('   ❌ Login falló:', loginData.mensaje)
    console.log('   💡 Ejecuta: cd backend-sqlite && node update-admin-password.js')
    allGood = false
  }
} catch (error) {
  console.log('   ❌ Error al probar login:', error.message)
  allGood = false
}

// 4. Verificar configuración del frontend
console.log('\n4️⃣  Verificando configuración del frontend...\n')

const frontendEnv = fs.readFileSync('../frontend-desktop/.env', 'utf-8')
const hasCorrectApi = frontendEnv.includes('http://localhost:4000/api')
const hasCorrectWs = frontendEnv.includes('http://localhost:4000')

console.log(`   ${hasCorrectApi ? '✅' : '❌'} API URL configurada: http://localhost:4000/api`)
console.log(`   ${hasCorrectWs ? '✅' : '❌'} WebSocket URL configurada: http://localhost:4000`)

if (!hasCorrectApi || !hasCorrectWs) allGood = false

// 5. Resumen final
console.log('\n' + '='.repeat(70))

if (allGood) {
  console.log('🎉 ¡TODO ESTÁ LISTO!')
  console.log('='.repeat(70))
  console.log('\n✅ El backend y frontend están correctamente configurados')
  console.log('\n🚀 Puedes iniciar el frontend desktop:')
  console.log('   cd frontend-desktop')
  console.log('   npm run dev')
  console.log('\n🔐 Credenciales para login:')
  console.log('   Email:    admin@j4pro.com')
  console.log('   Password: Jose.1919')
  console.log('\n📚 Más información: INSTRUCCIONES_PRUEBA_DESKTOP.md')
} else {
  console.log('⚠️  HAY PROBLEMAS QUE RESOLVER')
  console.log('='.repeat(70))
  console.log('\n❌ Revisa los errores arriba marcados con ❌')
  console.log('\n📚 Consulta: CONEXION_COMPLETADA.txt')
}

console.log('='.repeat(70) + '\n')
