import { Router } from 'express';
import { populateSampleData } from '../../controllers/sampleDataController.js';

/**
 * Sample data population endpoint.
 */
const router = Router();

// POST /api/sample/populate
router.post('/populate', populateSampleData);

export default router;
