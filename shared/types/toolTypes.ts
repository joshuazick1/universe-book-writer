/**
 * Represents the definition of a tool.
 */
export interface ToolDefinition {
  /**
   * The unique name of the tool.
   */
  name: string;

  /**
   * A brief description of what the tool does.
   */
  description: string;

  /**
   * The input schema for the tool.
   */
  inputSchema: Record<string, any>;

  /**
   * The output schema for the tool.
   */
  outputSchema: Record<string, any>;

  /**
   * The function to execute the tool.
   * @param args - The arguments to pass to the tool.
   * @returns The result of the tool execution.
   */
  execute: (args: Record<string, any>) => Promise<any>;
}

/**
 * Represents the registry of tools.
 */
export type ToolRegistry = Record<string, ToolDefinition>;

// Corrected the import path for `toolTypes` to include the `.js` extension.
