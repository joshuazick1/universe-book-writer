/**
 * Returns the preferred model for a given universe, unless a user override is provided.
 * @param universeId The universe identifier
 * @param userOverride Optional user-selected model (takes precedence)
 * @returns The model name to use
 */
export async function getModelForUniverse(
    universeId: string,
    userOverride?: string
): Promise<string> {
    if (userOverride) return userOverride;
    // TODO: Implement universe-specific model selection logic here
    // For now, return a default model
    return 'llama3';
}
