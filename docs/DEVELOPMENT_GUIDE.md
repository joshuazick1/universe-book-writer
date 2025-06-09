# Development Guide

This guide provides comprehensive information for developers working on the Multi-Universe Book Series Writing Assistant project. Whether you're contributing to the core platform or developing plugins, this guide will help you understand our development workflow and best practices.

## Development Environment

### Prerequisites
- **Node.js** 18.0+ and npm 9.0+
- **Git** with SSH keys configured
- **VS Code** (recommended) with our workspace configuration
- **MongoDB** 6.0+ and **Redis** 7.0+ for full functionality
- **Docker** (optional) for containerized development

### IDE Setup

#### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-playwright.playwright"
  ]
}
```

#### Workspace Settings
```json
{
  "typescript.preferences.useAliasesForRenames": false,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## Project Architecture

### Monorepo Structure
```
universe-book-writer/
├── packages/
│   ├── core/              # Domain models, validation, shared utilities
│   ├── ui-core/           # Base UI component library
│   └── plugin-sdk/        # Plugin development framework
├── apps/
│   ├── frontend/          # React + TypeScript + Vite
│   ├── backend/           # Node.js + Express + TypeScript
│   ├── ai-server/         # Ollama integration & model management
│   └── collaboration-server/ # WebSocket server for real-time features
├── plugins/               # Official universe plugins
├── tools/                 # Development and build tools
└── docs/                  # Documentation
```

### Technology Stack

#### Frontend
- **React 18** with TypeScript
- **Vite** for development and building
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Query** for server state
- **React Router** for navigation
- **Framer Motion** for animations

#### Backend
- **Node.js** with Express and TypeScript
- **MongoDB** with Mongoose ODM
- **Redis** for caching and sessions
- **JWT** for authentication
- **Zod** for validation
- **Winston** for logging

#### AI Integration
- **Ollama** for local AI models
- **LangChain** for AI orchestration
- **Custom model routing** for task-specific AI

#### Real-time Features
- **Socket.IO** for WebSocket communication
- **Operational Transform** for collaborative editing
- **Event sourcing** for state synchronization

## Development Workflow

### 1. Setting Up Development Environment

```bash
# Clone repository
git clone <repository-url>
cd universe-book-writer

# Install dependencies
npm install

# Build core packages
npm run build

# Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# Edit .env files with your local configuration
```

### 2. Running Development Servers

```bash
# Start all services (recommended for full-stack development)
npm run dev

# Or start services individually:
npm run dev:frontend    # React dev server on :5173
npm run dev:backend     # Express server on :5000
npm run dev:ai          # AI server on :5001
npm run dev:collab      # Collaboration server on :5002
```

### 3. Code Quality and Testing

```bash
# Lint all packages
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

### 4. Building and Packaging

```bash
# Build all packages
npm run build

# Build specific package
npm run build:frontend
npm run build:backend
npm run build:core

# Type checking
npm run type-check
```

## Coding Standards

### TypeScript Guidelines

#### 1. Strict Typing
```typescript
// ✅ Good: Explicit, strict typing
interface User {
  readonly id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ❌ Avoid: Any types
function processUser(user: any) { ... }

// ✅ Good: Generic constraints
function processUser<T extends User>(user: T): T { ... }
```

#### 2. Interface vs Type
```typescript
// ✅ Use interface for object shapes
interface UserProfile {
  name: string;
  avatar?: string;
}

// ✅ Use type for unions, primitives, computed types
type Theme = 'light' | 'dark';
type UserWithTheme = User & { theme: Theme };
```

#### 3. Immutability Patterns
```typescript
// ✅ Use readonly for immutable data
interface Universe {
  readonly id: string;
  readonly createdAt: Date;
  readonly stories: readonly Story[];
}

// ✅ Use as const for literal types
const STORY_STATUS = ['draft', 'published', 'archived'] as const;
type StoryStatus = typeof STORY_STATUS[number];
```

### React Component Guidelines

#### 1. Component Structure
```typescript
// ✅ Functional components with proper typing
interface CharacterCardProps {
  character: Character;
  onEdit?: (character: Character) => void;
  isSelectable?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onEdit,
  isSelectable = false
}) => {
  // Hooks at the top
  const [isExpanded, setIsExpanded] = useState(false);
  const { mutate: updateCharacter } = useUpdateCharacter();

  // Event handlers
  const handleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Render
  return (
    <div className="character-card">
      {/* Component content */}
    </div>
  );
};
```

#### 2. Custom Hooks
```typescript
// ✅ Custom hooks for reusable logic
export const useCharacterManagement = (universeId: string) => {
  const queryClient = useQueryClient();
  
  const characters = useQuery({
    queryKey: ['characters', universeId],
    queryFn: () => fetchCharacters(universeId),
  });

  const createCharacter = useMutation({
    mutationFn: createCharacterApi,
    onSuccess: () => {
      queryClient.invalidateQueries(['characters', universeId]);
    },
  });

  return {
    characters: characters.data ?? [],
    isLoading: characters.isLoading,
    createCharacter: createCharacter.mutate,
    isCreating: createCharacter.isLoading,
  };
};
```

### Backend Architecture Guidelines

#### 1. Clean Architecture Layers
```typescript
// Domain Layer (packages/core)
export interface Universe {
  id: string;
  name: string;
  description: string;
  createdBy: string;
}

// Application Layer (backend/src/application)
export class UniverseService {
  constructor(
    private universeRepository: UniverseRepository,
    private eventBus: EventBus
  ) {}

  async createUniverse(data: CreateUniverseDto): Promise<Universe> {
    const universe = Universe.create(data);
    await this.universeRepository.save(universe);
    await this.eventBus.publish(new UniverseCreatedEvent(universe));
    return universe;
  }
}

// Infrastructure Layer (backend/src/infrastructure)
export class MongoUniverseRepository implements UniverseRepository {
  async save(universe: Universe): Promise<void> {
    await UniverseModel.create(universe);
  }
}

// API Layer (backend/src/api)
export class UniverseController {
  constructor(private universeService: UniverseService) {}

  @Post('/universes')
  async createUniverse(@Body() data: CreateUniverseDto) {
    return this.universeService.createUniverse(data);
  }
}
```

#### 2. Error Handling
```typescript
// ✅ Custom error classes
export class UniverseNotFoundError extends Error {
  constructor(id: string) {
    super(`Universe with id ${id} not found`);
    this.name = 'UniverseNotFoundError';
  }
}

// ✅ Error handling middleware
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Request error', { error: err, requestId: req.id });

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof UniverseNotFoundError) {
    return res.status(404).json({
      error: 'UNIVERSE_NOT_FOUND',
      message: err.message,
    });
  }

  // Default error response
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
};
```

### Styling Guidelines

#### 1. Tailwind CSS Patterns
```typescript
// ✅ Use CSS Variables with Tailwind
const buttonStyles = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// ✅ Component with styling
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonStyles({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

#### 2. Responsive Design
```typescript
// ✅ Mobile-first responsive design
const gridStyles = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
const cardStyles = 'p-4 rounded-lg border bg-card text-card-foreground shadow-sm';

// ✅ Responsive breakpoint utilities
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;
```

## Plugin Development

### 1. Plugin Structure
```typescript
// Plugin manifest
export const StarTrekPlugin: UniversePlugin = {
  id: 'star-trek',
  name: 'Star Trek Universe',
  version: '1.0.0',
  description: 'Complete Star Trek universe support',
  
  // Plugin hooks
  hooks: {
    onUniverseCreate: async (universe) => {
      // Add Star Trek-specific initialization
    },
    onCharacterCreate: async (character) => {
      // Add species, rank validation
    },
  },

  // UI components
  components: {
    CharacterEditor: StarTrekCharacterEditor,
    UniverseSettings: StarTrekUniverseSettings,
  },

  // Theme customization
  theme: {
    colors: {
      primary: '#CC5500', // Starfleet red
      secondary: '#FFD700', // Starfleet gold
    },
  },
};
```

### 2. Plugin Registration
```typescript
// Register plugin
export const registerPlugin = async (plugin: UniversePlugin) => {
  await validatePlugin(plugin);
  pluginRegistry.register(plugin);
  
  // Hot reload in development
  if (process.env.NODE_ENV === 'development') {
    enableHotReload(plugin);
  }
};
```

## Testing Strategy

### 1. Unit Testing
```typescript
// ✅ Component testing
describe('CharacterCard', () => {
  const mockCharacter: Character = {
    id: '1',
    name: 'Luke Skywalker',
    species: 'Human',
    universe: 'star-wars',
  };

  it('displays character information', () => {
    render(<CharacterCard character={mockCharacter} />);
    
    expect(screen.getByText('Luke Skywalker')).toBeInTheDocument();
    expect(screen.getByText('Human')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = jest.fn();
    render(<CharacterCard character={mockCharacter} onEdit={onEdit} />);
    
    await user.click(screen.getByRole('button', { name: /edit/i }));
    
    expect(onEdit).toHaveBeenCalledWith(mockCharacter);
  });
});

// ✅ Service testing
describe('UniverseService', () => {
  let service: UniverseService;
  let mockRepository: jest.Mocked<UniverseRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = new UniverseService(mockRepository, mockEventBus);
  });

  it('creates universe successfully', async () => {
    const universeData = { name: 'Test Universe', description: 'Test' };
    
    const result = await service.createUniverse(universeData);
    
    expect(mockRepository.save).toHaveBeenCalled();
    expect(result).toMatchObject(universeData);
  });
});
```

### 2. Integration Testing
```typescript
// ✅ API integration tests
describe('Universe API', () => {
  let app: Express;
  let testUser: User;

  beforeEach(async () => {
    app = createTestApp();
    testUser = await createTestUser();
  });

  it('creates universe with authentication', async () => {
    const response = await request(app)
      .post('/api/universes')
      .set('Authorization', `Bearer ${testUser.token}`)
      .send({
        name: 'Test Universe',
        description: 'Integration test universe',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Test Universe',
      createdBy: testUser.id,
    });
  });
});
```

### 3. E2E Testing
```typescript
// ✅ Playwright E2E tests
test('user can create and manage universes', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password');
  await page.click('[data-testid=login-button]');

  // Create universe
  await page.click('[data-testid=new-universe-button]');
  await page.fill('[data-testid=universe-name]', 'My Test Universe');
  await page.fill('[data-testid=universe-description]', 'A test universe');
  await page.click('[data-testid=create-universe-button]');

  // Verify creation
  await expect(page.locator('[data-testid=universe-card]')).toContainText('My Test Universe');
});
```

## Debugging and Troubleshooting

### 1. Frontend Debugging
```typescript
// ✅ React DevTools integration
export const useDebugValue = (value: any, label?: string) => {
  React.useDebugValue(value, label);
};

// ✅ Error boundaries
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary:', error, errorInfo);
    // Report to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
```

### 2. Backend Debugging
```typescript
// ✅ Structured logging
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'universe-writer' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ✅ Request correlation
export const correlationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};
```

## Performance Optimization

### 1. Frontend Performance
```typescript
// ✅ Code splitting
const UniverseEditor = lazy(() => import('./UniverseEditor'));
const CharacterManager = lazy(() => import('./CharacterManager'));

// ✅ Memoization
export const CharacterList = memo(({ characters, onSelect }: CharacterListProps) => {
  const sortedCharacters = useMemo(
    () => characters.sort((a, b) => a.name.localeCompare(b.name)),
    [characters]
  );

  return (
    <div>
      {sortedCharacters.map(character => (
        <CharacterCard
          key={character.id}
          character={character}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

// ✅ Virtual scrolling for large lists
export const VirtualizedCharacterList = ({ characters }: { characters: Character[] }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={characters.length}
      itemSize={80}
      itemData={characters}
    >
      {CharacterRow}
    </FixedSizeList>
  );
};
```

### 2. Backend Performance
```typescript
// ✅ Database optimization
export const getUniverseWithCharacters = async (universeId: string) => {
  return Universe.findById(universeId)
    .populate('characters')
    .select('name description characters')
    .lean()
    .exec();
};

// ✅ Caching strategy
export const getCachedUniverse = async (universeId: string): Promise<Universe | null> => {
  const cached = await redis.get(`universe:${universeId}`);
  if (cached) {
    return JSON.parse(cached);
  }

  const universe = await Universe.findById(universeId);
  if (universe) {
    await redis.setex(`universe:${universeId}`, 3600, JSON.stringify(universe));
  }

  return universe;
};
```

## Deployment

### 1. Development Deployment
```bash
# Docker development setup
docker-compose up -d

# With hot reload
npm run dev:docker
```

### 2. Production Deployment
```bash
# Build for production
npm run build

# Start production servers
npm run start:prod

# Or use Docker
docker-compose -f docker-compose.prod.yml up -d
```

## Contributing Guidelines

### 1. Git Workflow
```bash
# Create feature branch
git checkout -b feature/universe-search

# Make changes and commit
git add .
git commit -m "feat: add universe search functionality"

# Push and create PR
git push origin feature/universe-search
```

### 2. Commit Message Format
```
type(scope): description

feat(universe): add search functionality
fix(auth): resolve token refresh issue
docs(api): update authentication endpoints
style(ui): improve button hover states
refactor(db): optimize universe queries
test(e2e): add universe creation test
```

### 3. Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Update documentation
7. Submit a pull request

## Related Documentation

- [Getting Started](GETTING_STARTED.md) - Quick setup guide
- [Frontend Documentation](../frontend/docs/FRONTEND_DOCUMENTATION.md) - React architecture
- [Backend API Documentation](../backend/docs/API_DOCUMENTATION.md) - REST API reference
- [Plugin SDK](../packages/plugin-sdk/README.md) - Plugin development
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment

---

**Happy coding! 🚀**
