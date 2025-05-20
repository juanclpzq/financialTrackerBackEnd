// src/routes/migration.routes.js

import { Router } from 'express';
import { runTransactionMigration } from '../controllers/migration.js';


const router = Router();

router.post('/migrate/transaction-origin', runTransactionMigration);

export default router;