import { Router } from 'express';
let config = { modelDir: '/models' };

const router = Router();

router.get('/', (_req, res) => {
    res.json(config);
});

router.post('/', (req, res) => {
    config = { ...config, ...req.body };
    res.json({ success: true, config });
});

export default router;
