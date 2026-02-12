
import dbManager from './src/config/database.js';
import ProductoGeneral from './src/models/ProductoGeneral.js';

const run = () => {
    try {
        console.log('Initializing DB...');
        dbManager.initialize();

        const db = dbManager.getDatabase();

        // Check count before
        const countBefore = db.prepare('SELECT COUNT(*) as c FROM productos_generales').get().c;
        console.log(`Products before delete: ${countBefore}`);

        if (countBefore === 0) {
            console.log('No products to delete. Inserting one test product...');
            ProductoGeneral.crear({
                nombre: 'Test Product ' + Date.now(),
                costoBase: 100
            });
            const countAfterInsert = db.prepare('SELECT COUNT(*) as c FROM productos_generales').get().c;
            console.log(`Products after test insert: ${countAfterInsert}`);
        }

        console.log('Attempting to delete all products...');
        const deletedCount = ProductoGeneral.eliminarTodos();
        console.log(`Deleted count returned: ${deletedCount}`);

        // Check count after
        const countAfter = db.prepare('SELECT COUNT(*) as c FROM productos_generales').get().c;
        console.log(`Products after delete: ${countAfter}`);

        if (countAfter === 0) {
            console.log('SUCCESS: All products deleted.');
        } else {
            console.error('FAILURE: Products still exist.');
        }

    } catch (error) {
        console.error('Error executing script:', error);
    }
};

run();
