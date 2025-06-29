# Plugins Directory

This directory contains all plugins for the Universe Book Writer application. Plugins extend the core functionality by adding support for specific fictional universes, themes, and features.

## Plugin Structure

### Directory-Based Plugins (Recommended)

Each plugin should be in its own directory with the following structure:

```
plugins/
├── my-universe-plugin/
│   ├── package.json          # Plugin metadata and configuration
│   ├── index.ts             # Main plugin implementation
│   ├── README.md            # Plugin documentation
│   ├── themes/              # Custom themes (optional)
│   │   └── my-theme.ts
│   ├── frontend/            # Frontend components (optional)
│   │   └── components.tsx
│   └── assets/              # Static assets (optional)
│       └── icons/
```

### Single-File Plugins

For simple plugins, you can use a single file:

```
plugins/
└── simple-plugin.js        # Simple plugin implementation
```

## Plugin Types

### Universe Plugins
Add support for specific fictional universes (Star Trek, Star Wars, Marvel, etc.)

### Core Plugins  
Extend core functionality (writing tools, export formats, etc.)

### Theme Plugins
Add custom visual themes and UI components

## Installing Plugins

### Manual Installation

1. Create a new directory in `plugins/` with your plugin name
2. Add your plugin files following the structure above
3. Restart the application to load the new plugin

### Plugin Package.json

Your plugin's `package.json` should include:

```json
{
  "name": "my-universe-plugin",
  "version": "1.0.0",
  "description": "Description of your plugin",
  "main": "index.js",
  "type": "module",
  "author": "Your Name",
  "license": "MIT",
  "keywords": ["universe", "sci-fi"],
  "engines": {
    "node": ">=18.0.0"
  },
  "plugin": {
    "type": "universe",
    "universeType": "my-universe",
    "supportedFeatures": [
      "sub-universes",
      "themes",
      "validation",
      "ai-prompts",
      "ui-components"
    ],
    "frontend": {
      "components": "./frontend/components",
      "themes": "./themes",
      "assets": "./assets"
    }
  }
}
```

## Available Plugins

- **star-trek-universe**: Official Star Trek universe support with LCARS theme
- **simple-core**: Basic core functionality plugin for testing

## Development

For plugin development guidelines, see the main project documentation in `/docs/`.

## Plugin API

Plugins implement the `Plugin` interface from `@universe-book-writer/core`:

```typescript
import { Plugin, PluginState, PluginType } from '@universe-book-writer/core';

export default class MyPlugin implements Plugin {
  // Plugin implementation
}
```

See existing plugins for implementation examples.
