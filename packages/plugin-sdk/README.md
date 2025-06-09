# Plugin SDK Documentation

## Overview

The Universe Book Writer Plugin SDK provides a comprehensive framework for developing plugins that extend the application's functionality. The plugin system is designed to be universe-agnostic while allowing for universe-specific customizations and features.

## Architecture

### Plugin Types

The system supports four main plugin types:

1. **Core Plugins**: Fundamental system extensions
2. **Universe Plugins**: Universe-specific functionality and validation
3. **Theme Plugins**: UI theming and visual customization  
4. **AI Plugins**: AI model and prompt customization

### Plugin Interface Hierarchy

```typescript
interface BasePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly dependencies: string[];
  readonly metadata: PluginMetadata;
}

interface UniversePlugin extends BasePlugin {
  readonly type: PluginType.UNIVERSE;
  readonly universeConfig: UniverseConfiguration;
  readonly validationRules: ValidationRule[];
  readonly dataModels: DataModelDefinition[];
}

interface ThemePlugin extends BasePlugin {
  readonly type: PluginType.THEME;
  readonly themeConfig: ThemeConfiguration;
  readonly components: ComponentDefinition[];
  readonly assets: AssetDefinition[];
}

interface AIPlugin extends BasePlugin {
  readonly type: PluginType.AI;
  readonly aiConfig: AIConfiguration;
  readonly prompts: PromptTemplate[];
  readonly modelPreferences: ModelPreference[];
}
```

## Plugin Development

### Getting Started

1. **Initialize Plugin Project**
   ```bash
   npx @universe-book-writer/plugin-cli create my-plugin
   cd my-plugin
   npm install
   ```

2. **Plugin Structure**
   ```
   my-plugin/
   ├── src/
   │   ├── index.ts          # Main plugin entry
   │   ├── config.ts         # Plugin configuration
   │   ├── models/           # Data models
   │   ├── validators/       # Validation rules
   │   └── components/       # UI components (if theme plugin)
   ├── package.json          # Plugin manifest
   ├── plugin.config.json    # Plugin metadata
   └── README.md            # Plugin documentation
   ```

3. **Basic Plugin Implementation**
   ```typescript
   import { UniversePlugin, PluginType } from '@universe-book-writer/plugin-sdk';

   export class MyUniversePlugin implements UniversePlugin {
     readonly id = 'my-universe-plugin';
     readonly name = 'My Universe Plugin';
     readonly version = '1.0.0';
     readonly type = PluginType.UNIVERSE;
     readonly description = 'A custom universe plugin';
     readonly author = 'Plugin Developer';
     readonly dependencies = [];

     readonly universeConfig = {
       name: 'My Universe',
       timeline: {
         startYear: 2000,
         endYear: 3000,
         calendar: 'standard'
       },
       rules: {
         ftlTravel: true,
         timeTravel: false,
         magicSystem: false
       }
     };

     readonly validationRules = [
       {
         field: 'character.age',
         rule: 'must be between 0 and 500',
         validator: (value: number) => value >= 0 && value <= 500
       }
     ];

     readonly dataModels = [
       {
         name: 'Character',
         schema: {
           name: 'string',
           age: 'number',
           species: 'string',
           occupation: 'string'
         }
       }
     ];

     async initialize(): Promise<void> {
       // Plugin initialization logic
     }

     async activate(): Promise<void> {
       // Plugin activation logic
     }

     async deactivate(): Promise<void> {
       // Plugin deactivation logic
     }
   }
   ```

### Plugin Configuration

The `plugin.config.json` file defines plugin metadata:

```json
{
  "id": "my-universe-plugin",
  "name": "My Universe Plugin",
  "version": "1.0.0",
  "type": "universe",
  "description": "A custom universe plugin for creative writing",
  "author": "Plugin Developer",
  "homepage": "https://github.com/author/my-universe-plugin",
  "repository": "https://github.com/author/my-universe-plugin",
  "license": "MIT",
  "keywords": ["universe", "sci-fi", "writing"],
  "dependencies": {
    "@universe-book-writer/core": "^1.0.0"
  },
  "peerDependencies": {
    "@universe-book-writer/plugin-sdk": "^1.0.0"
  },
  "files": ["dist/**/*", "README.md", "LICENSE"],
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

## Plugin Features

### Universe Plugins

Universe plugins define the rules, data models, and validation for specific fictional universes.

**Key Features**:
- Universe configuration and rules
- Custom data models for characters, locations, etc.
- Validation rules for universe consistency
- Timeline and calendar systems
- Technology and magic system definitions

**Example: Star Trek Universe Plugin**
```typescript
export class StarTrekUniversePlugin implements UniversePlugin {
  readonly universeConfig = {
    name: 'Star Trek',
    timeline: {
      startYear: 2151, // Enterprise era
      endYear: 2400,   // Far future
      calendar: 'Earth Standard',
      stardateSystem: true
    },
    rules: {
      ftlTravel: true,
      timeTravel: true,
      transporters: true,
      replicators: true,
      universalTranslator: true
    },
    factions: [
      'United Federation of Planets',
      'Klingon Empire',
      'Romulan Star Empire',
      'Cardassian Union',
      'Dominion'
    ]
  };

