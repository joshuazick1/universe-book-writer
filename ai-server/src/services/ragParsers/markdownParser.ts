// Markdown parser for RAG ingestion
// Splits markdown into logical blocks (e.g., headings, paragraphs, code blocks)

/**
 * Parse markdown content into blocks for chunking.
 * @param content Markdown string
 * @returns Array of markdown blocks (strings)
 */
export function parseMarkdownBlocks(content: string): string[] {
    // Simple block split: headings, code blocks, paragraphs
    // (For production, use a markdown parser library)
    const blocks: string[] = [];
    let buffer = '';
    let inCode = false;
    const lines = content.split(/\n/);
    for (const line of lines) {
        if (line.trim().startsWith('```')) {
            inCode = !inCode;
            if (!inCode && buffer) {
                blocks.push(buffer);
                buffer = '';
            }
            buffer += (buffer ? '\n' : '') + line;
            if (!inCode) {
                blocks.push(buffer);
                buffer = '';
            }
            continue;
        }
        if (!inCode && /^#+ /.test(line)) {
            if (buffer) blocks.push(buffer);
            buffer = line;
            continue;
        }
        buffer += (buffer ? '\n' : '') + line;
    }
    if (buffer) blocks.push(buffer);
    return blocks;
}
