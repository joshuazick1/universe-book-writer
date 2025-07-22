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
        // Map _id to id for all universes for consistency
        const mapped = universes.map(u => {
            // Support both MongoDB (_id) and standard (id) properties
            const anyU = u as any;
            return {
                ...u,
                id: anyU._id ?? anyU.id,
            };
        });
        res.json(mapped);
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
        const id = req.params.id;
        // Try both id and _id for MongoDB compatibility
        let ok = await updateUniverseAndInvalidate(id, req.body);
        if (!ok && id.startsWith('ObjectId(')) {
            // If the id is wrapped as ObjectId, try stripping it
            const stripped = id.replace(/^ObjectId\((['"])?(.*?)(['"])?\)$/, '$2');
            ok = await updateUniverseAndInvalidate(stripped, req.body);
        }
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
        const id = req.params.id;
        let ok = await deleteUniverseAndInvalidate(id);
        if (!ok && id.startsWith('ObjectId(')) {
            const stripped = id.replace(/^ObjectId\((['"])?(.*?)(['"])?\)$/, '$2');
            ok = await deleteUniverseAndInvalidate(stripped);
        }
        if (ok) res.json({ success: true });
        else res.status(404).json({ error: 'Universe not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete universe' });
    }
});

export default router;
