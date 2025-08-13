/**
 * Encodes a server URL into a server ID.
 * @param url - The server URL to encode.
 * @returns The encoded server ID.
 */
export function encodeServerId(url: string): string {
    return `srv-${Buffer.from(url).toString('base64')}`;
}

/**
 * Decodes a server ID back into a server URL.
 * @param serverId - The server ID to decode.
 * @returns The decoded server URL.
 */
export function decodeServerId(serverId: string): string {
    if (!serverId.startsWith('srv-')) {
        throw new Error('Invalid server ID format');
    }
    return Buffer.from(serverId.slice(4), 'base64').toString('utf-8');
}
