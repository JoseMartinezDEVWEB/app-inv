// Script para actualizar la contraseña del administrador
import bcrypt from 'bcryptjs'
import dbManager from './src/config/database.js'

const newPassword = 'Jose.1919'
const adminEmail = 'admin@j4pro.com'

console.log('🔧 Actualizando contraseña del administrador...\n')

try {
  // Inicializar base de datos
  dbManager.initialize()
  const db = dbManager.getDatabase()

  // Buscar admin
  const admin = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(adminEmail)

  if (!admin) {
    console.log('❌ Usuario admin@j4pro.com no encontrado')
    console.log('   Ejecuta primero: npm run seed')
    process.exit(1)
  }

  console.log('✅ Usuario encontrado:', admin.nombre)

  // Generar nuevo hash
  const hashedPassword = bcrypt.hashSync(newPassword, 10)

  // Actualizar contraseña
  const stmt = db.prepare(`
    UPDATE usuarios 
    SET password = ?, updatedAt = CURRENT_TIMESTAMP 
    WHERE email = ?
  `)
  
  stmt.run(hashedPassword, adminEmail)

  console.log('✅ Contraseña actualizada exitosamente\n')
  console.log('📋 Nuevas credenciales:')
  console.log('   Email:    admin@j4pro.com')
  console.log('   Password: Jose.1919')
  console.log('\n🎯 Ahora puedes hacer login con estas credenciales\n')

  dbManager.close()
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}
