// routes/dashboard.js
import express from 'express';
import { getDashboardData } from '../controllers/dashboard.js';

const router = express.Router();

router.get('/', getDashboardData);

export default router;