/**
 * @fileoverview Shared async utilities for promise helpers and control flow.
 * @module shared/helpers/asyncUtils
 *
 * Provides sleep, retry, and timeout helpers for async operations.
 *
 * @example
 * import { sleep, retry, withTimeout } from 'shared/helpers/asyncUtils';
 */

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < attempts - 1) await sleep(delayMs);
        }
    }
    throw lastError;
}

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}
