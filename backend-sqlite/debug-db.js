import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('./database/inventario.db');
console.log('📂 Abriendo base de datos en:', dbPath);

try {
    const db = new Database(dbPath, { readonly: true });

    // 1. Listar tablas
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n📊 Tablas encontradas:', tables.map(t => t.name).join(', '));

    // 2. Contar usuarios
    const usuarios = db.prepare('SELECT id, nombre, email FROM usuarios').all();
    console.log(`\n👥 Usuarios (${usuarios.length}):`);
    usuarios.forEach(u => console.log(`   - [${u.id}] ${u.nombre} (${u.email})`));

    // 3. Contar clientes
    const clientes = db.prepare('SELECT id, nombre, activo FROM clientes_negocios').all();
    console.log(`\nbuildings Clientes (${clientes.length}):`);
    clientes.forEach(c => console.log(`   - [${c.id}] ${c.nombre} (Activo: ${c.activo})`));

    // 4. Contar productos generales
    const prods = db.prepare('SELECT id, nombre, activo, categoria FROM productos_generales').all();
    console.log(`\n📦 Productos Generales (${prods.length}):`);
    prods.forEach(p => console.log(`   - [${p.id}] ${p.nombre} (Activo: ${p.activo}, Cat: ${p.categoria})`));

    db.close();
} catch (error) {
    console.error('❌ Error al leer la DB:', error.message);
}
