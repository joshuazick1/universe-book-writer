import { Router } from 'express';
import {
    getBooks,
    createBookAndInvalidate,
    updateBookAndInvalidate,
    deleteBookAndInvalidate
} from '../services/bookService.js';

const router = Router();

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: List books for a universe
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: universeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Universe ID
 *     responses:
 *       200:
 *         description: Array of books
 */
router.get('/', (req, res, next) => {
    (async () => {
        const { universeId } = req.query;
        if (!universeId) {
            return res.status(400).json({ error: 'universeId is required' });
        }
        try {
            const books = await getBooks(universeId as string);
            res.json(books);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch books' });
        }
    })().catch(next);
});


/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Create a new book for a universe
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: universeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Universe ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *     responses:
 *       201:
 *         description: Book created
 */
router.post('/', (req, res, next) => {
    (async () => {
        const { universeId } = req.query;
        if (!universeId) {
            return res.status(400).json({ error: 'universeId is required' });
        }
        try {
            const created = await createBookAndInvalidate(universeId as string, req.body);
            res.status(201).json(created);
        } catch (err) {
            res.status(500).json({ error: 'Failed to create book' });
        }
    })().catch(next);
});


/**
 * @swagger
 * /api/books:
 *   put:
 *     summary: Update a book for a universe
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: universeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Universe ID
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: string
 *         required: true
 *         description: Book ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Book'
 *     responses:
 *       200:
 *         description: Book updated
 */
router.put('/', (req, res, next) => {
    (async () => {
        const { universeId, bookId } = req.query;
        if (!universeId || !bookId) {
            return res.status(400).json({ error: 'universeId and bookId are required' });
        }
        try {
            const ok = await updateBookAndInvalidate(universeId as string, bookId as string, req.body);
            if (ok) res.json({ success: true });
            else res.status(404).json({ error: 'Book not found' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update book' });
        }
    })().catch(next);
});


/**
 * @swagger
 * /api/books:
 *   delete:
 *     summary: Delete a book for a universe
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: universeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Universe ID
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: string
 *         required: true
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book deleted
 */
router.delete('/', (req, res, next) => {
    (async () => {
        const { universeId, bookId } = req.query;
        if (!universeId || !bookId) {
            return res.status(400).json({ error: 'universeId and bookId are required' });
        }
        try {
            const ok = await deleteBookAndInvalidate(universeId as string, bookId as string);
            if (ok) res.json({ success: true });
            else res.status(404).json({ error: 'Book not found' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete book' });
        }
    })().catch(next);
});


export default router;
