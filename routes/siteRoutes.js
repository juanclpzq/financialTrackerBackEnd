import express from 'express';
import { createSite, getAllSites, getSiteById, updateSite, deleteSite } from '../controllers/site.js';

const router = express.Router();

// Rutas públicas
router.get('/', getAllSites);
router.get('/:id', getSiteById);

// Rutas que requerirán autenticación
router.post('/', createSite);
router.put('/:id', updateSite);
router.delete('/:id', deleteSite);

export default router;