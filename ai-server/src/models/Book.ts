// ai-server/src/models/Book.ts
import type { Chapter } from './Chapter.js';

// Deprecated: Book type is now defined in shared/types/nodeTypes.ts
// Remove this file; import Book directly from shared/types/nodeTypes.ts where needed.
}
    readonly id: string;
    readonly type: 'book';
    readonly universeId: string;
    readonly title: string;
    readonly description ?: string;
    readonly metadata ?: Record<string, unknown>;
    readonly chapters ?: Chapter[];
}
