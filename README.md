# Multi-Universe Book Series Writing Assistant

A comprehensive, AI-powered writing assistant designed to help authors create and manage complex book series across multiple fictional universes. The application features a robust plugin-based architecture that supports any fictional universe through a consistent, extensible interface.

## 🚀 Project Status

**Current Phase**: Phase 1 Foundation - **COMPLETED** ✅

All foundational infrastructure has been implemented and documented, including:
- ✅ Plugin system with hot reload
- ✅ JWT-based authentication with role management  
- ✅ MongoDB/Redis database infrastructure
- ✅ AI server integration with Ollama
- ✅ Real-time collaboration via WebSocket
- ✅ Comprehensive UI component library
- ✅ Complete API documentation
- ✅ Production-ready deployment guides

## 🎯 Core Features

### Writing & World Building
- **Universe Management**: Create and manage multiple fictional universes
- **Story Architecture**: Structure complex multi-book series with consistency tracking
- **Character Development**: Rich character profiles with relationship mapping
- **Timeline Management**: Visual timelines and chronology validation
- **Lore & Worldbuilding**: Comprehensive world documentation system

### AI-Powered Assistance
- **Intelligent Writing Support**: Context-aware writing assistance via Ollama
- **Consistency Checking**: Automated story and character consistency validation
- **Content Generation**: AI-assisted plot development and scene creation
- **Universe-Specific AI**: Tailored AI models for different fictional universes

### Collaboration & Productivity
- **Real-Time Collaboration**: Multi-user editing with Operational Transform
- **Version Control**: Track changes and manage document versions
- **Plugin System**: Extensible architecture for universe-specific features
- **Advanced Search**: Full-text search across all content with semantic matching

## 🏗️ Architecture

The project follows a modern, scalable monorepo architecture:

```
universe-book-writer/
├── frontend/              # React + TypeScript + Vite
├── backend/               # Node.js + Express + TypeScript
├── ai-server/             # Ollama integration & model management
├── collaboration-server/  # WebSocket server for real-time features
├── packages/
│   ├── core/             # Domain models & validation
│   ├── ui-core/          # Base UI component library
│   └── plugin-sdk/       # Plugin development framework
├── plugins/              # Official universe plugins
└── docs/                 # Comprehensive documentation
```

## 📚 Documentation

**📋 [Complete Documentation Index](docs/DOCUMENTATION_INDEX.md)** - Find all documentation in one place

### Quick Start Guides
- **[Getting Started](docs/GETTING_STARTED.md)** - Setup and first run
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Development workflow
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment

### Architecture Documentation
- **[Phase 1 Foundation Complete](docs/PHASE_1_FOUNDATION_COMPLETE.md)** - Implementation overview
- **[Frontend Architecture](frontend/docs/FRONTEND_DOCUMENTATION.md)** - React architecture & patterns
- **[Backend API Documentation](backend/docs/API_DOCUMENTATION.md)** - Complete REST API specification
- **[Database Infrastructure](backend/docs/DATABASE_INFRASTRUCTURE.md)** - MongoDB & Redis setup
- **[Authentication System](backend/docs/AUTHENTICATION_SYSTEM.md)** - JWT implementation & security

### Component Libraries
- **[UI Core Components](packages/ui-core/README.md)** - Base component library
- **[Plugin SDK](packages/plugin-sdk/README.md)** - Plugin development framework
- **[Core Domain Models](packages/core/README.md)** - Business logic & validation

### Service Documentation
- **[AI Server](ai-server/README.md)** - Ollama integration & model management
- **[Collaboration Server](collaboration-server/README.md)** - Real-time features & WebSocket API
- **[OpenAPI Specification](backend/docs/openapi.yaml)** - Machine-readable API documentation

## 🛠️ Getting Started

### Prerequisites
- **Node.js** 18+ and npm 9+
- **Git** for version control
- **MongoDB** 6.0+ for data storage
- **Redis** 7.0+ for caching and sessions
- **Ollama** (optional) for AI features

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd universe-book-writer
npm install
```

2. **Build core packages:**
```bash
npm run build
```

3. **Configure environment:**
```bash
# Copy example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your configuration
```

4. **Start development servers:**
```bash
# All services (recommended)
npm run dev

# Or individually:
npm run dev:frontend   # Frontend dev server
npm run dev:backend    # Backend API server
npm run dev:ai         # AI server
npm run dev:collab     # Collaboration server
```

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/docs
- **Collaboration**: ws://localhost:5001

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

See the [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) for comprehensive deployment instructions including:
- Docker containerization
- CI/CD pipeline setup
- Production environment configuration
- Monitoring and logging
- Backup and recovery procedures

## 🔌 Plugin Development

The application is designed with extensibility in mind. Create plugins for:
- **Universe-specific features** (Star Trek, Star Wars, etc.)
- **Custom AI models** for different writing styles
- **Specialized UI themes** and components
- **Integration with external services**

See the [Plugin SDK Documentation](packages/plugin-sdk/README.md) for development guides and examples.

## 📋 Project Roadmap

- **Phase 1: Foundation** ✅ **COMPLETED**
- **Phase 1.5: User Experience Foundation** 🔄 *Next*
- **Phase 2: Basic Features** 📋 *Planned*
- **Phase 3: AI Integration** 📋 *Planned*
- **Phase 4: Collaboration** 📋 *Planned*
- **Phase 5: Plugin Development** 📋 *Planned*

See [Project Checklist](PROJECT_CHECKLIST.md) for detailed implementation tracking.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for:
- Development workflow
- Code style guidelines
- Testing requirements
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for authors who create amazing fictional universes**
