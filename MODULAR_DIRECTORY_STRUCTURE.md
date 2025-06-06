# 📁 Modular Directory Structure

```
book-writer/
├── packages/                            # Monorepo packages
│   ├── core/                           # Core shared libraries
│   │   ├── types/                     # Shared TypeScript types
│   │   │   ├── ai.types.ts          # AI-related type definitions
│   │   │   ├── plugin.types.ts      # Plugin system types
│   │   │   ├── universe.types.ts    # Universe management types
│   │   │   └── story.types.ts       # Story management types
│   │   │
│   │   ├── utils/                     # Shared utilities
│   │   │   ├── validation.ts        # Common validation utilities
│   │   │   ├── formatting.ts        # Text/data formatting
│   │   │   ├── async.ts            # Async operation helpers
│   │   │   └── events.ts           # Event handling utilities
│   │   │
│   │   └── constants/                 # Shared constants
│   │       ├── api.constants.ts      # API-related constants
│   │       ├── models.constants.ts   # AI model configurations
│   │       └── themes.constants.ts   # Theme-related constants
│   │
│   ├── ui-core/                       # Core UI components
│   │   ├── components/               # Base components
│   │   │   ├── Editor/             # Rich text editor components
│   │   │   │   ├── index.tsx
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   └── plugins/
│   │   │   ├── Timeline/           # Timeline visualization
│   │   │   │   ├── index.tsx
│   │   │   │   ├── TimelineItem.tsx
│   │   │   │   └── Controls.tsx
│   │   │   └── common/             # Shared components
│   │   │       ├── Button/
│   │   │       ├── Modal/
│   │   │       └── Forms/
│   │   │
│   │   ├── hooks/                    # Shared hooks
│   │   │   ├── useAI.ts            # AI interaction hooks
│   │   │   ├── useTheme.ts         # Theme management
│   │   │   └── usePlugin.ts        # Plugin system hooks
│   │   │
│   │   ├── styles/                   # Base styles
│   │   │   ├── theme.ts            # Theme definitions
│   │   │   ├── animations.ts       # Animation definitions
│   │   │   └── variables.ts        # Style variables
│   │   │
│   │   └── animations/               # Base animations
│   │       ├── transitions.ts       # Page transitions
│   │       ├── effects.ts          # Visual effects
│   │       └── keyframes.ts        # Animation keyframes
│   │
│   └── plugin-sdk/                    # Plugin development SDK
│       ├── ui/                       # UI plugin utilities
│       ├── ai/                       # AI plugin utilities
│       └── validation/               # Plugin validation tools
│
├── frontend/                           # Frontend application
│   ├── src/
│   │   ├── app/                      # App initialization
│   │   │   ├── providers/           # Context providers
│   │   │   └── config/              # App configuration
│   │   │
│   │   ├── features/                # Feature modules
│   │   │   ├── editor/             # Writing editor
│   │   │   ├── universe/           # Universe management
│   │   │   ├── characters/         # Character management
│   │   │   └── timeline/           # Timeline visualization
│   │   │
│   │   ├── plugins/                 # Plugin integration
│   │   │   ├── manager/            # Plugin management
│   │   │   ├── loaders/            # Plugin loaders
│   │   │   └── registry/           # Plugin registry
│   │   │
│   │   └── themes/                  # Theme system
│   │       ├── base/               # Base theme
│   │       └── plugins/            # Theme plugins
│   │
│   └── public/                       # Static assets
│
├── backend/                            # Backend services
│   ├── src/
│   │   ├── core/                     # Core backend modules
│   │   │   ├── types/              # Type definitions
│   │   │   ├── interfaces/         # Core interfaces
│   │   │   └── utils/              # Utilities
│   │   │
│   │   ├── ai/                      # AI Orchestration
│   │   │   ├── router/             # Task Router Model
│   │   │   │   ├── analyzer/      # Request analysis
│   │   │   │   ├── dispatcher/    # Task dispatch
│   │   │   │   └── monitor/       # Task monitoring
│   │   │   │
│   │   │   ├── models/             # Model Management
│   │   │   │   ├── personality/   # Personality model
│   │   │   │   ├── writing/       # Writing model
│   │   │   │   ├── consistency/   # Consistency model
│   │   │   │   └── dialogue/      # Dialogue model
│   │   │   │
│   │   │   ├── orchestrator/       # Model Orchestration
│   │   │   │   ├── load-balancer/ # Load balancing
│   │   │   │   ├── state/        # State management
│   │   │   │   └── scaling/      # Auto-scaling
│   │   │   │
│   │   │   └── plugins/           # AI Plugin System
│   │   │       ├── prompts/      # Custom prompts
│   │   │       └── validators/   # Custom validators
│   │   │
│   │   ├── plugins/                 # Backend Plugins
│   │   │   ├── core/              # Plugin core
│   │   │   ├── official/          # Official plugins
│   │   │   └── community/         # Community plugins
│   │   │
│   │   └── api/                     # API Layer
│   │       ├── controllers/        # Request handlers
│   │       ├── middleware/         # API middleware
│   │       └── routes/            # Route definitions
│   │
│   └── config/                       # Backend configuration
│
├── ai-server/                          # Ollama Server Management
│   ├── orchestration/                 # Server orchestration
│   │   ├── load-balancer/           # Load balancing
│   │   ├── health-check/           # Health monitoring
│   │   └── scaling/               # Auto-scaling
│   │
│   ├── models/                       # Model definitions
│   │   ├── router/                 # Router model config
│   │   ├── personality/            # Personality model
│   │   └── specialized/            # Task models
│   │
│   └── prompts/                      # Base prompts
│       ├── system/                  # System prompts
│       └── templates/               # Prompt templates
│
├── plugins/                            # Official Plugins
│   ├── star-trek/                     # Star Trek Plugin
│   │   ├── ui/                      # LCARS UI components
│   │   ├── models/                  # Universe models
│   │   ├── prompts/                 # ST-specific prompts
│   │   └── validation/              # ST rules
│   │
│   └── star-wars/                     # Star Wars Plugin
│       ├── ui/                      # SW UI components
│       ├── models/                  # Universe models
│       ├── prompts/                 # SW-specific prompts
│       └── validation/              # SW rules
│
├── tools/                             # Development tools
│   ├── plugin-cli/                   # Plugin CLI tools
│   ├── model-training/              # Model training tools
│   └── testing/                     # Testing utilities
│
└── infra/                             # Infrastructure
    ├── docker/                       # Docker configurations
    │   ├── ai/                     # AI server setup
    │   ├── db/                     # Database setup
    │   └── cache/                  # Cache setup
    │
    └── k8s/                         # Kubernetes configs
        ├── ai-cluster/             # AI server cluster
        ├── backend/                # Backend services
        └── monitoring/             # Monitoring setup
```

