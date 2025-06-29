# MCP Integration Guide

This document explains how to set up and use Model Context Protocol (MCP) servers to enhance GitHub Copilot's capabilities for the Universe Book Writer project.

## Overview

Model Context Protocol (MCP) servers provide GitHub Copilot with enhanced capabilities by allowing it to interact with external tools, databases, and file systems. This integration makes Copilot more context-aware and capable of performing complex development tasks.

## Prerequisites

- VS Code with GitHub Copilot extension
- Node.js and npm installed
- PowerShell execution policy set to allow script execution

## Quick Setup

Run the automated setup script:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\scripts\setup-mcp-servers.ps1
```

## Manual Setup

### 1. Enable Agent Mode in VS Code

1. Open VS Code settings (`Ctrl+,`)
2. Search for `chat.agent.enabled`
3. Enable the "Chat: Agent Enabled" setting
4. Restart VS Code

### 2. Install MCP Servers

```powershell
# Install filesystem server for file operations
npm install -g @cyanheads/filesystem-mcp-server

# Install Playwright server for testing
npm install -g @executeautomation/playwright-mcp-server

# Install VS Code MCP extension
code --install-extension vikashloomba.copilot-mcp-search
```

### 3. Configure VS Code Settings

The setup script creates `.vscode/settings.json` with MCP configuration. Key settings:

```json
{
  "chat.agent.enabled": true,
  "chat.mcp.enabled": true,
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": ["@cyanheads/filesystem-mcp-server"],
        "env": {
          "ALLOWED_DIRECTORIES": "./src,./docs,./backend,./frontend,./ai-server,./collaboration-server,./packages,./scripts,./tools"
        }
      }
    }
  }
}
```

## Available MCP Servers

### 1. Filesystem MCP Server 📁
- **Purpose**: Secure file system operations
- **Capabilities**:
  - Read and analyze project files
  - Navigate monorepo structure
  - Perform targeted file updates
  - Advanced search/replace across codebase
- **Security**: Limited to specified directories only

### 2. Playwright MCP Server 🎭
- **Purpose**: Automated testing capabilities
- **Capabilities**:
  - Generate test cases from requirements
  - Execute UI and API tests
  - Capture network requests and console logs
  - Generate detailed test reports
- **Integration**: Works with your enhanced test runner

### 3. Node Omnibus MCP Server 🛠️
- **Purpose**: Node.js development assistance
- **Capabilities**:
  - Project scaffolding for React/Next.js/Express
  - Component generation (functional and class-based)
  - TypeScript integration and type definitions
  - AI-powered code analysis and debugging
  - Dependency management

### 4. MongoDB MCP Server 🗄️
- **Purpose**: Database interaction and analysis
- **Capabilities**:
  - Query analysis and optimization
  - Schema validation suggestions
  - Data modeling assistance
  - Migration planning

## Usage Examples

### File Operations
```
@copilot Can you analyze the backend architecture plan and suggest improvements?
```

### Testing Integration
```
@copilot Generate Playwright tests for the user authentication flow
```

### Code Analysis
```
@copilot Review the React components in the frontend and suggest optimizations
```

### Database Operations
```
@copilot Analyze the MongoDB schema for the book series data model
```

## Custom Instructions

The project includes custom instructions in `.github/copilot-instructions.md` that provide Copilot with:

- Project architecture overview
- Development guidelines and constraints
- File size limits and coding standards
- Testing requirements and procedures
- Documentation standards
- Plugin system architecture

## Troubleshooting

### MCP Server Not Detected
1. Check `.vscode/settings.json` for correct command paths
2. Run `MCP: List Servers` from Command Palette to verify
3. Check VS Code Output panel for MCP server logs

### No AI Suggestions
1. Ensure Agent Mode is active in Copilot
2. Verify MCP servers are toggled on in Tools menu
3. Check that file paths are within allowed directories

### Authentication Issues
1. Re-authenticate GitHub account via Accounts menu
2. Restart VS Code after configuration changes
3. Check PowerShell execution policy if scripts fail

### Server Health Monitoring
Use the MCP extension's UI to monitor server status:
1. Look for "MCP Servers" in VS Code activity bar
2. Check connection status indicators
3. View server logs for detailed diagnostics

## Best Practices

### Security
- Only install MCP servers from verified sources
- Review allowed directories in filesystem server config
- Use environment variables for sensitive configurations

### Development Workflow
- Keep prompts specific and focused
- Break complex tasks into smaller requests
- Use the enhanced test runner for all testing operations
- Update documentation when making architectural changes

### Performance
- Monitor MCP server resource usage
- Restart VS Code if servers become unresponsive
- Use pattern matching for targeted operations

## Advanced Configuration

### Remote MCP Servers
For team collaboration, MCP servers can be hosted remotely:

```json
{
  "mcp": {
    "servers": {
      "remote-filesystem": {
        "transport": "sse",
        "url": "https://your-mcp-server.example.com/sse"
      }
    }
  }
}
```

### Custom MCP Server Development
To create custom MCP servers for project-specific needs:

1. Use the TypeScript MCP SDK
2. Follow the examples in the official MCP repository
3. Test with the enhanced test runner
4. Document in project-specific README files

## Integration with Project Architecture

### Monorepo Support
- MCP servers understand the project's monorepo structure
- Filesystem access is scoped to relevant directories
- Cross-package dependencies are handled intelligently

### Plugin Architecture
- MCP servers can assist with plugin development
- Universe-specific logic remains properly encapsulated
- Plugin SDK documentation is automatically updated

### Enhanced Test Runner
- Playwright MCP integrates with the custom test runner
- Test results are logged and organized automatically
- Coverage reports include MCP-generated tests

## Maintenance

### Regular Updates
```powershell
# Update MCP servers
npm update -g @cyanheads/filesystem-mcp-server
npm update -g @executeautomation/playwright-mcp-server

