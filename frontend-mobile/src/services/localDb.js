import * as SQLite from 'expo-sqlite';

// Abrir base de datos
const db = SQLite.openDatabase('j4pro_local.db');

// Promesa para ejecutar transacciones SQL
const executeSql = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.transaction(tx => {
            tx.executeSql(
                sql,
                params,
                (_, result) => resolve(result),
                (_, error) => reject(error)
            );
        });
    });
}

const localDb = {
    // Inicializar base de datos y crear tablas
    init: async () => {
        try {
            // Tabla de Productos
            await executeSql(`
        CREATE TABLE IF NOT EXISTS productos(
                _id TEXT PRIMARY KEY,
                nombre TEXT NOT NULL,
                codigoBarras TEXT,
                precioVenta REAL,
                stock INTEGER,
                descripcion TEXT,
                categoria TEXT,
                unidad TEXT,
                costo REAL,
                sku TEXT,
                imagen TEXT,
                sincronizado INTEGER DEFAULT 1,
                activo INTEGER DEFAULT 1,
                updatedAt TEXT
            );
            `);

            // Tabla de Sesiones (Inventarios)
            await executeSql(`
        CREATE TABLE IF NOT EXISTS sesiones(
                _id TEXT PRIMARY KEY,
                numeroSesion TEXT,
                fecha TEXT,
                estado TEXT,
                clienteNombre TEXT,
                totalProductos INTEGER DEFAULT 0,
                valorTotal REAL DEFAULT 0,
                sincronizado INTEGER DEFAULT 1,
                local INTEGER DEFAULT 0,
                createdAt TEXT
            );
            `);

            // Tabla de Productos Contados (Detalle de Sesión)
            await executeSql(`
        CREATE TABLE IF NOT EXISTS productos_contados(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sesionId TEXT,
                productoId TEXT,
                cantidad REAL,
                fecha TEXT,
                sincronizado INTEGER DEFAULT 0,
                FOREIGN KEY(sesionId) REFERENCES sesiones(_id),
                FOREIGN KEY(productoId) REFERENCES productos(_id)
            );
            `);

      // Tabla de Productos Colaborador (Offline)
      await executeSql(`
        CREATE TABLE IF NOT EXISTS productos_colaborador(
                temporalId TEXT PRIMARY KEY,
                solicitudId TEXT,
                nombre TEXT,
                sku TEXT,
                codigoBarras TEXT,
                cantidad REAL,
                costo REAL,
                timestamp TEXT,
                sincronizado INTEGER DEFAULT 0
            );
            `);

            console.log('✅ Base de datos local inicializada');
            return true;
        } catch (error) {
            console.error('❌ Error inicializando DB local:', error);
            return false;
        }
    },

    // --- PRODUCTOS ---

    // Guardar o actualizar productos (desde el backend)
    guardarProductos: async (productos) => {
        const promises = productos.map(p => {
            return executeSql(`
        INSERT OR REPLACE INTO productos(_id, nombre, codigoBarras, precioVenta, stock, descripcion, categoria, unidad, costo, sku, imagen, sincronizado, activo, updatedAt)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
            `, [
                p._id,
                p.nombre,
                p.codigoBarras,
                p.precioVenta || 0,
                p.stock || 0,
                p.descripcion,
                p.categoria,
                p.unidad,
                p.costo || 0,
                p.sku,
                p.imagen,
                p.activo ? 1 : 0,
                new Date().toISOString()
            ]);
        });
        await Promise.all(promises);
    },

    // Obtener productos locales
    obtenerProductos: async (busqueda = '') => {
        let query = 'SELECT * FROM productos WHERE activo = 1';
        let params = [];

        if (busqueda) {
            query += ' AND (nombre LIKE ? OR codigoBarras LIKE ?)';
            params = [`%${busqueda}%`, `%${busqueda}%`];
        }

        query += ' ORDER BY nombre LIMIT 50';

        const result = await executeSql(query, params);
        return result.rows._array;
    },

    // Buscar producto por código de barras
    buscarProductoPorCodigo: async (codigo) => {
        const result = await executeSql('SELECT * FROM productos WHERE codigoBarras = ? AND activo = 1', [codigo]);
        return result.rows.length > 0 ? result.rows.item(0) : null;
    },

    // --- SESIONES ---

    // Guardar sesiones (desde backend)
    guardarSesiones: async (sesiones) => {
        const promises = sesiones.map(s => {
            return executeSql(`
        INSERT OR REPLACE INTO sesiones(_id, numeroSesion, fecha, estado, clienteNombre, totalProductos, valorTotal, sincronizado, local, createdAt)
            VALUES(?, ?, ?, ?, ?, ?, ?, 1, 0, ?);
            `, [
                s._id,
                s.numeroSesion,
                s.fecha,
                s.estado,
                s.clienteNegocio?.nombre || 'Cliente',
                s.totales?.totalProductosContados || 0,
                s.totales?.valorTotalInventario || 0,
                s.createdAt
            ]);
        });
        await Promise.all(promises);
    },

    // Crear sesión local (Offline)
    crearSesionLocal: async (sesion) => {
        await executeSql(`
      INSERT INTO sesiones(_id, numeroSesion, fecha, estado, clienteNombre, totalProductos, valorTotal, sincronizado, local, createdAt)
            VALUES(?, ?, ?, ?, ?, 0, 0, 0, 1, ?);
            `, [
            sesion._id, // Generar un ID temporal (UUID)
            sesion.numeroSesion,
            sesion.fecha,
            'en_progreso',
            sesion.clienteNombre,
            new Date().toISOString()
        ]);
    },

    // Obtener sesiones locales
    obtenerSesiones: async () => {
        const result = await executeSql('SELECT * FROM sesiones ORDER BY fecha DESC');
        return result.rows._array;
    },

    // --- LIMPIEZA ---
    limpiarTodo: async () => {
    await executeSql('DELETE FROM productos');
    await executeSql('DELETE FROM sesiones');
    await executeSql('DELETE FROM productos_contados');
    await executeSql('DELETE FROM productos_colaborador');
  },

  // --- COLABORADOR ---

  // Guardar producto colaborador (Offline)
  guardarProductoColaborador: async (item, solicitudId) => {
    await executeSql(`
      INSERT OR REPLACE INTO productos_colaborador(temporalId, solicitudId, nombre, sku, codigoBarras, cantidad, costo, timestamp, sincronizado)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, 0);
            `, [
      item.temporalId,
      solicitudId,
      item.nombre,
      item.sku,
      item.codigoBarras,
      item.cantidad,
      item.costo,
      item.timestamp
    ]);
  },

  // Obtener productos colaborador por solicitud
  obtenerProductosColaborador: async (solicitudId) => {
    const result = await executeSql('SELECT * FROM productos_colaborador WHERE solicitudId = ? ORDER BY timestamp DESC', [solicitudId]);
    return result.rows._array.map(row => ({
      ...row,
      offline: true // Marcar como offline para la UI
    }));
  },

  // Eliminar producto colaborador
  eliminarProductoColaborador: async (temporalId) => {
    await executeSql('DELETE FROM productos_colaborador WHERE temporalId = ?', [temporalId]);
  },

  // Limpiar productos colaborador (después de sync)
  limpiarProductosColaborador: async (solicitudId) => {
    await executeSql('DELETE FROM productos_colaborador WHERE solicitudId = ?', [solicitudId]);
  }
};

export default localDb;
