// src/controllers/migration.controller.js

import { Transaction } from '../models/Transaction.js';
import mongoose from 'mongoose';

// Función auxiliar para obtener conteos
const getTransactionCounts = async () => {
  return {
    total: await Transaction.countDocuments(),
    banks: await Transaction.countDocuments({ category: 'banks' }),
    cash: await Transaction.countDocuments({ category: 'cash' }),
    sites: await Transaction.countDocuments({ site: { $ne: null } }),
    unassigned: await Transaction.countDocuments({
      transactionOrigin: { $exists: false }
    })
  };
};

// Función principal de migración
const migrateTransactions = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const beforeCounts = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          banks: {
            $sum: { $cond: [{ $eq: ["$category", "banks"] }, 1, 0] }
          },
          cash: {
            $sum: { $cond: [{ $eq: ["$category", "cash"] }, 1, 0] }
          },
          sites: {
            $sum: { $cond: [{ $ne: ["$site", null] }, 1, 0] }
          },
          unassigned: {
            $sum: { $cond: [{ $eq: ["$transactionOrigin", null] }, 1, 0] }
          }
        }
      }
    ]);
    console.log('Estado inicial:', beforeCounts[0]);

    // 1. Actualizar primero las transacciones con site
    const siteResults = await Transaction.updateMany(
      {
        site: { $ne: null },
        transactionOrigin: { $exists: false }
      },
      {
        $set: { transactionOrigin: 'sites' }
      },
      { session }
    );
    console.log('Actualización de obras:', siteResults);

    // 2. Actualizar transacciones bancarias generales
    const bankResults = await Transaction.updateMany(
      {
        category: 'banks',
        site: null,
        transactionOrigin: { $exists: false }
      },
      {
        $set: { transactionOrigin: 'generalBanks' }
      },
      { session }
    );
    console.log('Actualización de bancos generales:', bankResults);

    // 3. Actualizar transacciones de efectivo generales
    const cashResults = await Transaction.updateMany(
      {
        category: 'cash',
        site: null,
        transactionOrigin: { $exists: false }
      },
      {
        $set: { transactionOrigin: 'generalCash' }
      },
      { session }
    );
    console.log('Actualización de efectivo general:', cashResults);

    // Verificar resultados
    const afterCounts = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          generalBanks: {
            $sum: { $cond: [{ $eq: ["$transactionOrigin", "generalBanks"] }, 1, 0] }
          },
          generalCash: {
            $sum: { $cond: [{ $eq: ["$transactionOrigin", "generalCash"] }, 1, 0] }
          },
          sites: {
            $sum: { $cond: [{ $eq: ["$transactionOrigin", "sites"] }, 1, 0] }
          }
        }
      }
    ], { session });

    console.log('Estado final:', afterCounts[0]);

    const totalAssigned = afterCounts[0].generalBanks + afterCounts[0].generalCash + afterCounts[0].sites;
    const unassigned = afterCounts[0].total - totalAssigned;

    if (unassigned > 0) {
      throw new Error(`Quedan ${unassigned} transacciones sin origen asignado`);
    }

    await session.commitTransaction();

    return {
      success: true,
      results: {
        sites: siteResults.modifiedCount,
        generalBanks: bankResults.modifiedCount,
        generalCash: cashResults.modifiedCount
      },
      counts: afterCounts[0]
    };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

// Verificar estado actual de la migración
export const checkMigrationStatus = async (req, res) => {
  try {
    const counts = await getTransactionCounts();

    res.json({
      status: counts.unassigned === 0 ? 'completed' : 'pending',
      counts
    });
  } catch (error) {
    console.error('Error verificando estado de migración:', error);
    res.status(500).json({
      message: 'Error verificando estado de migración',
      error: error.message
    });
  }
};

// Ejecutar la migración
export const runTransactionMigration = async (req, res) => {
  try {
    // Verificar si ya se completó la migración
    const initialCounts = await getTransactionCounts();
    if (initialCounts.unassigned === 0) {
      return res.json({
        message: 'La migración ya fue completada anteriormente',
        counts: initialCounts
      });
    }

    // Ejecutar migración
    const result = await migrateTransactions();

    res.json({
      message: 'Migración completada exitosamente',
      ...result
    });

  } catch (error) {
    console.error('Error en la migración:', error);
    res.status(500).json({
      message: 'Error ejecutando la migración',
      error: error.message
    });
  }
};

// Revertir la migración (útil para pruebas)
export const revertMigration = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const result = await Transaction.updateMany(
      { transactionOrigin: { $exists: true } },
      { $unset: { transactionOrigin: "" } },
      { session }
    );

    await session.commitTransaction();

    res.json({
      message: 'Migración revertida exitosamente',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      message: 'Error revirtiendo la migración',
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Obtener estadísticas detalladas
export const getMigrationStats = async (req, res) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: {
            origin: '$transactionOrigin',
            category: '$category'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({ stats });
  } catch (error) {
    res.status(500).json({
      message: 'Error obteniendo estadísticas',
      error: error.message
    });
  }
};

export default {
  checkMigrationStatus,
  runTransactionMigration,
  revertMigration,
  getMigrationStats
};