## 🔑 Key Features of This Structure

1. **Complete Modularity**

   - Each component is self-contained
   - Clear separation of concerns
   - Easy to maintain and extend

2. **Monorepo Organization**

   - Shared core packages
   - Consistent tooling
   - Easy dependency management

3. **Plugin-First Architecture**

   - Dedicated plugin SDK
   - Clear plugin structure
   - Easy plugin development

4. **AI-Centric Design**

   - Sophisticated AI orchestration
   - Model management
   - Prompt engineering support

5. **Scalable Infrastructure**

   - Container-ready
   - Kubernetes configurations
   - Monitoring setup

6. **Development Experience**
   - Comprehensive tooling
   - Testing utilities
   - Development CLI

## 📦 Package Dependencies

```json
{
  "workspaces": ["packages/*", "frontend", "backend", "ai-server", "plugins/*", "tools/*"]
}
```

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Build core packages: `npm run build --workspace=packages/*`
4. Start development:
   - Frontend: `npm run dev --workspace=frontend`
   - Backend: `npm run dev --workspace=backend`
   - AI Server: `npm run dev --workspace=ai-server`

## 📝 Development Guidelines

1. **Module Creation**

   - Each module should have its own README.md
   - Include module-specific tests
   - Document public APIs

2. **Plugin Development**

   - Use plugin-sdk for development
   - Follow plugin structure guidelines
   - Include theme components

3. **AI Integration**

   - Define clear model responsibilities
   - Document prompt templates
   - Handle model fallbacks

4. **Testing**
   - Unit tests for each module
   - Integration tests for plugins
   - E2E tests for features
