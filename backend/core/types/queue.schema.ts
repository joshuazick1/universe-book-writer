/**
 * JSON schema and Zod validation for distributed queue Job and JobResult types.
 *
 * @module core/types/queue.schema
 * @see ./queue.ts
 */
import { z } from 'zod';

export const JobSchema = z.object({
    id: z.string().min(1),
    chunkId: z.string().min(1),
    type: z.string().min(1),
    payload: z.record(z.unknown()),
    metadata: z.record(z.unknown()).optional(),
    version: z.number().int().nonnegative(),
    dependencies: z.array(z.string()).optional(),
});

export type Job = z.infer<typeof JobSchema>;

export const JobResultSchema = z.object({
    jobId: z.string().min(1),
    chunkId: z.string().min(1),
    type: z.string().min(1),
    result: z.unknown(),
    status: z.enum(['success', 'failed', 'skipped']),
    serverId: z.string().min(1),
    receivedAt: z.string().min(1),
    isFirst: z.boolean(),
});

export type JobResult = z.infer<typeof JobResultSchema>;
