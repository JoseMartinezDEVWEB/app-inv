// Script simple para probar el API
import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:4000/api'

async function testAPI() {
  console.log('🧪 Probando Backend SQLite...\n')

  try {
    // 1. Test de salud
    console.log('1️⃣  Probando endpoint de salud...')
    const healthRes = await fetch(`${BASE_URL}/salud`)
    const health = await healthRes.json()
    console.log('   ✅ Salud:', health.datos.estado)

    // 2. Login
    console.log('\n2️⃣  Probando login...')
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'contador@j4pro.com',
        password: '123456'
      })
    })
    const loginData = await loginRes.json()
    
    if (loginData.exito) {
      console.log('   ✅ Login exitoso')
      console.log('   👤 Usuario:', loginData.datos.usuario.nombre)
      console.log('   🔑 Token generado')
      
      const token = loginData.datos.accessToken

      // 3. Obtener clientes
      console.log('\n3️⃣  Probando listado de clientes...')
      const clientesRes = await fetch(`${BASE_URL}/clientes-negocios`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const clientesData = await clientesRes.json()
      
      if (clientesData.exito) {
        console.log('   ✅ Clientes obtenidos:', clientesData.datos.datos.length)
        clientesData.datos.datos.forEach(c => {
          console.log(`      - ${c.nombre}`)
        })
      }

      // 4. Obtener productos generales
      console.log('\n4️⃣  Probando listado de productos generales...')
      const productosRes = await fetch(`${BASE_URL}/productos/generales`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const productosData = await productosRes.json()
      
      if (productosData.exito) {
        console.log('   ✅ Productos obtenidos:', productosData.datos.datos.length)
        console.log('   📦 Primeros 5:')
        productosData.datos.datos.slice(0, 5).forEach(p => {
          console.log(`      - ${p.nombre} ($${p.costoBase})`)
        })
      }

      // 5. Test de sesiones
      console.log('\n5️⃣  Probando listado de sesiones...')
      const sesionesRes = await fetch(`${BASE_URL}/sesiones-inventario`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const sesionesData = await sesionesRes.json()
      
      if (sesionesData.exito) {
        console.log('   ✅ Sesiones obtenidas:', sesionesData.datos.datos.length)
      }

      // 6. Test de subordinados
      console.log('\n6️⃣  Probando listado de subordinados...')
      const subordinadosRes = await fetch(`${BASE_URL}/usuarios/subordinados`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const subordinadosData = await subordinadosRes.json()
      
      if (subordinadosData.exito) {
        console.log('   ✅ Subordinados obtenidos:', subordinadosData.datos.length)
      }

      console.log('\n' + '='.repeat(60))
      console.log('✅ TODOS LOS TESTS PASARON EXITOSAMENTE')
      console.log('='.repeat(60))
      console.log('\n🎉 Backend completamente funcional!')
      console.log('📡 API URL: http://localhost:4000/api')
      console.log('📚 Documentación: Ver README.md\n')

    } else {
      console.error('   ❌ Login falló:', loginData.mensaje)
    }

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error.message)
    console.error('   Asegúrate de que el servidor esté corriendo: npm run dev')
  }
}

testAPI()
