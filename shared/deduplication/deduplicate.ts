import { Node } from '../types/nodeTypes.js';

/**
 * Removes duplicate nodes by id.
 * @param nodes Array of Node objects
 * @returns Array of unique Node objects
 * @example
 * const unique = deduplicateNodes(nodes);
 */
export function deduplicateNodes(nodes: readonly Node[]): Node[] {
    const seen = new Set<string>();
    return nodes.filter((node) => {
        if (!node.id || seen.has(node.id)) return false;
        seen.add(node.id);
        return true;
    });
}

/**
 * Removes duplicates from an array based on a specified key.
 * @param items Array of objects
 * @param key Key to deduplicate by
 * @returns Array of unique objects
 * @example
 * const unique = deduplicateByKey(nodes, 'title');
 */
export function deduplicateByKey<T extends Record<string, unknown>>(
    items: readonly T[],
    key: keyof T
): T[] {
    const seen = new Set<unknown>();
    return items.filter((item) => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}
