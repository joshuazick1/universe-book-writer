# Getting Started

This guide will help you set up the Multi-Universe Book Series Writing Assistant on your local machine and get you writing your first universe-spanning story.

## System Requirements

### Minimum Requirements
- **Node.js** 18.0+ and npm 9.0+
- **Git** 2.40+
- **4GB RAM** (8GB recommended)
- **2GB free disk space**

### Recommended for Full Features
- **MongoDB** 6.0+ (for data persistence)
- **Redis** 7.0+ (for caching and sessions)
- **Ollama** (for AI writing assistance)

## Quick Start (5 minutes)

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd verseforge

# Install all dependencies
npm install

# Build core packages
npm run build
```

### 2. Start Development Mode
```bash
# Start all services at once
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- AI Server: http://localhost:5001
- Collaboration Server: ws://localhost:5002

### 3. Open Your Browser
Navigate to http://localhost:5173 and you'll see the welcome screen!

## Full Setup (Production-Ready)

### 1. Database Setup

#### MongoDB (Required for data persistence)
```bash
# Using Docker (Recommended)
docker run -d \
  --name universe-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:6.0

# Or install locally
# See: https://docs.mongodb.com/manual/installation/
```

#### Redis (Required for sessions and caching)
```bash
# Using Docker
docker run -d \
  --name universe-redis \
  -p 6379:6379 \
  redis:7.0

# Or install locally
# See: https://redis.io/docs/getting-started/installation/
```

### 2. Environment Configuration

#### Backend Configuration
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
# Database
MONGODB_URI=mongodb://admin:password@localhost:27017/universe_writer?authSource=admin
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-too

# Server
PORT=5000
NODE_ENV=development

# AI Server
AI_SERVER_URL=http://localhost:5001

# Collaboration
COLLABORATION_SERVER_URL=ws://localhost:5002
```

#### Frontend Configuration
```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5002
VITE_AI_ENABLED=true
```

### 3. AI Setup (Optional but Recommended)

#### Install Ollama
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

#### Download Models
```bash
# Basic writing model (2GB)
ollama pull llama2:7b

# Advanced writing model (4GB)
ollama pull codellama:13b

# Start Ollama service
ollama serve
```

### 4. Start All Services
```bash
# Option 1: All services at once
npm run dev

# Option 2: Individual services (separate terminals)
npm run dev:frontend    # Frontend development server
npm run dev:backend     # Backend API server
npm run dev:ai          # AI integration server
npm run dev:collab      # Real-time collaboration server
```

## First Steps

### 1. Create Your Account
1. Open http://localhost:5173
2. Click "Sign Up" 
3. Fill in your writer profile
4. Verify your email (development mode auto-confirms)

### 2. Create Your First Universe
1. Click "New Universe"
2. Choose a template or start blank
3. Fill in basic universe details:
   - Name (e.g., "My Sci-Fi Universe")
   - Genre (e.g., Science Fiction)
   - Description

### 3. Add Your First Characters
1. Navigate to "Characters" in your universe
2. Click "Add Character"
3. Fill in character details:
   - Name and basic info
   - Personality traits
   - Background story

### 4. Start Writing Your Story
1. Go to "Stories" section
2. Click "New Story"
3. Set up your story structure:
   - Title and description
   - Timeline placement
   - Main characters

### 5. Use AI Writing Assistance
1. Open your story editor
2. Type some text
3. Press `Ctrl+Space` for AI suggestions
4. Use `/ai` commands for specific help:
   - `/ai continue` - Continue the current scene
   - `/ai describe` - Get scene descriptions
   - `/ai dialogue` - Generate character dialogue

## Troubleshooting

### Common Issues

#### "Cannot connect to database"
- Ensure MongoDB is running: `docker ps` or check system services
- Verify connection string in `backend/.env`
- Check MongoDB logs: `docker logs universe-mongodb`

#### "AI features not working"
- Confirm Ollama is installed and running: `ollama serve`
- Check if models are downloaded: `ollama list`
- Verify AI server URL in configuration

#### "Real-time features not working"
- Check WebSocket connection in browser dev tools
- Ensure collaboration server is running
- Verify firewall isn't blocking WebSocket connections

#### "Frontend won't start"
- Clear node_modules: `rm -rf node_modules && npm install`
- Check for port conflicts: `netstat -tulpn | grep :5173`
- Review console errors in terminal

### Getting Help

1. **Check Documentation**: Most issues are covered in our comprehensive docs
2. **Review Logs**: Check terminal output and browser console for errors
3. **GitHub Issues**: Search existing issues or create a new one
4. **Discord Community**: Join our developer community for real-time help

### Performance Tips

#### For Better Development Experience
- Use an SSD for faster builds
- Allocate 8GB+ RAM for smooth operation
- Use Node.js 18+ for best performance
- Enable file watching limits on Linux: `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf`

#### For Better Writing Experience
- Download multiple AI models for variety
- Use Redis for faster session management
- Enable database indexing for large datasets
- Configure reverse proxy for production setups

## Next Steps

Once you have the basic setup working:

1. **Explore Plugins**: Check out universe-specific plugins (Star Trek, Star Wars, etc.)
2. **Customize Themes**: Create your own writing environment themes
3. **Set Up Collaboration**: Invite other writers to collaborate on your universe
4. **Advanced AI**: Configure specialized AI models for different writing tasks
5. **Production Deployment**: Follow the [Deployment Guide](DEPLOYMENT_GUIDE.md) for production setup

## Related Documentation

- [Development Guide](DEVELOPMENT_GUIDE.md) - Detailed development workflow
- [Frontend Documentation](../frontend/docs/FRONTEND_DOCUMENTATION.md) - React architecture
- [Backend API Documentation](../backend/docs/API_DOCUMENTATION.md) - REST API reference
- [Plugin Development](../packages/plugin-sdk/README.md) - Create your own plugins
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment

---

**Welcome to the VerseForge community! Happy writing! 📚✨**
