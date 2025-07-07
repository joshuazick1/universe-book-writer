# VerseForge

A comprehensive, AI-powered writing assistant for crafting and managing book series across multiple fictional universes. Built for extensibility, collaboration, and reliability, it empowers authors and teams to create, organize, and maintain complex worlds and stories with confidence.

---

## 🚦 Project Status

- **Current Version:** 0.0.1-alpha.1 (Development) – Phase A.2.5 Enhanced Foundation Optimized
- **Status:** Phase A.2.5 In Progress (Rock-Solid Foundation First, Accelerated Development Later)
- **Philosophy:** Invest in a robust, extensible foundation to dramatically reduce future development time and improve quality.

---

## ✨ Key Features

### World-Building & Story Management

- **Universe Management:** Create, edit, and organize multiple universes with plugin-based customization.
- **Story & Chapter Management:** Structure multi-book series, manage stories and chapters, and ensure narrative consistency.
- **Character Development:** Rich profiles, relationship mapping, and cross-book tracking.
- **Timeline & Lore Tools:** Visual timelines, lore documentation, and world consistency validation.

### AI-Assisted Writing

- **Ollama Integration:** Context-aware writing assistance, plot suggestions, and content generation.
- **Consistency Checking:** Automated validation for story, character, and universe coherence.
- **Universe-Specific AI:** Tailored models and prompt templates per universe/plugin.

### Collaboration & Productivity

- **Real-Time Collaboration:** Multi-user editing, operational transform, and live sync.
- **Version Control:** Track changes, manage document versions, and recover lost data.
- **Advanced Search:** Full-text and semantic search across all content.
- **Plugin System:** Extensible for universe-specific rules, UI, and AI.

---

## 🏗️ Architecture Overview

- **Monorepo:** All services and packages in a single repository.
- **Layered Backend:** Core (domain), API, Application, Infrastructure.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS.
- **AI Server:** Orchestrator for multiple Ollama instances, load balancing, and health monitoring.
- **Collaboration Server:** Real-time sync via WebSocket.
- **Database:** MongoDB (primary), Redis (caching/sessions).

```
verseforge/
├── frontend/              # React + TypeScript + Vite
├── backend/               # Node.js + Express + TypeScript
├── ai-server/             # Ollama orchestration & model management
├── collaboration-server/  # WebSocket server for real-time features
├── packages/              # Core domain, UI, plugin SDK
├── plugins/               # Official and custom universe plugins
└── docs/                  # Comprehensive documentation
```

---

## 🔌 API Overview

### Authentication

- `POST /api/v1/auth/register` – Register new user
- `POST /api/v1/auth/login` – Login and receive JWT
- `POST /api/v1/auth/refresh` – Refresh JWT
- `POST /api/v1/auth/logout` – Logout
- `POST /api/v1/auth/forgot-password` – Request password reset
- `POST /api/v1/auth/reset-password` – Reset password
- `POST /api/v1/auth/verify-email` – Verify email

### User Management

- `GET /api/v1/users/profile` – Get current user profile
- `PUT /api/v1/users/profile` – Update profile
- `PUT /api/v1/users/change-password` – Change password
- `DELETE /api/v1/users/account` – Delete account
- `GET /api/v1/users/:id` – Get user by ID
- `GET /api/v1/users/` – List users (admin/mod)
- `PUT /api/v1/users/:id/roles` – Update user role (admin)
- `POST /api/v1/users/:id/suspend` – Suspend user (admin/mod)

### Universe Management

- `GET /api/v1/universes` – List universes
- `POST /api/v1/universes` – Create universe
- `GET /api/v1/universes/:id` – Get universe details
- `PUT /api/v1/universes/:id` – Update universe
- `DELETE /api/v1/universes/:id` – Delete universe
- `POST /api/v1/universes/:id/collaborate` – Add collaborator

### Story & Chapter Management

