import { Router } from 'express';
import {
    getUniverses,
    createUniverseAndInvalidate,
    updateUniverseAndInvalidate,
    deleteUniverseAndInvalidate
} from '../services/universeService.js';

const router = Router();

/**
 * @swagger
 * /api/universes:
 *   get:
 *     summary: List all universes
 *     tags: [Universes]
 *     responses:
 *       200:
 *         description: Array of universes
 */
router.get('/', async (req, res) => {
    try {
        const universes = await getUniverses();
        res.json(universes);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch universes' });
    }
});

/**
 * @swagger
 * /api/universes:
 *   post:
 *     summary: Create a new universe
 *     tags: [Universes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Universe'
 *     responses:
 *       201:
 *         description: Universe created
 */
router.post('/', async (req, res) => {
    try {
        const created = await createUniverseAndInvalidate(req.body);
        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create universe' });
    }
});

/**
 * @swagger
 * /api/universes/{id}:
 *   put:
 *     summary: Update a universe
 *     tags: [Universes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Universe'
 *     responses:
 *       200:
 *         description: Universe updated
 */
router.put('/:id', async (req, res) => {
    try {
        const ok = await updateUniverseAndInvalidate(req.params.id, req.body);
        if (ok) res.json({ success: true });
        else res.status(404).json({ error: 'Universe not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update universe' });
    }
});

/**
 * @swagger
 * /api/universes/{id}:
 *   delete:
 *     summary: Delete a universe
 *     tags: [Universes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Universe deleted
 */
router.delete('/:id', async (req, res) => {
    try {
        const ok = await deleteUniverseAndInvalidate(req.params.id);
        if (ok) res.json({ success: true });
        else res.status(404).json({ error: 'Universe not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete universe' });
    }
});

export default router;
