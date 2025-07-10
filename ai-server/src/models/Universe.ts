// ai-server/src/models/Universe.ts
export interface Universe {
    readonly id: string;
    readonly type: 'universe';
    readonly title: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}
