import { ToolDefinition } from '../../../shared/types/toolTypes.js';

// Simulated database for tools
const toolDatabase: Record<string, ToolDefinition> = {};

/**
 * Adds a new tool to the database.
 * @param tool - The tool definition to add.
 */
export function addTool(tool: ToolDefinition): void {
  if (toolDatabase[tool.name]) {
    throw new Error(`Tool with name '${tool.name}' already exists.`);
  }
  toolDatabase[tool.name] = tool;
}

/**
 * Retrieves a tool by its name.
 * @param toolName - The name of the tool to retrieve.
 * @returns The tool definition.
 */
export function getTool(toolName: string): ToolDefinition {
  const tool = toolDatabase[toolName];
  if (!tool) {
    throw new Error(`Tool with name '${toolName}' not found.`);
  }
  return tool;
}

/**
 * Updates an existing tool in the database.
 * @param toolName - The name of the tool to update.
 * @param updatedTool - The updated tool definition.
 */
export function updateTool(toolName: string, updatedTool: ToolDefinition): void {
  if (!toolDatabase[toolName]) {
    throw new Error(`Tool with name '${toolName}' does not exist.`);
  }
  toolDatabase[toolName] = updatedTool;
}

/**
 * Deletes a tool from the database.
 * @param toolName - The name of the tool to delete.
 */
export function deleteTool(toolName: string): void {
  if (!toolDatabase[toolName]) {
    throw new Error(`Tool with name '${toolName}' does not exist.`);
  }
  delete toolDatabase[toolName];
}

/**
 * Lists all tools in the database.
 * @returns An array of all tool definitions.
 */
export function listTools(): ToolDefinition[] {
  return Object.values(toolDatabase);
}
