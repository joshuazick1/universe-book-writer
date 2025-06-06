# Multi-Universe Book Series Writing Assistant

A modern, AI-powered writing assistant that helps authors create and manage book series across multiple fictional universes. The application provides a flexible, plugin-based architecture that supports any fictional universe through a consistent interface.

## Features

- World building and management
- Character development tools
- Story consistency checking
- AI-assisted writing with Ollama
- Real-time collaboration
- Plugin system for different universes

## Project Structure

The project is organized as a monorepo containing:

- `frontend`: React + TypeScript + Vite application
- `backend`: Node.js + Express + TypeScript server
- `ai-server`: Ollama server management
- `packages`: Shared core libraries
- `plugins`: Official universe plugins
- `tools`: Development utilities

## Getting Started

1. Install Git: Download and install from https://git-scm.com/downloads

2. Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd universe-book-writer
npm install
```

3. Build core packages:

```bash
npm run build
```

4. Start development servers:

```bash
# Frontend
cd frontend
npm run dev

# Backend (in a new terminal)
cd backend
npm run dev

# AI Server (in a new terminal)
cd ai-server
npm run dev
```

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
