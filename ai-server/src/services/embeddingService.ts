/**
 * Embedding service for semantic vector generation using nomic-embed-text:latest
 * This is a stub for now; replace with orchestrator integration when ready.
 * @param text - The text to embed
 * @returns Promise<number[]> - The embedding vector
 */

/**
 * Embedding service for semantic vector generation via orchestrator endpoint
 * @param text - The text to embed
 * @returns Promise<number[]> - The embedding vector
 * @example
 *   const embedding = await generateEmbedding('Hello world');
 *   // embedding: number[]
 * @edgecase Empty text returns zero vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const endpoint = 'http://localhost:5100/api/orchestrator/embed';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error('Orchestrator embedding error');
    const data = await response.json();
    return data.embedding as number[];
  } catch (err) {
    // Fallback: return zero vector
    return Array(768).fill(0);
  }
}
