import { registerTool } from '../services/toolRegistryService.js';
import { suggestTitle } from './suggestTitle.js';
import { countUniverses } from './countUniverses.js';

/**
 * Registers all available tools in the tool registry.
 */
export function registerAllTools() {
    registerTool(suggestTitle);
    registerTool(countUniverses);
}
