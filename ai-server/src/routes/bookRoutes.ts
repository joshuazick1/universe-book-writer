import * as express from 'express';

import type { Request, Response, NextFunction } from 'express';
import {
  fetchBooks,
  createBook,
  updateBook,
  deleteBook,
  createChapter,
  fetchChapters,
  updateChapter,
  deleteChapter,
} from '../repositories/ragNodeRepository.js';

const router: any = express.default.Router();

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
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  const { universeId } = req.query;
  if (!universeId) {
    return res.status(400).json({ error: 'universeId is required' });
  }
  fetchBooks(universeId as string)
    .then(books => res.json(books))
    .catch(err => res.status(500).json({ error: 'Failed to fetch books' }));
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
router.post('/', (req: Request, res: Response, next: NextFunction) => {
  const { universeId } = req.query;
  const { title, ...rest } = req.body;
  if (!universeId) {
    return res.status(400).json({ error: 'universeId is required' });
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Book title is required' });
  }
  // Generate unique ID: base64 of title + timestamp
  const base64Title = Buffer.from(title.trim()).toString('base64').replace(/=+$/, '');
  const id = `bok-${base64Title}-${Date.now()}`;
  const bookData = { id, type: 'book', universeId, title, ...rest };
  createBook(universeId as string, bookData)
    .then(created => res.status(201).json(created))
    .catch(err => res.status(500).json({ error: 'Failed to create book' }));
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
router.put('/', (req: Request, res: Response, next: NextFunction) => {
  const { universeId, bookId } = req.query;
  if (!universeId || !bookId) {
    return res.status(400).json({ error: 'universeId and bookId are required' });
  }
  updateBook(universeId as string, bookId as string, req.body)
    .then(ok => {
      if (ok) res.json({ success: true });
      else res.status(404).json({ error: 'Book not found' });
    })
    .catch(err => res.status(500).json({ error: 'Failed to update book' }));
});

/**
 * @swagger
 * /api/books/{bookId}:
 *   delete:
 *     summary: Delete a book for a universe
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: bookId
 *         schema:
 *           type: string
 *         required: true
 *         description: Book ID
 *       - in: query
 *         name: universeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Universe ID
 *     responses:
 *       200:
 *         description: Book deleted
 *       404:
 *         description: Book not found
 */
router.delete('/:bookId', (req: Request, res: Response, next: NextFunction) => {
  const { universeId } = req.query;
  const { bookId } = req.params;
  if (!universeId || !bookId) {
    return res.status(400).json({ error: 'universeId and bookId are required' });
  }
  deleteBook(universeId as string, bookId as string)
    .then(ok => {
      if (ok) res.json({ success: true });
      else res.status(404).json({ error: 'Book not found' });
    })
    .catch(err => res.status(500).json({ error: 'Failed to delete book' }));
});

export default router;

/**
 * --- Chapter Routes migrated from chapterRoutes.ts ---
 * All chapter-related endpoints are now defined here for unified book/chapter API management.
 */

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
router.get('/chapters', (req: Request, res: Response, next: NextFunction) => {
  const bookId = String(req.query.bookId);
  if (!bookId) {
    return res.status(400).json({ error: 'bookId is required' });
  }
  fetchChapters(bookId)
    .then(chapters => res.json(chapters))
    .catch(next);
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
router.post('/chapters', (req: Request, res: Response, next: NextFunction) => {
  const bookId = String(req.query.bookId);
  if (!bookId) {
    return res.status(400).json({ error: 'bookId is required' });
  }
  const { title, ...rest } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Chapter title is required' });
  }
  // Generate unique ID: base64 of title + timestamp
  const base64Title = Buffer.from(title.trim()).toString('base64').replace(/=+$/, '');
  const id = `chp-${base64Title}-${Date.now()}`;
  const chapterData = { id, type: 'chapter', bookId, title, ...rest };
  createChapter(bookId, chapterData)
    .then(created => res.status(201).json(created))
    .catch(next);
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
router.put('/chapters', (req: Request, res: Response, next: NextFunction) => {
  const bookId = String(req.query.bookId);
  const chapterId = String(req.query.chapterId);
  if (!bookId || !chapterId) {
    return res.status(400).json({ error: 'bookId and chapterId are required' });
  }
  updateChapter(bookId, chapterId, req.body)
    .then(ok => {
      if (ok) res.json({ success: true });
      else res.status(404).json({ error: 'Chapter not found' });
    })
    .catch(err => res.status(500).json({ error: 'Failed to update chapter' }));
});

/**
 * @swagger
 * /api/books/{bookId}/chapters/{chapterId}:
 *   delete:
 *     summary: Delete a chapter for a book
 *     tags: [Chapters]
 *     parameters:
 *       - in: path
 *         name: bookId
 *         schema:
 *           type: string
 *         required: true
 *         description: Book ID
 *       - in: path
 *         name: chapterId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter deleted
 *       404:
 *         description: Chapter not found
 */
router.delete('/books/:bookId/chapters/:chapterId', (req: Request, res: Response, next: NextFunction) => {
  const bookId = String(req.params.bookId);
  const chapterId = String(req.params.chapterId);
  if (!bookId || !chapterId) {
    return res.status(400).json({ error: 'bookId and chapterId are required' });
  }
  deleteChapter(bookId, chapterId)
    .then(ok => {
      if (ok) res.json({ success: true });
      else res.status(404).json({ error: 'Chapter not found' });
    })
    .catch(err => res.status(500).json({ error: 'Failed to delete chapter' }));
});

// --- RESTful routes for chapters ---
router.post('/:bookId/chapters', (req: Request, res: Response, next: NextFunction) => {
  const bookId = String(req.params.bookId);
  if (!bookId) {
    return res.status(400).json({ error: 'bookId is required' });
  }
  const { title, ...rest } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Chapter title is required' });
  }
  // Generate unique ID: base64 of title + timestamp
  const base64Title = Buffer.from(title.trim()).toString('base64').replace(/=+$/, '');
  const id = `chp-${base64Title}-${Date.now()}`;
  const chapterData = { id, type: 'chapter', bookId, title, ...rest };
  createChapter(bookId, chapterData)
    .then(created => res.status(201).json(created))
    .catch(next);
});

router.get('/:bookId/chapters', (req: Request, res: Response, next: NextFunction) => {
  const bookId = String(req.params.bookId);
  if (!bookId) {
    return res.status(400).json({ error: 'bookId is required' });
  }
  fetchChapters(bookId)
    .then(chapters => res.json(chapters))
    .catch(next);
});

router.put('/:bookId/chapters/:chapterId', (req: Request, res: Response, next: NextFunction) => {
  const bookId = String(req.params.bookId);
  const chapterId = String(req.params.chapterId);
  if (!bookId || !chapterId) {
    return res.status(400).json({ error: 'bookId and chapterId are required' });
  }
  updateChapter(bookId, chapterId, req.body)
    .then(ok => {
      if (ok) res.json({ success: true });
      else res.status(404).json({ error: 'Chapter not found' });
    })
    .catch(err => res.status(500).json({ error: 'Failed to update chapter' }));
});
