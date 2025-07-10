// ai-server/src/models/Book.ts
export interface Book {
    readonly id: string;
    readonly type: 'book';
    readonly universeId: string;
    readonly title: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}
