import { Router } from 'express';
import { fetchChapters, createChapter } from '../repositories/ragNodeRepository.js';

const router = Router();

/**
 * @swagger
 * /api/books/{bookId}/chapters:
 *   post:
 *     summary: Create a new chapter for a book
 *     tags: [Chapters]
 *     parameters:
 *       - in: path
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
// @ts-expect-error Express type inference false positive
router.post('/:bookId/chapters', (req, res, next) => {
  const bookId = String(req.params.bookId);
  if (!bookId) {
    return res.status(400).json({ error: 'bookId is required' });
  }
  createChapter(bookId, req.body)
    .then(created => res.status(201).json(created))
    .catch(next);
});

/**
 * @swagger
 * /api/books/{bookId}/chapters:
 *   get:
 *     summary: List chapters for a book
 *     tags: [Chapters]
 *     parameters:
 *       - in: path
 *         name: bookId
 *         schema:
 *           type: string
 *         required: true
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Array of chapters
 */
// @ts-expect-error Express type inference false positive
router.get('/:bookId/chapters', (req, res, next) => {
  const bookId = String(req.params.bookId);
  if (!bookId) {
    return res.status(400).json({ error: 'bookId is required' });
  }
  fetchChapters(bookId)
    .then(chapters => res.json(chapters))
    .catch(next);
});

export default router;
