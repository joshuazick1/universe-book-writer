import { RAGService } from '../ragService';
import type { Universe, Book, Chapter, Character } from '../../types/rag';

describe('RAGService CRUD', () => {
    let service: RAGService;
    beforeEach(() => {
        service = new RAGService();
    });

    it('should fetch universes', async () => {
        const universes = await service.getUniverses();
        expect(Array.isArray(universes)).toBe(true);
        if (universes.length > 0) {
            expect(universes[0]).toHaveProperty('id');
            expect(universes[0]).toHaveProperty('title');
        }
    });

    it('should create, update, and delete a universe', async () => {
        const created = await service.createUniverse({ title: 'Test Universe', description: 'desc' });
        expect(created).toHaveProperty('id');
        expect(created.title).toBe('Test Universe');

        const updated = await service.updateUniverse(created.id, { title: 'Updated Universe' });
        expect(updated.title).toBe('Updated Universe');

        await expect(service.deleteUniverse(created.id)).resolves.toBeUndefined();
    });

    it('should fetch books for a universe', async () => {
        const universes = await service.getUniverses();
        if (universes.length === 0) return;
        const books = await service.getBooks(universes[0].id);
        expect(Array.isArray(books)).toBe(true);
    });

    it('should create, update, and delete a book', async () => {
        const universes = await service.getUniverses();
        if (universes.length === 0) return;
        const universeId = universes[0].id;
        const created = await service.createBook({ universeId, title: 'Test Book' });
        expect(created).toHaveProperty('id');
        expect(created.title).toBe('Test Book');

        const updated = await service.updateBook(created.id, { title: 'Updated Book' });
        expect(updated.title).toBe('Updated Book');

        await expect(service.deleteBook(created.id)).resolves.toBeUndefined();
    });

    it('should fetch chapters for a book', async () => {
        const universes = await service.getUniverses();
        if (universes.length === 0) return;
        const books = await service.getBooks(universes[0].id);
        if (books.length === 0) return;
        const chapters = await service.getChapters(books[0].id);
        expect(Array.isArray(chapters)).toBe(true);
    });

    it('should create, update, and delete a chapter', async () => {
        const universes = await service.getUniverses();
        if (universes.length === 0) return;
        const books = await service.getBooks(universes[0].id);
        if (books.length === 0) return;
        const bookId = books[0].id;
        const universeId = universes[0].id;
        const created = await service.createChapter({ bookId, universeId, title: 'Test Chapter' });
        expect(created).toHaveProperty('id');
        expect(created.title).toBe('Test Chapter');

        const updated = await service.updateChapter(created.id, { title: 'Updated Chapter' });
        expect(updated.title).toBe('Updated Chapter');

        await expect(service.deleteChapter(created.id)).resolves.toBeUndefined();
    });

    it('should fetch characters for a universe', async () => {
        const universes = await service.getUniverses();
        if (universes.length === 0) return;
        const characters = await service.getCharacters({ universeId: universes[0].id });
        expect(Array.isArray(characters)).toBe(true);
    });

    it('should create, update, and delete a character', async () => {
        const universes = await service.getUniverses();
        if (universes.length === 0) return;
        const universeId = universes[0].id;
        const created = await service.createCharacter({ universeId, name: 'Test Character' });
        expect(created).toHaveProperty('id');
        expect(created.name).toBe('Test Character');

        const updated = await service.updateCharacter(created.id, { name: 'Updated Character' });
        expect(updated.name).toBe('Updated Character');

        await expect(service.deleteCharacter(created.id)).resolves.toBeUndefined();
    });
});
