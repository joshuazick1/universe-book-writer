// ai-server/src/models/Universe.ts
export interface Universe {
    readonly id: string;
    readonly type: 'universe';
    readonly title: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}
// Deprecated: Universe type is now defined in shared/types/nodeTypes.ts
// Remove this file; import Universe directly from shared/types/nodeTypes.ts where needed.
