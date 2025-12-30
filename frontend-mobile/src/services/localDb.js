import * as SQLite from 'expo-sqlite';

// Variable para almacenar la instancia de la base de datos
let db = null;

// Inicializar y obtener la base de datos (Expo SDK 51+)
const getDatabase = async () => {
    if (!db) {
        try {
            db = await SQLite.openDatabaseAsync('j4pro_local.db');
            console.log('✅ Base de datos local abierta exitosamente');
        } catch (error) {
            console.error('❌ Error abriendo base de datos:', error);
            throw error;
        }
    }
    return db;
};

const localDb = {
    // Inicializar base de datos y crear tablas
    init: async () => {
        try {
            const database = await getDatabase();
            
            // Tabla de Productos
            await database.execAsync(`
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
            await database.execAsync(`
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
            await database.execAsync(`
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
            await database.execAsync(`
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

            // Tabla de Cola de Sincronización (Outbox Pattern)
            await database.execAsync(`
                CREATE TABLE IF NOT EXISTS cola_sincronizacion(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tipo TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    estado TEXT DEFAULT 'pending',
                    intentos INTEGER DEFAULT 0,
                    ultimoIntento TEXT,
                    error TEXT,
                    createdAt TEXT,
                    updatedAt TEXT
                );
            `);

            // Tabla de Usuarios Locales
            await database.execAsync(`
                CREATE TABLE IF NOT EXISTS usuarios(
                    _id TEXT PRIMARY KEY,
                    nombre TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    rol TEXT DEFAULT 'administrador',
                    activo INTEGER DEFAULT 1,
                    createdAt TEXT,
                    updatedAt TEXT
                );
            `);

            // Crear usuario administrador por defecto si no existe
            const checkAdmin = await database.getFirstAsync(
                'SELECT * FROM usuarios WHERE email = ?',
                ['admin@j4pro.com']
            );

            if (!checkAdmin) {
                await database.runAsync(
                    `INSERT INTO usuarios (_id, nombre, email, password, rol, activo, createdAt, updatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        'admin-local-id',
                        'Administrador',
                        'admin@j4pro.com',
                        'Jose.1919', // Contraseña en texto plano para simplicidad
                        'administrador',
                        1,
                        new Date().toISOString(),
                        new Date().toISOString()
                    ]
                );
                console.log('✅ Usuario administrador creado: admin@j4pro.com / Jose.1919');
            }

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
        try {
            const database = await getDatabase();
            
            for (const p of productos) {
                await database.runAsync(
                    `INSERT OR REPLACE INTO productos(
                        _id, nombre, codigoBarras, precioVenta, stock, 
                        descripcion, categoria, unidad, costo, sku, 
                        imagen, sincronizado, activo, updatedAt
                    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
                    [
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
                    ]
                );
            }
        } catch (error) {
            console.error('Error guardando productos:', error);
            throw error;
        }
    },

    // Obtener productos locales
    obtenerProductos: async (busqueda = '') => {
        try {
            const database = await getDatabase();
            let query = 'SELECT * FROM productos WHERE activo = 1';
            let params = [];

            if (busqueda) {
                query += ' AND (nombre LIKE ? OR codigoBarras LIKE ?)';
                params = [`%${busqueda}%`, `%${busqueda}%`];
            }

            query += ' ORDER BY nombre LIMIT 50';

            const result = await database.getAllAsync(query, params);
            return result;
        } catch (error) {
            console.error('Error obteniendo productos:', error);
            return [];
        }
    },

    // Buscar producto por código de barras
    buscarProductoPorCodigo: async (codigo) => {
        try {
            const database = await getDatabase();
            const result = await database.getFirstAsync(
                'SELECT * FROM productos WHERE codigoBarras = ? AND activo = 1',
                [codigo]
            );
            return result || null;
        } catch (error) {
            console.error('Error buscando producto por código:', error);
            return null;
        }
    },

    // --- SESIONES ---

    // Guardar sesiones (desde backend)
    guardarSesiones: async (sesiones) => {
        try {
            const database = await getDatabase();
            
            for (const s of sesiones) {
                await database.runAsync(
                    `INSERT OR REPLACE INTO sesiones(
                        _id, numeroSesion, fecha, estado, clienteNombre, 
                        totalProductos, valorTotal, sincronizado, local, createdAt
                    ) VALUES(?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
                    [
                        s._id,
                        s.numeroSesion,
                        s.fecha,
                        s.estado,
                        s.clienteNegocio?.nombre || 'Cliente',
                        s.totales?.totalProductosContados || 0,
                        s.totales?.valorTotalInventario || 0,
                        s.createdAt
                    ]
                );
            }
        } catch (error) {
            console.error('Error guardando sesiones:', error);
            throw error;
        }
    },

    // Crear sesión local (Offline)
    crearSesionLocal: async (sesion) => {
        try {
            const database = await getDatabase();
            await database.runAsync(
                `INSERT INTO sesiones(
                    _id, numeroSesion, fecha, estado, clienteNombre, 
                    totalProductos, valorTotal, sincronizado, local, createdAt
                ) VALUES(?, ?, ?, ?, ?, 0, 0, 0, 1, ?)`,
                [
                    sesion._id,
                    sesion.numeroSesion,
                    sesion.fecha,
                    'en_progreso',
                    sesion.clienteNombre,
                    new Date().toISOString()
                ]
            );
        } catch (error) {
            console.error('Error creando sesión local:', error);
            throw error;
        }
    },

    // Obtener sesiones locales
    obtenerSesiones: async () => {
        try {
            const database = await getDatabase();
            const result = await database.getAllAsync(
                'SELECT * FROM sesiones ORDER BY fecha DESC'
            );
            return result;
        } catch (error) {
            console.error('Error obteniendo sesiones:', error);
            return [];
        }
    },

    // --- LIMPIEZA ---
    limpiarTodo: async () => {
        try {
            const database = await getDatabase();
            await database.execAsync(`
                DELETE FROM productos;
                DELETE FROM sesiones;
                DELETE FROM productos_contados;
                DELETE FROM productos_colaborador;
            `);
        } catch (error) {
            console.error('Error limpiando base de datos:', error);
            throw error;
        }
    },

    // --- COLABORADOR ---

    // Guardar producto colaborador (Offline)
    guardarProductoColaborador: async (item, solicitudId) => {
        try {
            const database = await getDatabase();
            await database.runAsync(
                `INSERT OR REPLACE INTO productos_colaborador(
                    temporalId, solicitudId, nombre, sku, codigoBarras, 
                    cantidad, costo, timestamp, sincronizado
                ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    item.temporalId,
                    solicitudId,
                    item.nombre,
                    item.sku,
                    item.codigoBarras,
                    item.cantidad,
                    item.costo,
                    item.timestamp
                ]
            );
        } catch (error) {
            console.error('Error guardando producto colaborador:', error);
            throw error;
        }
    },

    // Obtener productos colaborador por solicitud
    obtenerProductosColaborador: async (solicitudId) => {
        try {
            const database = await getDatabase();
            const result = await database.getAllAsync(
                'SELECT * FROM productos_colaborador WHERE solicitudId = ? ORDER BY timestamp DESC',
                [solicitudId]
            );
            return result.map(row => ({
                ...row,
                offline: true // Marcar como offline para la UI
            }));
        } catch (error) {
            console.error('Error obteniendo productos colaborador:', error);
            return [];
        }
    },

    // Eliminar producto colaborador
    eliminarProductoColaborador: async (temporalId) => {
        try {
            const database = await getDatabase();
            await database.runAsync(
                'DELETE FROM productos_colaborador WHERE temporalId = ?',
                [temporalId]
            );
        } catch (error) {
            console.error('Error eliminando producto colaborador:', error);
            throw error;
        }
    },

    // Limpiar productos colaborador (después de sync)
    limpiarProductosColaborador: async (solicitudId) => {
        try {
            const database = await getDatabase();
            await database.runAsync(
                'DELETE FROM productos_colaborador WHERE solicitudId = ?',
                [solicitudId]
            );
        } catch (error) {
            console.error('Error limpiando productos colaborador:', error);
            throw error;
        }
    },

    // --- COLA DE SINCRONIZACIÓN (Outbox Pattern) ---

    // Agregar tarea a la cola
    agregarAColaSincronizacion: async (tipo, payload) => {
        try {
            const database = await getDatabase();
            const result = await database.runAsync(
                `INSERT INTO cola_sincronizacion(
                    tipo, payload, estado, intentos, createdAt, updatedAt
                ) VALUES(?, ?, 'pending', 0, ?, ?)`,
                [
                    tipo,
                    JSON.stringify(payload),
                    new Date().toISOString(),
                    new Date().toISOString()
                ]
            );
            return result.lastInsertRowId;
        } catch (error) {
            console.error('Error agregando a cola:', error);
            throw error;
        }
    },

    // Obtener tareas pendientes
    obtenerTareasPendientes: async () => {
        try {
            const database = await getDatabase();
            const result = await database.getAllAsync(
                'SELECT * FROM cola_sincronizacion WHERE estado = ? ORDER BY createdAt ASC',
                ['pending']
            );
            return result.map(row => ({
                ...row,
                payload: JSON.parse(row.payload)
            }));
        } catch (error) {
            console.error('Error obteniendo tareas pendientes:', error);
            return [];
        }
    },

    // Marcar tarea como completada
    marcarTareaCompletada: async (id) => {
        try {
            const database = await getDatabase();
            await database.runAsync(
                `UPDATE cola_sincronizacion
                SET estado = 'completado', updatedAt = ?
                WHERE id = ?`,
                [new Date().toISOString(), id]
            );
        } catch (error) {
            console.error('Error marcando tarea completada:', error);
            throw error;
        }
    },

    // Marcar tarea como fallida
    marcarTareaFallida: async (id, error) => {
        try {
            const database = await getDatabase();
            await database.runAsync(
                `UPDATE cola_sincronizacion
                SET estado = 'error', intentos = intentos + 1, 
                    error = ?, ultimoIntento = ?, updatedAt = ?
                WHERE id = ?`,
                [error, new Date().toISOString(), new Date().toISOString(), id]
            );
        } catch (error) {
            console.error('Error marcando tarea fallida:', error);
            throw error;
        }
    },

    // Reintentar tarea
    reintentarTarea: async (id) => {
        try {
            const database = await getDatabase();
            await database.runAsync(
                `UPDATE cola_sincronizacion
                SET estado = 'pending', updatedAt = ?
                WHERE id = ?`,
                [new Date().toISOString(), id]
            );
        } catch (error) {
            console.error('Error reintentando tarea:', error);
            throw error;
        }
    },

    // Limpiar tareas completadas
    limpiarTareasCompletadas: async () => {
        try {
            const database = await getDatabase();
            await database.runAsync(
                'DELETE FROM cola_sincronizacion WHERE estado = ?',
                ['completado']
            );
        } catch (error) {
            console.error('Error limpiando tareas completadas:', error);
            throw error;
        }
    },

    // Obtener estadísticas de sincronización
    obtenerEstadisticasSincronizacion: async () => {
        try {
            const database = await getDatabase();
            const result = await database.getFirstAsync(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN estado = 'pending' THEN 1 ELSE 0 END) as pendientes,
                    SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) as completadas,
                    SUM(CASE WHEN estado = 'error' THEN 1 ELSE 0 END) as errores
                FROM cola_sincronizacion
            `);
            return result || { total: 0, pendientes: 0, completadas: 0, errores: 0 };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return { total: 0, pendientes: 0, completadas: 0, errores: 0 };
        }
    }
};

export default localDb;
