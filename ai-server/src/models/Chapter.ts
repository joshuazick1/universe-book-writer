// ai-server/src/models/Chapter.ts
export interface Chapter {
    readonly id: string;
    readonly type: 'chapter';
    readonly universeId: string;
    readonly bookId: string;
    readonly title: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}
