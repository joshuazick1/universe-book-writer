import { Router } from 'express';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/userApiKeyController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All API key management routes require authentication
router.use(authMiddleware);

router.post('/user/api-keys', createApiKey);
router.get('/user/api-keys', listApiKeys);
router.post('/user/api-keys/:key/revoke', revokeApiKey);

export default router;
