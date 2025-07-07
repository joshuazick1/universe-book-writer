# Deployment and Production Guide

## Table of Contents

- [Overview](#overview)
- [Environment Setup](#environment-setup)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup and Recovery](#backup-and-recovery)
- [Scaling](#scaling)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

This guide covers deployment strategies for the VerseForge application across different environments, from local development to production. The application consists of multiple services that can be deployed together or separately.

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Server     │
│   (React/Vite)  │────│   (Node.js)     │────│   (Ollama)      │
│   Port: 5173    │    │   Port: 5000    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Collaboration  │    │    MongoDB      │    │     Redis       │
│  Server (WS)    │    │   Database      │    │     Cache       │
│  Port: 5001     │    │   Port: 27017   │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Environment Setup

### Development Environment

#### Prerequisites

```powershell
# Node.js 18+
node --version
npm --version

# Docker Desktop
docker --version
docker-compose --version

# MongoDB Tools (optional)
mongosh --version

# Git
git --version
```

#### Local Development Setup

```powershell
# Clone repository
git clone https://github.com/your-org/verseforge.git
cd verseforge

# Install dependencies
npm install

# Setup environment variables
Copy-Item .env.example .env.local

# Start development services
npm run dev:all
```

#### Environment Variables (.env.local)

```env
# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/verseforge_dev
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AI Server
AI_SERVER_URL=http://localhost:8000
OLLAMA_HOST=localhost:11434

# Collaboration
WS_PORT=5001
WS_CORS_ORIGIN=http://localhost:5173

# Email (optional for development)
EMAIL_PROVIDER=console
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Logging
LOG_LEVEL=debug
LOG_FORMAT=dev

# Feature Flags
ENABLE_AI_FEATURES=true
ENABLE_COLLABORATION=true
ENABLE_PLUGINS=true
```

### Production Environment

#### Infrastructure Requirements

**Minimum Server Specifications:**
- **CPU**: 4 vCPUs
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 1Gbps
- **OS**: Ubuntu 20.04 LTS or CentOS 8

**Recommended for High Traffic:**
- **CPU**: 8+ vCPUs
- **RAM**: 16GB+
- **Storage**: 500GB+ NVMe SSD
- **Network**: 10Gbps
- **Load Balancer**: NGINX or HAProxy

#### Production Environment Variables (.env.production)

```env
# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://app.verseforge.com
CORS_ORIGIN=https://app.verseforge.com

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/verseforge?authSource=admin
REDIS_URL=redis://:password@redis:6379

# JWT Configuration (Use strong secrets)
JWT_SECRET=your-production-jwt-secret-64-chars-minimum
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# AI Server
AI_SERVER_URL=http://ai-server:8000
OLLAMA_HOST=ollama:11434

# Collaboration
WS_PORT=5001
WS_CORS_ORIGIN=https://app.verseforge.com

# Email
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=noreply@verseforge.com
SMTP_PASS=your-smtp-password

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
SESSION_SECRET=your-session-secret-64-chars-minimum

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

## Development Deployment

### Docker Development Setup

#### docker-compose.dev.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: ubw-mongodb-dev
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: verseforge_dev
    volumes:
      - mongodb_dev_data:/data/db
      - ./scripts/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - ubw-network

  redis:
    image: redis:7-alpine
    container_name: ubw-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    networks:
      - ubw-network

  ollama:
    image: ollama/ollama:latest
    container_name: ubw-ollama-dev
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_dev_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
    networks:
      - ubw-network

volumes:
  mongodb_dev_data:
  redis_dev_data:
  ollama_dev_data:

networks:
  ubw-network:
    driver: bridge
```

#### Development Commands

```powershell
# Start development infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Start frontend development server
cd frontend
npm run dev

# Start backend development server
cd backend
npm run dev

# Start AI server
cd ai-server
npm run dev

# Start collaboration server
cd collaboration-server
npm run dev

# Run all development servers
npm run dev:all
```

### Local Testing

```powershell
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Check build
npm run build:all

# Lint all code
npm run lint:all

# Type check
npm run type-check:all
```

## Production Deployment

### Docker Production Setup

#### Dockerfile (Backend)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/plugin-sdk/package*.json ./packages/plugin-sdk/
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/ ./packages/
COPY backend/ ./backend/
COPY tsconfig.json ./

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/backend/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Set user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
```

#### Dockerfile (Frontend)

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY packages/ui-core/package*.json ./packages/ui-core/

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ ./frontend/
COPY packages/ui-core/ ./packages/ui-core/

# Build application
WORKDIR /app/frontend
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built application
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install security updates
RUN apk update && apk upgrade

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    container_name: ubw-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - backend
    networks:
      - ubw-network

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: ubw-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./logs:/app/logs
    networks:
      - ubw-network

  collaboration-server:
    build:
      context: .
      dockerfile: collaboration-server/Dockerfile
    container_name: ubw-collaboration
    restart: unless-stopped
    ports:
      - "5001:5001"
    env_file:
      - .env.production
    depends_on:
      - redis
    networks:
      - ubw-network

  ai-server:
    build:
      context: .
      dockerfile: ai-server/Dockerfile
    container_name: ubw-ai-server
    restart: unless-stopped
    ports:
      - "8000:8000"
    env_file:
      - .env.production
    depends_on:
      - ollama
    networks:
      - ubw-network

  mongodb:
    image: mongo:6.0
    container_name: ubw-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_PASSWORD}
      MONGO_INITDB_DATABASE: verseforge
    volumes:
      - mongodb_data:/data/db
      - ./backups:/backups
    networks:
      - ubw-network

  redis:
    image: redis:7-alpine
    container_name: ubw-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - ubw-network

  ollama:
    image: ollama/ollama:latest
    container_name: ubw-ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
    networks:
      - ubw-network

volumes:
  mongodb_data:
  redis_data:
  ollama_data:

networks:
  ubw-network:
    driver: bridge
```

### Production Deployment Commands

```bash
# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## CI/CD Pipeline

### GitHub Actions Workflow

#### .github/workflows/ci.yml

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check:all
      
      - name: Lint
        run: npm run lint:all
      
      - name: Unit tests
        run: npm test
      
      - name: Build
        run: npm run build:all
      
      - name: E2E tests
        run: npm run test:e2e

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level moderate
      
      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

  deploy-staging:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add staging deployment commands

  deploy-production:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add production deployment commands
```

## Monitoring and Logging

### Application Monitoring

#### Health Check Endpoints

```typescript
// Health check implementation
export const healthCheck = async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    services: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      ai: await checkAI(),
    },
  };

  const isHealthy = Object.values(health.services).every(
    service => service === 'connected' || service === 'available'
  );

  res.status(isHealthy ? 200 : 503).json(health);
};
```

#### Logging Configuration

```typescript
// Winston logger setup
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'verseforge' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### Performance Monitoring

#### Prometheus Metrics

```typescript
// Metrics collection
import prometheus from 'prom-client';

export const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500],
});

