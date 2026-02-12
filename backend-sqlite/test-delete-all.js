// Script para probar el borrado de todos los productos
import fetch from 'node-fetch'

const BASE_URL = 'http://localhost:4000/api'

async function testDeleteAll() {
    console.log('🧪 Probando Borrado de Todo el Inventario...\n')

    try {
        // 1. Login como administrador
        console.log('1️⃣  Iniciando sesión como admin...')
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@j4pro.com', // Asumiendo que existe, sino usaré el del test anterior
                password: 'admin' // Password por defecto común, ajustaré si falla
            })
        })

        let loginData = await loginRes.json()
        let token = ''

        if (!loginData.exito) {
            console.log('   ⚠️ Admin default falló, intentando con contador@j4pro.com (si tiene permisos admin)...')
            const loginRes2 = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'contador@j4pro.com',
                    password: '123456'
                })
            })
            loginData = await loginRes2.json()
        }

        if (loginData.exito && loginData.datos.usuario.rol === 'administrador') {
            token = loginData.datos.accessToken
            console.log('   ✅ Login exitoso como Admin')
        } else {
            console.error('   ❌ No se pudo loguear como administrador o el usuario no es admin.')
            console.log('   Rol obtenido:', loginData.datos?.usuario?.rol)
            return
        }

        // 2. Crear un producto de prueba (para tener algo que borrar)
        console.log('\n2️⃣  Creando producto de prueba...')
        const createRes = await fetch(`${BASE_URL}/productos/generales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre: 'Producto a Borrar ' + Date.now(),
                costoBase: 100,
                categoria: 'General'
            })
        })
        const createData = await createRes.json()
        if (createData.exito) {
            console.log('   ✅ Producto creado')
        } else {
            console.log('   ⚠️ No se pudo crear producto (quizás ya hay):', createData.mensaje)
        }

        // 3. Verificar cantidad actual
        console.log('\n3️⃣  Verificando cantidad antes del borrado...')
        const listBeforeVar = await fetch(`${BASE_URL}/productos/generales?limite=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const dataBefore = await listBeforeVar.json()
        const totalBefore = dataBefore.datos.paginacion.totalRegistros
        console.log(`   📦 Total productos antes: ${totalBefore}`)

        // 4. EJECUTAR EL BORRADO DE TODOS
        console.log('\n4️⃣  🚨 LLAMANDO ENDPOINT ELIMINAR TODOS...')
        const deleteRes = await fetch(`${BASE_URL}/productos/generales/eliminar-todos`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const deleteData = await deleteRes.json()

        if (deleteData.exito) {
            console.log('   ✅ Respuesta exitosa:', deleteData.mensaje)
            console.log('   🗑️ Cantidad eliminada según respuesta:', deleteData.datos.cantidad)
        } else {
            console.error('   ❌ Error al eliminar:', deleteData.mensaje)
        }

        // 5. Verificar cantidad después
        console.log('\n5️⃣  Verificando cantidad después del borrado...')
        const listAfterVar = await fetch(`${BASE_URL}/productos/generales?limite=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        const dataAfter = await listAfterVar.json()
        const totalAfter = dataAfter.datos.paginacion.totalRegistros
        console.log(`   📦 Total productos después: ${totalAfter}`)

        if (totalAfter === 0) {
            console.log('\n✅ PRUEBA EXITOSA: La base de datos de productos está vacía.')
        } else {
            console.error('\n❌ PRUEBA FALLIDA: Aún quedan productos.')
        }

    } catch (error) {
        console.error('\n❌ Error en el script:', error.message)
    }
}

testDeleteAll()
