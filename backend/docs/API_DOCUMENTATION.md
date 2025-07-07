# Backend API Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Request/Response Formats](#requestresponse-formats)
- [Rate Limiting](#rate-limiting)
- [Versioning](#versioning)
- [Testing](#testing)

## Overview

The VerseForge backend API provides a RESTful interface for managing users, universes, stories, characters, and plugins. Built with Node.js, Express, and TypeScript, following clean architecture principles.

### Base URL
```
Development: http://localhost:5000/api
Production: https://api.verseforge.com/api
```

### API Version
Current version: `v1`

All endpoints are prefixed with `/api/v1`

## Authentication

### Authentication Methods

The API supports multiple authentication methods:

1. **JWT Bearer Tokens** (Primary)
2. **Session Cookies** (Web interface)
3. **API Keys** (Third-party integrations)

### JWT Authentication

```typescript
// Request header
Authorization: Bearer <jwt_token>

// Token payload structure
interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
}
```

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```typescript
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}
```

**Response:**
```typescript
interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    emailVerified: boolean;
  };
  token: string;
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "acceptTerms": true
  }'
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

**Response:**
```typescript
interface LoginResponse {
  success: boolean;
  message: string;
  user: UserProfile;
  token: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### POST /auth/refresh
Refresh JWT token using refresh token.

**Request Body:**
```typescript
interface RefreshRequest {
  refreshToken: string;
}
```

#### POST /auth/logout
Invalidate current session and tokens.

#### POST /auth/forgot-password
Initiate password reset process.

**Request Body:**
```typescript
interface ForgotPasswordRequest {
  email: string;
}
```

#### POST /auth/reset-password
Reset password using reset token.

**Request Body:**
```typescript
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
```

#### POST /auth/verify-email
Verify email address using verification token.

**Request Body:**
```typescript
interface VerifyEmailRequest {
  token: string;
}
```

## User Management

### User Endpoints

#### GET /users/profile
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```typescript
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  preferences: UserPreferences;
  createdAt: string;
  lastLoginAt: string;
}
```

#### PUT /users/profile
Update user profile.

**Request Body:**
```typescript
interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  preferences?: Partial<UserPreferences>;
}
```

#### PUT /users/change-password
Change user password.

**Request Body:**
```typescript
interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
```

#### DELETE /users/account
Delete user account.

**Request Body:**
```typescript
interface DeleteAccountRequest {
  password: string;
  confirmation: string; // Must be "DELETE_MY_ACCOUNT"
}
```

## Universe Management

### Universe Endpoints

#### GET /universes
Get list of universes accessible to the user.

**Query Parameters:**
```typescript
interface UniverseListQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  isPublic?: boolean;
}
```

**Response:**
```typescript
interface UniverseListResponse {
  universes: UniverseSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### POST /universes
Create a new universe.

**Request Body:**
```typescript
interface CreateUniverseRequest {
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
  settings: UniverseSettings;
  pluginId?: string;
}
```

#### GET /universes/:id
Get detailed universe information.

**Response:**
```typescript
interface UniverseDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
  settings: UniverseSettings;
  owner: UserSummary;
  collaborators: CollaboratorInfo[];
  stats: UniverseStats;
  createdAt: string;
  updatedAt: string;
}
```

#### PUT /universes/:id
Update universe information.

#### DELETE /universes/:id
Delete a universe.

#### POST /universes/:id/collaborate
Add collaborator to universe.

**Request Body:**
```typescript
interface AddCollaboratorRequest {
  email: string;
  role: 'viewer' | 'editor' | 'admin';
  permissions: string[];
}
```

## Story Management

### Story Endpoints

#### GET /universes/:universeId/stories
Get stories in a universe.

**Response:**
```typescript
interface StoryListResponse {
  stories: StorySummary[];
  pagination: PaginationInfo;
}
```

#### POST /universes/:universeId/stories
Create a new story.

**Request Body:**
```typescript
interface CreateStoryRequest {
  title: string;
  description: string;
  genre: string;
  status: 'draft' | 'in_progress' | 'completed' | 'published';
  settings: StorySettings;
}
```

#### GET /stories/:id
Get detailed story information.

#### PUT /stories/:id
Update story information.

#### DELETE /stories/:id
Delete a story.

#### GET /stories/:id/chapters
Get story chapters.

#### POST /stories/:id/chapters
Create a new chapter.

#### PUT /stories/:storyId/chapters/:chapterId
Update chapter content.

#### DELETE /stories/:storyId/chapters/:chapterId
Delete a chapter.

## Character Management

### Character Endpoints

#### GET /universes/:universeId/characters
Get characters in a universe.

#### POST /universes/:universeId/characters
Create a new character.

**Request Body:**
```typescript
interface CreateCharacterRequest {
  name: string;
  description: string;
  appearance: CharacterAppearance;
  personality: CharacterPersonality;
  background: CharacterBackground;
  relationships: CharacterRelationship[];
  attributes: Record<string, any>;
}
```

#### GET /characters/:id
Get detailed character information.

#### PUT /characters/:id
Update character information.

#### DELETE /characters/:id
Delete a character.

## Plugin Management

### Plugin Endpoints

#### GET /plugins
Get available plugins.

**Response:**
```typescript
interface PluginListResponse {
  plugins: PluginInfo[];
}

interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  isEnabled: boolean;
  configuration: PluginConfiguration;
}
```

#### POST /plugins/install
Install a plugin.

**Request Body:**
```typescript
interface InstallPluginRequest {
  pluginId: string;
  version?: string;
  configuration?: PluginConfiguration;
}
```

#### PUT /plugins/:id/enable
Enable a plugin.

#### PUT /plugins/:id/disable
Disable a plugin.

#### PUT /plugins/:id/configure
Update plugin configuration.

#### DELETE /plugins/:id
Uninstall a plugin.

## Search and Discovery

### Search Endpoints

#### GET /search
Global search across all content.

**Query Parameters:**
```typescript
interface SearchQuery {
  q: string;
  type?: 'all' | 'universes' | 'stories' | 'characters';
  page?: number;
  limit?: number;
  filters?: SearchFilters;
}
```

**Response:**
```typescript
interface SearchResponse {
  results: SearchResult[];
  facets: SearchFacets;
  pagination: PaginationInfo;
  suggestions: string[];
}
```

## Collaboration

### Real-time Collaboration Endpoints

#### GET /collaboration/sessions/:id
Get collaboration session information.

#### POST /collaboration/sessions
Create a new collaboration session.

#### PUT /collaboration/sessions/:id/join
Join a collaboration session.

#### DELETE /collaboration/sessions/:id/leave
Leave a collaboration session.

#### WebSocket: /ws/collaboration/:sessionId
Real-time collaboration events.

**WebSocket Message Types:**
```typescript
interface CollaborationMessage {
  type: 'cursor' | 'edit' | 'comment' | 'presence';
  data: any;
  timestamp: number;
  userId: string;
}
```

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    requestId: string;
  };
}
```

### Common Error Codes

```typescript
enum ErrorCodes {
  // Authentication
  INVALID_CREDENTIALS = 'AUTH_001',
  TOKEN_EXPIRED = 'AUTH_002',
  TOKEN_INVALID = 'AUTH_003',
  INSUFFICIENT_PERMISSIONS = 'AUTH_004',
  
  // Validation
  VALIDATION_ERROR = 'VAL_001',
  REQUIRED_FIELD_MISSING = 'VAL_002',
  INVALID_FORMAT = 'VAL_003',
  
  // Business Logic
  RESOURCE_NOT_FOUND = 'BIZ_001',
  RESOURCE_CONFLICT = 'BIZ_002',
  OPERATION_NOT_ALLOWED = 'BIZ_003',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_001',
  
  // Server
  INTERNAL_ERROR = 'SRV_001',
  SERVICE_UNAVAILABLE = 'SRV_002'
}
```

## Rate Limiting

### Rate Limit Configuration

| Endpoint Category | Requests per Minute | Burst Limit |
|------------------|---------------------|-------------|
| Authentication | 10 | 15 |
| User Management | 60 | 100 |
| Content Creation | 30 | 50 |
| Content Reading | 100 | 200 |
| Search | 60 | 100 |
| Real-time Collaboration | 1000 | 1500 |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

## Request/Response Formats

### Content Types

- **Request**: `application/json`
- **Response**: `application/json`
- **File Upload**: `multipart/form-data`

### Date Formats

All dates are in ISO 8601 format: `2024-01-15T10:30:00.000Z`

### Pagination

```typescript
interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### Sorting

```typescript
interface SortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
```

### Filtering

```typescript
interface FilterOptions {
  [key: string]: string | number | boolean | string[];
}
```

## Versioning

### API Versioning Strategy

- **URL Versioning**: `/api/v1/`, `/api/v2/`
- **Header Versioning**: `Accept: application/vnd.ubw.v1+json`
- **Backward Compatibility**: Maintained for 2 major versions

### Version History

| Version | Release Date | Status | EOL Date |
|---------|--------------|--------|----------|
| v1.0 | 2024-01-01 | Current | TBD |

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:5000/ws');

// Authentication
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token'
}));
```

### Message Format

```typescript
interface WebSocketMessage {
  type: string;
  id?: string;
  data: any;
  timestamp: number;
}
```

### Event Types

- `collaboration.cursor_move`
- `collaboration.text_change`
- `collaboration.user_join`
- `collaboration.user_leave`
- `notification.new_message`
- `system.maintenance`

## Testing

### Test Endpoints

#### GET /health
Health check endpoint.

**Response:**
```typescript
interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    ai: 'available' | 'unavailable';
  };
}
```

#### GET /metrics
System metrics (requires admin role).

### Testing with curl

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get profile (with token)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/users/profile
```

### Postman Collection

A complete Postman collection is available at `/docs/postman/verseforge-API.json`

## Security

### Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

### Input Validation

- All inputs are validated using Zod schemas
- SQL injection prevention through parameterized queries
- XSS prevention through output encoding
- CSRF protection for web interface

### Audit Logging

All API requests are logged with:
- User ID
- IP Address
- Endpoint accessed
- Request parameters
- Response status
- Timestamp

## Development Tools

### API Documentation Tools

- **Swagger UI**: http://localhost:5000/api-docs
- **ReDoc**: http://localhost:5000/redoc
- **OpenAPI Spec**: http://localhost:5000/api/v1/openapi.json

### Development Scripts

```bash
# Start development server
npm run dev

# Run tests
npm test

# Generate API documentation
npm run docs:generate

# Validate OpenAPI spec
npm run docs:validate

# Generate client SDK
npm run generate:client
```

---

**Last Updated**: 2024  
**API Version**: v1.0.0  
**Documentation Version**: 1.0
