import { Router } from 'express';
import type { Character } from '../../../shared/types/nodeTypes.js';
import { getCharacters, createCharacterAndInvalidate, updateCharacterAndInvalidate, deleteCharacterAndInvalidate } from '../services/characterService.js';

const router = Router();

/**
 * @swagger
 * /api/characters:
 *   get:
 *     summary: List characters (optionally filtered by universe, book, chapter)
 *     tags: [Characters]
 *     parameters:
 *       - in: query
 *         name: universeId
 *         schema:
 *           type: string
 *         required: false
 *         description: Universe ID
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: string
 *         required: false
 *         description: Book ID
 *       - in: query
 *         name: chapterId
 *         schema:
 *           type: string
 *         required: false
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Array of characters
 */
router.get('/', async (req, res) => {
    const { universeId, bookId, chapterId } = req.query;
    try {
        const characters = await getCharacters({
            universeId: universeId as string | undefined,
            bookId: bookId as string | undefined,
            chapterId: chapterId as string | undefined,
        });
        res.json(characters);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch characters' });
    }
});

/**
 * @swagger
 * /api/characters:
 *   post:
 *     summary: Create a new character
 *     tags: [Characters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - universeId
 *               - title
 *               - type
 *               - appearanceBookIds
 *               - appearanceChapterIds
 *               - appearanceSectionIds
 *             properties:
 *               id:
 *                 type: string
 *               universeId:
 *                 type: string
 *               title:
 *                 type: string
 *               name:
 *                 type: string
 *                 description: Canonical name (mirrors title)
 *               type:
 *                 type: string
 *                 enum: [character]
 *               aliases:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *               appearanceBookIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               appearanceChapterIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               appearanceSectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
 *               pronounLinks:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Links to pronouns/ambiguous references for AI-powered deduplication
 *               contextWindow:
 *                 type: string
 *                 description: Textual context window for this entity
 *               sourceReferences:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     documentId:
 *                       type: string
 *                     sectionId:
 *                       type: string
 *                     offset:
 *                       type: number
 *                     context:
 *                       type: string
 *                     extractor:
 *                       type: string
 *                 description: Provenance/source traceability for this entity
 *     responses:
 *       201:
 *         description: Character created
 */
// Canonical character node validation
function validateCanonicalCharacter(body: any): string | null {
    if (!body) return 'Missing request body';
    if (body.type !== 'character') return 'type must be "character"';
    if (!body.id || typeof body.id !== 'string') return 'Missing or invalid id';
    if (!body.universeId || typeof body.universeId !== 'string') return 'Missing or invalid universeId';
    if (!body.title || typeof body.title !== 'string') return 'Missing or invalid title';
    if (!Array.isArray(body.appearanceBookIds)) return 'appearanceBookIds must be an array';
    if (!Array.isArray(body.appearanceChapterIds)) return 'appearanceChapterIds must be an array';
    if (!Array.isArray(body.appearanceSectionIds)) return 'appearanceSectionIds must be an array';
    if ('aliases' in body && body.aliases !== undefined && !Array.isArray(body.aliases)) return 'aliases must be an array if present';
    if ('description' in body && body.description !== undefined && typeof body.description !== 'string') return 'description must be a string if present';
    if ('pronounLinks' in body && body.pronounLinks !== undefined && !Array.isArray(body.pronounLinks)) return 'pronounLinks must be an array if present';
    if ('contextWindow' in body && body.contextWindow !== undefined && typeof body.contextWindow !== 'string') return 'contextWindow must be a string if present';
    if ('sourceReferences' in body && body.sourceReferences !== undefined && !Array.isArray(body.sourceReferences)) return 'sourceReferences must be an array if present';
    return null;
}

router.post('/', async (req: any, res: any) => {
    const validationError = validateCanonicalCharacter(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    // Only allow canonical fields
    const {
        id, universeId, title, type, aliases, description,
        appearanceBookIds, appearanceChapterIds, appearanceSectionIds, metadata,
        pronounLinks, contextWindow, sourceReferences
    } = req.body;
    const canonicalCharacter: Character = {
        id,
        universeId,
        name: title, // For canonical compliance, name mirrors title
        type,
        aliases: aliases || [],
        description: description || '',
        appearanceBookIds,
        appearanceChapterIds,
        appearanceSectionIds,
        metadata: metadata || {},
    };
    try {
        const created = await createCharacterAndInvalidate(canonicalCharacter);
        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create character' });
    }
});

/**
 * @swagger
 * /api/characters/{id}:
 *   put:
 *     summary: Update a character
 *     tags: [Characters]
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
 *             $ref: '#/components/schemas/Character'
 *     responses:
 *       200:
 *         description: Character updated
 */
router.put('/:id', async (req: any, res: any) => {
    const validationError = validateCanonicalCharacter({ ...req.body, id: req.params.id });
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }
    // Only allow canonical fields
    const {
        universeId, title, type, aliases, description,
        appearanceBookIds, appearanceChapterIds, appearanceSectionIds, metadata,
        pronounLinks, contextWindow, sourceReferences
    } = req.body;
    const canonicalUpdate: Partial<Character> = {
        id: req.params.id,
        universeId,
        name: title,
        type,
        aliases: aliases || [],
        description: description || '',
        appearanceBookIds,
        appearanceChapterIds,
        appearanceSectionIds,
        metadata: metadata || {},
    };
    try {
        const ok = await updateCharacterAndInvalidate(req.params.id, canonicalUpdate);
        if (ok) res.json({ success: true });
        else res.status(404).json({ error: 'Character not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update character' });
    }
});

/**
 * @swagger
 * /api/characters/{id}:
 *   delete:
 *     summary: Delete a character
 *     tags: [Characters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Character deleted
 */
router.delete('/:id', async (req, res) => {
    try {
        const ok = await deleteCharacterAndInvalidate(req.params.id);
        if (ok) res.json({ success: true });
        else res.status(404).json({ error: 'Character not found' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete character' });
    }
});

export default router;

/**
 * @swagger
 * /api/characters/deduplication-status:
 *   get:
 *     summary: Get deduplication status for character candidates
 *     tags: [Characters]
 *     responses:
 *       200:
 *         description: Deduplication status and candidate clusters
 */
router.get('/deduplication-status', async (req, res) => {
    // Placeholder: Replace with real status retrieval logic
    // Example: Fetch from a service or cache
    res.json({
        status: 'ready',
        clusters: [], // List of candidate clusters for review
        lastRun: new Date().toISOString(),
    });
});

/**
 * @swagger
 * /api/characters/deduplicate:
 *   post:
 *     summary: Run deduplication on character candidates and return canonical nodes
 *     tags: [Characters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               candidates:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Character'
 *     responses:
 *       200:
 *         description: Deduplicated canonical character nodes
 */
router.post('/deduplicate', async (req, res) => {
    // Import deduplication helpers
    const { deduplicateCharacterCandidates, aiDeduplicateCharacterCandidates } = await import('../services/textToRagParser/utils/aiDeduplicationHelper.js');
    const candidates = req.body.candidates || [];
    const context = req.body.context || {};
    try {
        // Heuristic pass
        let deduped = await deduplicateCharacterCandidates(candidates, context);
        // AI-powered pass
        deduped = await aiDeduplicateCharacterCandidates(deduped, context);
        res.json({ canonicalCharacters: deduped });
    } catch (err) {
        res.status(500).json({ error: 'Deduplication failed', details: (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err) });
    }
});
