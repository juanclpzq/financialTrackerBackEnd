import express from 'express';
import {
  getAllBanks,
  getBankById,
  createBank,
  updateBank,
  deleteBank
} from '../controllers/bank.js';  


const router = express.Router();



// Rutas para bancos
router.get('/', getAllBanks);
router.get('/:id', getBankById);
router.post('/', createBank);
router.put('/:id', updateBank);
router.delete('/:id', deleteBank);

export default router;