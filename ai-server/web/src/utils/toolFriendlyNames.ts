/**
 * Maps tool names to user-friendly labels.
 */
const toolFriendlyNames: Record<string, string> = {
  suggestTitle: 'Suggest a Title',
  countUniverses: 'Count Universes',
  generateCharacter: 'Generate Character',
  analyzePlot: 'Analyze Plot',
  // Add more tool mappings as needed
};

/**
 * Retrieves a user-friendly label for a given tool name.
 * @param toolName - The internal name of the tool.
 * @returns The user-friendly label for the tool.
 */
export function getFriendlyName(toolName: string): string {
  return toolFriendlyNames[toolName] || toolName;
}

export default toolFriendlyNames;
