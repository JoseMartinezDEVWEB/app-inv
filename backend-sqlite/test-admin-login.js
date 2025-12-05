// Test de login con las nuevas credenciales del admin
import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:4000/api'

async function testAdminLogin() {
  console.log('🧪 Probando login del administrador...\n')

  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@j4pro.com',
        password: 'Jose.1919'
      })
    })

    const data = await response.json()

    if (data.exito) {
      console.log('✅ LOGIN EXITOSO\n')
      console.log('📋 Información del usuario:')
      console.log('   Nombre:', data.datos.usuario.nombre)
      console.log('   Email:', data.datos.usuario.email)
      console.log('   Rol:', data.datos.usuario.rol)
      console.log('\n🔑 Token generado correctamente')
      console.log('\n' + '='.repeat(60))
      console.log('🎉 El administrador puede hacer login exitosamente')
      console.log('='.repeat(60))
      console.log('\n✅ Frontend Desktop puede usar estas credenciales:')
      console.log('   Email:    admin@j4pro.com')
      console.log('   Password: Jose.1919')
      console.log('\n')
    } else {
      console.log('❌ LOGIN FALLÓ')
      console.log('   Mensaje:', data.mensaje)
      console.log('\n⚠️  Ejecuta: node update-admin-password.js')
    }

  } catch (error) {
    console.log('❌ ERROR AL CONECTAR CON EL BACKEND')
    console.log('   Error:', error.message)
    console.log('\n⚠️  Asegúrate de que el backend esté corriendo:')
    console.log('   cd backend-sqlite')
    console.log('   npm run dev')
  }
}

testAdminLogin()
