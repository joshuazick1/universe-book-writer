import fetch from 'node-fetch';

/**
 * Groups related or consecutive text chunks into larger narrative units (e.g., scenes, chapters, arcs)
 * and generates a higher-level summary for each group using the user-selected AI model.
 *
 * @param chunks Array of chunk objects: { id: string, text: string, summary: string }
 * @param opts Options: { model: string, universeId: string, groupSize?: number }
 * @returns Array of grouped chunks: { groupId: string, chunkIds: string[], groupSummary: string }
 */
export async function groupChunksAndSummarize(
    chunks: { id: string; text: string; summary: string }[],
    opts: { model?: string; universeId: string; groupSize?: number }
): Promise<{ groupId: string; chunkIds: string[]; groupSummary: string }[]> {
    const model = opts.model || 'default-model';
    const groupSize = opts.groupSize || 3;
    const groups: { id: string; text: string; summary: string }[][] = [];
    // Simple grouping: consecutive chunks in fixed-size groups (can be replaced with semantic grouping)
    for (let i = 0; i < chunks.length; i += groupSize) {
        groups.push(chunks.slice(i, i + groupSize));
    }
    // For each group, generate a higher-level summary
    const results: { groupId: string; chunkIds: string[]; groupSummary: string }[] = [];
    for (let g = 0; g < groups.length; g++) {
        const group = groups[g];
        const groupText = group.map(c => c.text).join('\n\n');
        const groupSummaries = group.map(c => c.summary).join('\n- ');
        const prompt = `You are an expert story analyst. Given the following story segments and their summaries, generate a broad, context-aware summary that captures the main plot developments, themes, and major entity interactions.\n\nSegments:\n${groupText}\n\nSummaries:\n- ${groupSummaries}\n\nReturn a single paragraph summary.`;
        let groupSummary = '';
        try {
            const response = await fetch('http://localhost:5100/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt, stream: false })
            });
            if (response.ok) {
                const data: any = await response.json();
                groupSummary = typeof data.response === 'string' ? data.response : '';
            } else {
                groupSummary = '[LLM error: could not generate group summary]';
            }
        } catch {
            groupSummary = '[LLM unavailable: could not generate group summary]';
        }
        results.push({
            groupId: `group_${g + 1}`,
            chunkIds: group.map(c => c.id),
            groupSummary
        });
    }
    return results;
}
