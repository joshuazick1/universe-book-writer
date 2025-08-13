import { Router } from 'express';

const router = Router();

// Comprehensive quality report
router.get('/report', (req, res) => {
    res.json({ report: {} });
});

// Model-specific quality data
router.get('/model/:endpoint', (req, res) => {
    const { endpoint } = req.params;
    res.json({ endpoint, qualityData: {} });
});

// Trigger manual quality tests
router.post('/test/:endpoint', (req, res) => {
    const { endpoint } = req.params;
    res.json({ endpoint, testResult: {} });
});

export default router;