export const activeConnections = new prometheus.Gauge({
  name: 'websocket_active_connections',
  help: 'Number of active WebSocket connections',
});

export const pluginLoadTime = new prometheus.Histogram({
  name: 'plugin_load_duration_ms',
  help: 'Time taken to load plugins in ms',
  labelNames: ['plugin_id'],
});
```

## Backup and Recovery

### Database Backup Strategy

#### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

# Configuration
DB_NAME="verseforge"
BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# MongoDB backup
mongodump \
  --host mongodb:27017 \
  --username admin \
  --password $MONGODB_PASSWORD \
  --authenticationDatabase admin \
  --db $DB_NAME \
  --out $BACKUP_DIR/mongodb_$TIMESTAMP

# Compress backup
tar -czf $BACKUP_DIR/mongodb_$TIMESTAMP.tar.gz -C $BACKUP_DIR mongodb_$TIMESTAMP
rm -rf $BACKUP_DIR/mongodb_$TIMESTAMP

# Redis backup
redis-cli --rdb $BACKUP_DIR/redis_$TIMESTAMP.rdb

# Clean old backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
```

#### Backup Cron Job

```bash
# Add to crontab
# Daily backup at 2 AM
0 2 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Disaster Recovery

#### Recovery Procedures

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
DB_NAME="verseforge"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Extract backup
tar -xzf $BACKUP_FILE

# Restore MongoDB
mongorestore \
  --host mongodb:27017 \
  --username admin \
  --password $MONGODB_PASSWORD \
  --authenticationDatabase admin \
  --db $DB_NAME \
  --drop \
  ./mongodb_*/verseforge

echo "Restore completed from: $BACKUP_FILE"
```

## Scaling

### Horizontal Scaling

#### Load Balancer Configuration (NGINX)

```nginx
upstream backend {
    server backend-1:5000;
    server backend-2:5000;
    server backend-3:5000;
}

upstream websocket {
    ip_hash;
    server collaboration-1:5001;
    server collaboration-2:5001;
}

server {
    listen 80;
    server_name app.verseforge.com;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

### Database Scaling

#### MongoDB Replica Set

```yaml
# docker-compose.replica.yml
version: '3.8'

services:
  mongo1:
    image: mongo:6.0
    command: mongod --replSet rs0 --bind_ip_all
    ports:
      - "27017:27017"
    volumes:
      - mongo1_data:/data/db

  mongo2:
    image: mongo:6.0
    command: mongod --replSet rs0 --bind_ip_all
    ports:
      - "27018:27017"
    volumes:
      - mongo2_data:/data/db

  mongo3:
    image: mongo:6.0
    command: mongod --replSet rs0 --bind_ip_all
    ports:
      - "27019:27017"
    volumes:
      - mongo3_data:/data/db
```

## Security

### SSL/TLS Configuration

#### Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d app.verseforge.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Security Headers

```nginx
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### Firewall Configuration

```bash
# UFW firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Troubleshooting

### Common Issues

#### Service Connection Issues

```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs backend
docker-compose logs mongodb

# Test database connection
docker exec -it ubw-mongodb mongosh

# Test Redis connection
docker exec -it ubw-redis redis-cli ping
```

#### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check database performance
docker exec -it ubw-mongodb mongosh --eval "db.stats()"

# Monitor logs for errors
tail -f logs/error.log
```

#### Plugin Issues

```bash
# Validate plugin
npm run validate:plugin <plugin-name>

# Check plugin logs
grep "plugin" logs/combined.log

# Restart plugin system
docker-compose restart backend
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Run with debugger
docker-compose -f docker-compose.debug.yml up

# Attach to running container
docker exec -it ubw-backend /bin/sh
```

---

**Version**: 1.0.0  
**Last Updated**: June 8, 2025  
**Maintainer**: VerseForge Team
