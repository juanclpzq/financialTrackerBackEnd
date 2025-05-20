// src/scripts/migrations/transactionOriginMigration.js

import { Transaction } from '../../models/Transaction.js';

export const migrateTransactions = async () => {
    try {
        // Actualizar transacciones bancarias
        await Transaction.updateMany(
            { category: 'banks' },
            { $set: { transactionOrigin: 'bank' } }
        );

        // Actualizar transacciones de efectivo
        await Transaction.updateMany(
            { category: 'cash' },
            { $set: { transactionOrigin: 'cash' } }
        );

        // Actualizar transacciones de obras (las que tienen site)
        await Transaction.updateMany(
            { site: { $ne: null } },
            { $set: { transactionOrigin: 'site' } }
        );

        console.log('Migración completada exitosamente');
    } catch (error) {
        console.error('Error en la migración:', error);
    }
};