import { Router } from 'express';
import {
  getUniverses,
  createUniverseAndInvalidate,
  updateUniverseAndInvalidate,
  deleteUniverseAndInvalidate,
} from '../services/universeService.js';
import { createBook } from '../repositories/ragNodeRepository.js';

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
router.get('/', (req, res) => {
  try {
    const universes = getUniverses();
    universes
      .then(uList => {
        const mapped = uList.map(u => {
          const anyU = u;
          return {
            ...u,
            id: (anyU as any)._id ?? anyU.id,
          };
          return {
            ...u,
            id: (anyU as any)._id ?? anyU.id,
          };
        });
        res.json(mapped);
      })
      .catch(() => res.status(500).json({ error: 'Failed to fetch universes' }));
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
// @ts-expect-error Express type inference false positive
router.post('/', async (req, res) => {
  try {
    const { title, ...rest } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Universe title is required' });
    }
    // Check for duplicate title
    const existing = await getUniverses();
    if (existing.some(u => u.title.trim().toLowerCase() === title.trim().toLowerCase())) {
      return res.status(409).json({ error: 'Universe with this title already exists' });
    }
    // Generate unique ID: base64 of title + timestamp
    const base64Title = Buffer.from(title.trim()).toString('base64').replace(/=+$/, '');
    const id = `unv-${base64Title}-${Date.now()}`;
    const universeData = { id, type: 'universe', title, ...rest };
    const created = await createUniverseAndInvalidate(universeData);
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
router.put('/:id', (req, res) => {
  const id = req.params.id;
  updateUniverseAndInvalidate(id, req.body)
    .then(ok => {
      if (!ok && id.startsWith('ObjectId(')) {
        const stripped = id.replace(/^ObjectId\((['"])?(.*?)(['"])?\)$/, '$2');
        return updateUniverseAndInvalidate(stripped, req.body);
      }
      return ok;
    })
    .then(ok => {
      if (ok) res.json({ success: true });
      else res.status(404).json({ error: 'Universe not found' });
    })
    .catch(() => res.status(500).json({ error: 'Failed to update universe' }));
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
router.delete('/:id', (req, res) => {
  const id = req.params.id;
  deleteUniverseAndInvalidate(id)
    .then(ok => {
      if (!ok && id.startsWith('ObjectId(')) {
        const stripped = id.replace(/^ObjectId\((['"])?(.*?)(['"])?\)$/, '$2');
        return deleteUniverseAndInvalidate(stripped);
      }
      return ok;
    })
    .then(ok => {
      if (ok) res.json({ success: true });
      else res.status(404).json({ error: 'Universe not found' });
    })
    .catch(() => res.status(500).json({ error: 'Failed to delete universe' }));
});

// --- RESTful route for creating a book in a universe ---
// @ts-expect-error Express type inference false positive
router.post('/:universeId/books', (req, res, next) => {
  const { universeId } = req.params;
  if (!universeId) {
    return res.status(400).json({ error: 'universeId is required' });
  }
  createBook(universeId, req.body)
    .then(created => res.status(201).json(created))
    .catch(next);
});

export default router;