- `GET /api/v1/universes/:universeId/stories` – List stories in universe
- `POST /api/v1/universes/:universeId/stories` – Create story
- `GET /api/v1/stories/:id` – Get story details
- `PUT /api/v1/stories/:id` – Update story
- `DELETE /api/v1/stories/:id` – Delete story
- `GET /api/v1/stories/:id/chapters` – List chapters
- `POST /api/v1/stories/:id/chapters` – Create chapter

### Plugin Management

- `GET /api/v1/plugins` – List plugins
- `GET /api/v1/plugins/:name` – Plugin details
- `POST /api/v1/plugins/load` – Load plugin
- `POST /api/v1/plugins/:name/activate` – Activate plugin
- `POST /api/v1/plugins/:name/deactivate` – Deactivate plugin
- `DELETE /api/v1/plugins/:name` – Unload plugin
- `PUT /api/v1/plugins/:name/config` – Update plugin config

### Collaboration

- `POST /api/v1/collaboration-invitations` – Create invitation
- `GET /api/v1/collaboration-invitations/me` – My invitations
- `POST /api/v1/collaboration-invitations/:token/accept` – Accept invitation
- `POST /api/v1/collaboration-invitations/:token/decline` – Decline invitation

### AI Server (Ollama Orchestrator)

- `GET /health` – Server status
- `POST /api/generate` – Text generation
- `POST /api/generate/stream` – Streaming generation
- `GET /api/models` – List models
- `POST /api/models/pull` – Install model (admin)
- `GET /api/servers/status` – Server status
- `POST /api/config/strategy` – Change load balancing
- `GET /api/orchestrator/benchmarks` – Benchmark data

> See [backend/docs/API_DOCUMENTATION.md](backend/docs/API_DOCUMENTATION.md) and [ai-server/README.md](ai-server/README.md) for full details and request/response examples.

---

## 🧪 Testing & Quality

- **Unit Tests:** Jest + Enhanced TypeScript runner (`npm test`, `npm run test:backend`, etc.)
- **E2E Tests:** Playwright (`npm run test:e2e`)
- **Coverage:** `npm run test:coverage` (target: >85%)
- **CI/CD:** All tests must pass before merge; coverage and summary JSONs for automation.
- **Logs:** Test results and logs are organized in `test-results/` with rotation and metadata.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB 6.0+
- Redis 7.0+
- Ollama (for AI features)
- Git

### Setup

```powershell
git clone <repository-url>
cd verseforge
npm install
npm run build
# Copy and edit .env files for backend and frontend
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Running

```powershell
npm run dev         # Start all services (recommended)
npm run dev:frontend
npm run dev:backend
npm run dev:ai
npm run dev:collab
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **AI Server:** http://localhost:11434 (default Ollama)
- **Collaboration:** ws://localhost:5001

---

## 📚 Documentation

- [Master Phase Plan](docs/checklists/PHASE_MASTER_PLAN.md) – Roadmap, phases, and rationale
- [API Documentation](backend/docs/API_DOCUMENTATION.md) – REST API details
- [AI Server & Orchestrator](ai-server/README.md) – AI architecture and endpoints
- [Plugin SDK](packages/plugin-sdk/README.md) – Plugin development
- [Frontend Guide](frontend/docs/FRONTEND_DOCUMENTATION.md)
- [Development Guide](docs/DEVELOPMENT_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)

---

## 🔌 Plugin System

- **Plugin-First:** All universe-specific logic (e.g., Star Trek, Star Wars) is encapsulated in plugins.
- **SDK:** See [packages/plugin-sdk/README.md](packages/plugin-sdk/README.md) for guides and examples.
- **Custom AI Models:** Plugins can register their own prompt templates and AI behaviors.
- **UI Extensions:** Plugins can add universe-specific UI and validation.

---

## 🏆 Quality Gates & Success Criteria

- **Test Coverage:** >85% for all phases
- **Performance:** All benchmarks met (see phase plan)
- **Security:** Zero critical vulnerabilities
- **Reliability:** >99.5% uptime during development
- **User Experience:** <5 min to first story, >80% feature adoption, >4.5/5 satisfaction

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for code style, testing, and PR process.

---

**Built for authors, by world-builders.**  
*Create, collaborate, and imagine without limits.*

---
