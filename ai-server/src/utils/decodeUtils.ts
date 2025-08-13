/**
 * Decodes a Base64 string if it is not a valid URL.
 * @param str - The string to decode.
 * @returns The decoded string or the original string if not Base64.
 */
export function decodeIfBase64(str: string): string {
    // Handle srv- prefixed encoded server IDs
    if (str.startsWith('srv-')) {
        const base64Part = str.substring(4); // Remove 'srv-' prefix
        if (/^[A-Za-z0-9+/=]+$/.test(base64Part)) {
            try {
                const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
                if (/^https?:\/\//.test(decoded)) return decoded;
            } catch {
                // Ignore decoding errors and fall through
            }
        }
    }

    // If the string looks like Base64 (letters, numbers, +, /, =, and not a valid URL), decode it
    if (/^[A-Za-z0-9+/=]+$/.test(str) && !/^https?:\/\//.test(str)) {
        try {
            const decoded = Buffer.from(str, 'base64').toString('utf-8');
            if (/^https?:\/\//.test(decoded)) return decoded;
        } catch {
            // Ignore decoding errors and return the original string
        }
    }
    return str;
}
