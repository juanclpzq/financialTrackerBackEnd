import express from 'express';
import { createTransaction,
    getAllTransactions,
    checkInitialBalance,
    createBulkTransactions,
    updateTransaction
 } from '../controllers/transaction.js';



const router = express.Router();




// Obtener todas las transacciones
 router.get('/', getAllTransactions);

// Crear una nueva transacción
router.post('/', createTransaction);

// Ruta para verificar el saldo inicial
router.get('/check-initial-balance', checkInitialBalance);

// Ruta para insertar varias transacciones
router.post('/bulk', createBulkTransactions);

// Ruta para actualizar una transacción
router.patch('/:id', updateTransaction);



export default router;