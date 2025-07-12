import { Router } from 'express';
import {
    getChapters,
    createChapterAndInvalidate,
    updateChapterAndInvalidate,
    deleteChapterAndInvalidate
} from '../services/chapterService.js';

const router = Router();

/**
 * @swagger
 * /api/chapters:
 *   get:
 *     summary: List chapters for a book
 *     tags: [Chapters]
 *     parameters:
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: string
 *         required: true
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Array of chapters
 */
router.get('/', (req, res, next) => {
    (async () => {
        const { bookId } = req.query;
        if (!bookId) {
            return res.status(400).json({ error: 'bookId is required' });
        }
        try {
            const chapters = await getChapters(bookId as string);
            res.json(chapters);
        } catch (err) {
            res.status(500).json({ error: 'Failed to fetch chapters' });
        }
    })().catch(next);
});


/**
 * @swagger
 * /api/chapters:
 *   post:
 *     summary: Create a new chapter for a book
 *     tags: [Chapters]
 *     parameters:
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
 *             $ref: '#/components/schemas/Chapter'
 *     responses:
 *       201:
 *         description: Chapter created
 */
router.post('/', (req, res, next) => {
    (async () => {
        const { bookId } = req.query;
        if (!bookId) {
            return res.status(400).json({ error: 'bookId is required' });
        }
        try {
            const created = await createChapterAndInvalidate(bookId as string, req.body);
            res.status(201).json(created);
        } catch (err) {
            res.status(500).json({ error: 'Failed to create chapter' });
        }
    })().catch(next);
});


/**
 * @swagger
 * /api/chapters:
 *   put:
 *     summary: Update a chapter for a book
 *     tags: [Chapters]
 *     parameters:
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: string
 *         required: true
 *         description: Book ID
 *       - in: query
 *         name: chapterId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chapter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Chapter'
 *     responses:
 *       200:
 *         description: Chapter updated
 */
router.put('/', (req, res, next) => {
    (async () => {
        const { bookId, chapterId } = req.query;
        if (!bookId || !chapterId) {
            return res.status(400).json({ error: 'bookId and chapterId are required' });
        }
        try {
            const ok = await updateChapterAndInvalidate(bookId as string, chapterId as string, req.body);
            if (ok) res.json({ success: true });
            else res.status(404).json({ error: 'Chapter not found' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to update chapter' });
        }
    })().catch(next);
});


/**
 * @swagger
 * /api/chapters:
 *   delete:
 *     summary: Delete a chapter for a book
 *     tags: [Chapters]
 *     parameters:
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: string
 *         required: true
 *         description: Book ID
 *       - in: query
 *         name: chapterId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter deleted
 */
router.delete('/', (req, res, next) => {
    (async () => {
        const { bookId, chapterId } = req.query;
        if (!bookId || !chapterId) {
            return res.status(400).json({ error: 'bookId and chapterId are required' });
        }
        try {
            const ok = await deleteChapterAndInvalidate(bookId as string, chapterId as string);
            if (ok) res.json({ success: true });
            else res.status(404).json({ error: 'Chapter not found' });
        } catch (err) {
            res.status(500).json({ error: 'Failed to delete chapter' });
        }
    })().catch(next);
});


export default router;
