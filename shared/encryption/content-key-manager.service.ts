/**
 * ContentKeyManagerService
 *
 * Manages mapping of content IDs to encryption keys (in-memory demo).
 *
 * @remarks
 * - Replace with persistent storage for production.
 */

const keyMap = new Map<string, string>();

export class ContentKeyManagerService {
    /**
     * Associates a key with a content ID.
     */
    static setKey(contentId: string, key: string): void {
        keyMap.set(contentId, key);
    }

    /**
     * Retrieves the key for a content ID, or undefined if not set.
     */
    static getKey(contentId: string): string | undefined {
        return keyMap.get(contentId);
    }

    /**
     * Removes the key for a content ID.
     */
    static removeKey(contentId: string): void {
        keyMap.delete(contentId);
    }
}

export default ContentKeyManagerService;