  readonly validationRules = [
    {
      field: 'character.rank',
      rule: 'must be valid Starfleet rank',
      validator: (value: string) => STARFLEET_RANKS.includes(value)
    },
    {
      field: 'ship.registry',
      rule: 'must follow Federation registry format',
      validator: (value: string) => /^N[XC][CY]?-\d{4,5}(-[A-Z])?$/.test(value)
    }
  ];
}
```

### Theme Plugins

Theme plugins provide visual customization and UI components.

**Key Features**:
- Custom component implementations
- Universe-specific styling
- Animation and transition definitions
- Asset management (icons, images, fonts)

**Example: LCARS Theme Plugin**
```typescript
export class LCARSThemePlugin implements ThemePlugin {
  readonly themeConfig = {
    name: 'LCARS',
    description: 'Star Trek LCARS interface theme',
    colors: {
      primary: '#FF9900',
      secondary: '#9999FF',
      background: '#000000',
      surface: '#333366',
      accent: '#FFCC00'
    },
    typography: {
      fontFamily: 'Swiss911 UCm BT, monospace',
      fontSize: {
        small: '12px',
        medium: '14px',
        large: '18px',
        title: '24px'
      }
    },
    animations: {
      buttonHover: 'lcars-button-glow',
      panelSlide: 'lcars-panel-slide',
      textBlink: 'lcars-text-blink'
    }
  };

  readonly components = [
    {
      name: 'LCARSButton',
      component: LCARSButtonComponent,
      props: ['variant', 'size', 'disabled']
    },
    {
      name: 'LCARSPanel',
      component: LCARSPanelComponent,
      props: ['title', 'collapsible', 'status']
    }
  ];
}
```

### AI Plugins

AI plugins customize AI behavior and prompts for specific contexts.

**Key Features**:
- Custom prompt templates
- Model preferences and routing
- Context-aware AI behavior
- Universe-specific knowledge integration

**Example: Star Trek AI Plugin**
```typescript
export class StarTrekAIPlugin implements AIPlugin {
  readonly aiConfig = {
    name: 'Star Trek AI Assistant',
    description: 'AI specialized in Star Trek universe writing',
    modelPreferences: {
      characterDialogue: 'llama3.1:8b',
      technicalDescriptions: 'llama3.1:70b',
      plotGeneration: 'llama3.1:405b'
    }
  };

  readonly prompts = [
    {
      name: 'starfleet-character-dialogue',
      template: `You are writing dialogue for a Starfleet character in the Star Trek universe.
      
Context:
- Era: {era}
- Character: {character}
- Rank: {rank}
- Situation: {situation}

Guidelines:
- Use appropriate Star Trek terminology
- Maintain character consistency
- Follow Starfleet protocols
- Reflect the character's background and training

Write natural dialogue that fits the character and situation.`,
      variables: ['era', 'character', 'rank', 'situation']
    }
  ];
}
```

## Plugin Manager

### Loading and Activation

The Plugin Manager handles the lifecycle of all plugins:

```typescript
interface PluginManager {
  // Plugin discovery and loading
  discoverPlugins(): Promise<PluginInfo[]>;
  loadPlugin(pluginId: string): Promise<BasePlugin>;
  unloadPlugin(pluginId: string): Promise<void>;

  // Plugin activation and deactivation
  activatePlugin(pluginId: string): Promise<void>;
  deactivatePlugin(pluginId: string): Promise<void>;

  // Plugin information and status
  getActivePlugins(): BasePlugin[];
  getPluginInfo(pluginId: string): PluginInfo | null;
  getPluginStatus(pluginId: string): PluginStatus;

