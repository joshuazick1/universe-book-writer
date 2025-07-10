// Python parser for RAG ingestion
// Splits Python code into function and class blocks for chunking

/**
 * Parse Python code into function/class blocks for chunking.
 * @param content Python code string
 * @returns Array of code blocks (strings)
 */
export function parsePythonBlocks(content: string): string[] {
    // Simple regex-based split (for production, use a real parser)
    const blocks: string[] = [];
    let buffer = '';
    const lines = content.split(/\n/);
    for (const line of lines) {
        if (/^def |^class /.test(line.trim())) {
            if (buffer) blocks.push(buffer);
            buffer = line;
        } else {
            buffer += (buffer ? '\n' : '') + line;
        }
    }
    if (buffer) blocks.push(buffer);
    return blocks;
}