# Update VS Code extension
code --install-extension vikashloomba.copilot-mcp-search --force
```

### Configuration Validation
Periodically verify MCP configuration:
1. Run the setup script to check for updates
2. Test each MCP server with simple operations
3. Review and update allowed directories as project grows

## Resources

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [MCP Server Directory](https://mcplist.ai)
- [GitHub MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [VS Code MCP Extension](https://marketplace.visualstudio.com/items?itemName=vikashloomba.copilot-mcp-search)

## Support

For issues specific to this project's MCP integration:
1. Check the troubleshooting section above
2. Review VS Code Output panel logs
3. Test with minimal MCP configuration
4. Refer to individual MCP server documentation

## Testing MCP Integration

### Automated Testing

Run the test script to verify your MCP setup:

```powershell
# Test MCP integration
.\scripts\test-mcp-integration.ps1

# Or use VS Code Task: Ctrl+Shift+P → "Tasks: Run Task" → "Test MCP Integration"
```

### Manual Testing Steps

1. **Restart VS Code** (important for loading MCP changes)

2. **Enable Agent Mode** (if not already enabled):
   - Open Command Palette (`Ctrl+Shift+P`)
   - Search for "GitHub Copilot: Toggle Agent Mode"
   - Enable it

3. **Test Filesystem MCP**:
   ```
   Ask Copilot: "Can you read the README.md file in the root directory?"
   Ask Copilot: "What files are in the test-mcp-files directory?"
   Ask Copilot: "Can you analyze the test-script.js file and explain what it does?"
   ```

4. **Test Playwright MCP**:
   ```
   Ask Copilot: "Can you help me automate interactions with the test-page.html file?"
   Ask Copilot: "How would I click the Test Button 1 using Playwright?"
   Ask Copilot: "Can you write a script to fill out the form on the test page?"
   ```

5. **Check MCP Logs**:
   - Open Output panel (`View` → `Output`)
   - Select "MCP" from the dropdown
   - Look for server connection logs and any errors

### Expected Results

- ✅ Copilot can read and analyze project files
- ✅ Copilot can suggest Playwright automation scripts
- ✅ MCP servers appear in Output panel without errors
- ✅ No error messages in MCP logs

### Test Files Created

- `test-mcp-files/README.md` - Documentation for MCP testing
- `test-mcp-files/test-script.js` - JavaScript file for analysis testing
- `test-mcp-files/test-page.html` - HTML page for Playwright testing

### Troubleshooting

If tests fail, run:
```powershell
.\scripts\troubleshoot-mcp.ps1
```

Or use VS Code Task: "Troubleshoot MCP"