  // Plugin dependencies
  resolveDependencies(pluginId: string): string[];
  validateDependencies(pluginId: string): boolean;
}
```

### Hot Reload System

The plugin system supports hot reloading for development:

**Features**:
- File watching for plugin changes
- State preservation during reload
- Error handling and recovery
- Development-time plugin updates

**Usage**:
```typescript
// Enable hot reload in development
if (process.env.NODE_ENV === 'development') {
  pluginManager.enableHotReload({
    watchPath: './plugins',
    extensions: ['.ts', '.js', '.json'],
    debounceMs: 500
  });
}
```

## Testing

### Plugin Testing Framework

The SDK includes comprehensive testing utilities:

```typescript
import { createPluginTestSuite } from '@universe-book-writer/plugin-sdk/testing';

describe('My Universe Plugin', () => {
  const testSuite = createPluginTestSuite(MyUniversePlugin);

  it('should validate plugin configuration', async () => {
    await testSuite.validateConfig();
  });

  it('should load and activate successfully', async () => {
    await testSuite.testLifecycle();
  });

  it('should validate universe rules', async () => {
    const character = { name: 'Test', age: 30, species: 'Human' };
    await testSuite.validateData('character', character);
  });
});
```

### Mock Environment

Testing utilities provide a mock environment:

```typescript
import { createMockPluginEnvironment } from '@universe-book-writer/plugin-sdk/testing';

const mockEnv = createMockPluginEnvironment({
  plugins: ['test-universe-plugin'],
  userData: mockUserData,
  config: testConfig
});

await mockEnv.loadPlugin(myPlugin);
await mockEnv.activatePlugin(myPlugin.id);
```

## Publishing

### Plugin Registry

Plugins can be published to the official plugin registry:

1. **Build Plugin**
   ```bash
   npm run build
   npm run test
   npm run lint
   ```

2. **Validate Plugin**
   ```bash
   npx @universe-book-writer/plugin-cli validate
   ```

3. **Publish Plugin**
   ```bash
   npx @universe-book-writer/plugin-cli publish
   ```

### Plugin Distribution

**Local Development**:
- Install from local directory
- Symlink for development

**NPM Registry**:
- Standard NPM package distribution
- Version management with semantic versioning

**Plugin Marketplace**:
- Official plugin marketplace (Phase 5.5)
- Plugin discovery and installation
- Reviews and ratings

## Security

### Plugin Isolation

**Sandboxing**:
- Runtime isolation for plugin code
- Resource limits and monitoring
- API access control

**Validation**:
- Code scanning for security issues
- Dependency vulnerability checking
- Plugin signature verification

**Trust Levels**:
- Official plugins (verified)
- Community plugins (reviewed)
- Developer plugins (unverified)

## Examples

### Complete Plugin Examples

The SDK includes several example plugins:

1. **Generic Sci-Fi Plugin**: Basic science fiction universe
2. **Fantasy Universe Plugin**: Fantasy world with magic system
3. **Modern Setting Plugin**: Contemporary fiction settings
4. **Star Trek Plugin**: Complete Star Trek universe implementation

### Plugin Templates

Quick start templates for common plugin types:

```bash
# Create universe plugin
npx @universe-book-writer/plugin-cli create --template=universe

# Create theme plugin  
npx @universe-book-writer/plugin-cli create --template=theme

# Create AI plugin
npx @universe-book-writer/plugin-cli create --template=ai
```

## API Reference

### Core Interfaces

- `BasePlugin`: Base plugin interface
- `UniversePlugin`: Universe-specific plugin interface
- `ThemePlugin`: Theme customization interface
- `AIPlugin`: AI behavior customization interface

### Plugin Manager

- `PluginManager`: Plugin lifecycle management
- `PluginRegistry`: Plugin discovery and registration
- `PluginValidator`: Plugin validation and security

### Development Tools

- `PluginTestSuite`: Comprehensive testing framework
- `MockPluginEnvironment`: Testing environment setup
- `PluginCLI`: Command-line development tools

## Contributing

### Plugin Development Guidelines

1. Follow TypeScript best practices
2. Include comprehensive tests
3. Document all public APIs
4. Follow semantic versioning
5. Include example usage

### Code Quality

- ESLint configuration for plugins
- Prettier formatting rules
- TypeScript strict mode requirements
- Test coverage requirements (>90%)

## Support

### Documentation

- [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md)
- [API Reference](./API_REFERENCE.md)
- [Examples Repository](https://github.com/universe-book-writer/plugin-examples)

### Community

- [Discord Server](https://discord.gg/universe-book-writer)
- [GitHub Discussions](https://github.com/universe-book-writer/plugin-sdk/discussions)
- [Developer Forums](https://forum.universe-book-writer.com)

---

*Plugin SDK Version: 1.0.0*  
*Last Updated: June 7, 2025*
