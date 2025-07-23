# MCP Testing Quick Reference

## 🚀 Quick Start

1. **Restart VS Code** (essential!)
2. **Enable Agent Mode**: `Ctrl+Shift+P` → "GitHub Copilot: Toggle Agent Mode"
3. **Test with sample prompts** (see below)

## 📝 Test Prompts for Copilot

### Filesystem MCP Tests
```
"Can you read the README.md file?"
"What files are in the test-mcp-files directory?"
"Analyze the test-script.js file and explain its functions"
"Show me the content of the package.json file"
"List all TypeScript files in the src directory"
```

### Playwright MCP Tests
```
"Help me write a Playwright script to test the test-page.html"
"How do I click the 'Test Button 1' using Playwright?"
"Write code to fill out the form on the test page"
"How can I take a screenshot of the test page?"
"Create a Playwright test to verify all buttons work"
```

## 🔧 VS Code Tasks

Use `Ctrl+Shift+P` → "Tasks: Run Task" → Select:

- **Test MCP Integration** - Run comprehensive tests
- **Troubleshoot MCP** - Diagnose issues  
- **Setup MCP Servers** - Reinstall if needed

## 📊 Check Status

### MCP Logs
1. Open Output panel: `View` → `Output`
2. Select "MCP" from dropdown
3. Look for connection logs

### Expected Log Messages
```
[INFO] MCP server started: filesystem
[INFO] MCP server started: playwright
[INFO] Connected to MCP servers
```

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "MCP not found" | Restart VS Code |
| "Server failed" | Run troubleshoot script |
| "No response" | Check npm installations |
| "Permission denied" | Clear npm cache |

## 🧪 Test Files

- `test-mcp-files/README.md` - For reading tests
- `test-mcp-files/test-script.js` - For code analysis  
- `test-mcp-files/test-page.html` - For Playwright automation

## 📞 Success Indicators

✅ **Working MCP Integration:**
- Copilot can read your project files
- Copilot suggests relevant Playwright scripts
- No errors in MCP output logs
- Agent mode shows enhanced capabilities

❌ **Issues to Fix:**
- "Cannot read file" responses
- MCP server errors in logs
- Copilot falls back to generic responses
- No MCP dropdown in Output panel
