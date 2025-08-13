/**
 * @fileoverview Shared object utilities for deep clone, merge, and comparison.
 * @module shared/helpers/objectUtils
 *
 * Provides deepClone, deepMerge, and isEqual helpers for objects.
 *
 * @example
 * import { deepClone, deepMerge, isEqual } from 'shared/helpers/objectUtils';
 */

export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function deepMerge<T extends object, U extends object>(target: T, source: U): T & U {
    return Object.assign(deepClone(target), source);
}

export function isEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
