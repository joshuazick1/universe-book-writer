# Frontend Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Component Structure](#component-structure)
- [State Management](#state-management)
- [Routing](#routing)
- [Styling System](#styling-system)
- [Plugin Integration](#plugin-integration)
- [Performance](#performance)
- [Testing](#testing)
- [Build and Deployment](#build-and-deployment)

## Overview

The Universe Book Writer frontend is a modern React application built with TypeScript, Vite, and Tailwind CSS. It provides an intuitive interface for managing multi-universe book series with real-time collaboration, AI assistance, and extensible plugin support.

### Technology Stack

- **Framework**: React 18.x with TypeScript
- **Build Tool**: Vite 5.x
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand with React Query
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **Real-time**: WebSocket with Socket.io
- **Icons**: Lucide React
- **Animation**: Framer Motion
- **Testing**: Vitest + Testing Library

### Key Features

- **Modern React Architecture**: Functional components with hooks
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real-time Collaboration**: WebSocket-based live editing
- **Plugin System**: Extensible architecture for universe-specific features
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Code splitting, lazy loading, and optimization

## Architecture

### Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Base UI components
│   │   ├── forms/        # Form components
│   │   ├── layout/       # Layout components
│   │   ├── features/     # Feature-specific components
│   │   └── animation/    # Animation components
│   ├── pages/            # Page components and routing
│   ├── hooks/            # Custom React hooks
│   ├── store/            # State management
│   ├── services/         # API and external services
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── constants/        # Application constants
│   ├── styles/           # Global styles and Tailwind config
│   └── plugins/          # Plugin integration
├── tests/                # Test files
├── docs/                 # Component documentation
└── config/               # Build and configuration files
```

### Component Architecture

#### Component Hierarchy

```
App
├── Router
├── ErrorBoundary
├── ThemeProvider
├── AuthProvider
└── PluginProvider
    ├── Layout
    │   ├── Header
    │   ├── Sidebar
    │   └── Main
    └── Pages
        ├── Dashboard
        ├── UniverseView
        ├── StoryEditor
        └── CharacterManager
```

#### Base UI Components

Located in `src/components/ui/`, these are the foundational components:

- **Button**: Primary interaction element with variants
- **Input**: Form input with validation states
- **Card**: Container component for content grouping
- **Modal**: Overlay component for dialogs
- **Tabs**: Tabbed interface component
- **Table**: Data display with sorting and pagination
- **Toast**: Notification system
- **Spinner**: Loading indicator

#### Feature Components

Located in `src/components/features/`, these are complex, feature-specific components:

- **UniverseSelector**: Universe selection and creation
- **StoryEditor**: Rich text editor with collaboration
- **CharacterForm**: Character creation and editing
- **TimelineView**: Story timeline visualization
- **CollaborationPanel**: Real-time collaboration interface

## Development Setup

### Prerequisites

- Node.js 18+ and npm 9+
- Git for version control
- VS Code with recommended extensions

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Universe_Book_Writer

# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Development Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint

# Testing
npm run test
npm run test:ui
npm run test:coverage

# Component generation
npm run generate:component <ComponentName>
npm run generate:page <PageName>
```

### Environment Configuration

Create `.env.local` for local development:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_WS_URL=ws://localhost:5001

# AI Services
VITE_AI_SERVER_URL=http://localhost:8000

# Feature Flags
VITE_ENABLE_COLLABORATION=true
VITE_ENABLE_AI_ASSISTANCE=true
VITE_DEBUG_MODE=true

# Analytics (optional)
VITE_ANALYTICS_ID=your-analytics-id
```

## Component Structure

### Component Best Practices

#### Component Definition

```typescript
// ComponentName.tsx
import React from 'react';
import { cn } from '@/utils/cn';

interface ComponentNameProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'base-styles',
        {
          'variant-primary': variant === 'primary',
          'variant-secondary': variant === 'secondary',
          'size-sm': size === 'sm',
          'size-md': size === 'md',
          'size-lg': size === 'lg',
          'disabled': disabled,
        },
        className
      )}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </div>
  );
};
```

#### Component Testing

```typescript
// ComponentName.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders children correctly', () => {
    render(<ComponentName>Test Content</ComponentName>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(
      <ComponentName onClick={handleClick}>
        Click me
      </ComponentName>
    );
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(
      <ComponentName className="custom-class">
        Content
      </ComponentName>
    );
    
    expect(screen.getByText('Content')).toHaveClass('custom-class');
  });
});
```

#### Component Storybook

```typescript
// ComponentName.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from './ComponentName';

const meta: Meta<typeof ComponentName> = {
  title: 'UI/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};
```

## State Management

### Architecture Overview

The application uses a hybrid approach to state management:

- **Zustand**: For global application state
- **React Query**: For server state and caching
- **Local State**: For component-specific state using useState

### Zustand Store Structure

```typescript
// src/store/index.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AuthSlice, createAuthSlice } from './slices/authSlice';
import { UniverseSlice, createUniverseSlice } from './slices/universeSlice';
import { UISlice, createUISlice } from './slices/uiSlice';

export interface AppState extends AuthSlice, UniverseSlice, UISlice {}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (...args) => ({
        ...createAuthSlice(...args),
        ...createUniverseSlice(...args),
        ...createUISlice(...args),
      }),
      {
        name: 'universe-book-writer-store',
        partialize: (state) => ({
          auth: state.auth,
          preferences: state.preferences,
        }),
      }
    ),
    { name: 'universe-book-writer' }
  )
);
```

### Auth State Slice

```typescript
// src/store/slices/authSlice.ts
import { StateCreator } from 'zustand';

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export interface AuthSlice extends AuthState, AuthActions {}

export const createAuthSlice: StateCreator<
  AppState,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  // State
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  // Actions
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const response = await authAPI.login(credentials);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    // Clear React Query cache
    queryClient.clear();
  },

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token, isAuthenticated: !!token }),
});
```

### React Query Configuration

```typescript
// src/services/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
```

### Custom Hooks for Data Fetching

```typescript
// src/hooks/useUniverses.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { universesAPI } from '@/services/api';

export const useUniverses = (params?: UniverseListParams) => {
  return useQuery({
    queryKey: ['universes', params],
    queryFn: () => universesAPI.getUniverses(params),
    enabled: !!params,
  });
};

export const useCreateUniverse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: universesAPI.createUniverse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universes'] });
    },
  });
};

export const useUniverse = (id: string) => {
  return useQuery({
    queryKey: ['universe', id],
    queryFn: () => universesAPI.getUniverse(id),
    enabled: !!id,
  });
};
```

## Routing

### Router Configuration

```typescript
// src/pages/Router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'auth',
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'universes',
        element: <ProtectedRoute />,
        children: [
          { index: true, element: <UniversesPage /> },
          { path: 'new', element: <CreateUniversePage /> },
          {
            path: ':universeId',
            element: <UniversePage />,
            children: [
              { index: true, element: <UniverseOverview /> },
              { path: 'stories', element: <StoriesPage /> },
              { path: 'characters', element: <CharactersPage /> },
              { path: 'timeline', element: <TimelinePage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
```

### Protected Routes

```typescript
// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiresAuth = true,
  requiredRole,
}) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAppStore();

  if (requiresAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

## Styling System

### Tailwind CSS Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          500: '#64748b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};

export default config;
```

### CSS Custom Properties

```css
/* src/styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --color-primary: 59 130 246;
    --color-secondary: 100 116 139;
    --radius: 0.5rem;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  .dark {
    --color-primary: 96 165 250;
    --color-secondary: 148 163 184;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50;
  }

  .btn-primary {
    @apply btn bg-primary text-primary-foreground hover:bg-primary/90;
  }

  .btn-secondary {
    @apply btn bg-secondary text-secondary-foreground hover:bg-secondary/80;
  }
}
```

### Component Variants with CVA

```typescript
// src/utils/variants.ts
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
```

## Plugin Integration

### Plugin Architecture

```typescript
// src/plugins/types.ts
export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  universeType: string;
  components?: PluginComponents;
  theme?: PluginTheme;
  hooks?: PluginHooks;
}

export interface PluginComponents {
  CharacterForm?: React.ComponentType<CharacterFormProps>;
  UniverseSettings?: React.ComponentType<UniverseSettingsProps>;
  StoryElements?: React.ComponentType<StoryElementsProps>;
}

export interface PluginTheme {
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  components?: Record<string, React.CSSProperties>;
}
```

### Plugin Provider

```typescript
// src/plugins/PluginProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { PluginConfig } from './types';

interface PluginContextValue {
  plugins: PluginConfig[];
  activePlugin: PluginConfig | null;
  loadPlugin: (pluginId: string) => Promise<void>;
  getPluginComponent: (componentName: string) => React.ComponentType | null;
}

const PluginContext = createContext<PluginContextValue | null>(null);

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [plugins, setPlugins] = useState<PluginConfig[]>([]);
  const [activePlugin, setActivePlugin] = useState<PluginConfig | null>(null);

  const loadPlugin = async (pluginId: string) => {
    try {
      const plugin = await import(`./registry/${pluginId}`);
      setActivePlugin(plugin.default);
    } catch (error) {
      console.error(`Failed to load plugin: ${pluginId}`, error);
    }
  };

  const getPluginComponent = (componentName: string) => {
    return activePlugin?.components?.[componentName] || null;
  };

  return (
    <PluginContext.Provider
      value={{
        plugins,
        activePlugin,
        loadPlugin,
        getPluginComponent,
      }}
    >
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugin = () => {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugin must be used within a PluginProvider');
  }
  return context;
};
```

### Plugin Example (Star Trek)

```typescript
// src/plugins/registry/star-trek/index.ts
import { PluginConfig } from '../../types';
import { StarfleetCharacterForm } from './components/CharacterForm';
import { StarTrekTheme } from './theme';

export const starTrekPlugin: PluginConfig = {
  id: 'star-trek',
  name: 'Star Trek Universe',
  version: '1.0.0',
  description: 'Official Star Trek universe plugin',
  author: 'Universe Book Writer Team',
  universeType: 'star-trek',
  components: {
    CharacterForm: StarfleetCharacterForm,
  },
  theme: StarTrekTheme,
};

export default starTrekPlugin;
```

## Performance

### Code Splitting

```typescript
// Lazy loading of pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const UniversePage = lazy(() => import('@/pages/UniversePage'));

// Component with Suspense
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/universe/:id" element={<UniversePage />} />
  </Routes>
</Suspense>
```

### Virtualization for Large Lists

```typescript
// src/components/VirtualizedList.tsx
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export const VirtualizedList = <T,>({
  items,
  height,
  itemHeight,
  renderItem,
}: VirtualizedListProps<T>) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  );

  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### Image Optimization

```typescript
// src/components/OptimizedImage.tsx
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
      {error && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400">Failed to load image</span>
        </div>
      )}
    </div>
  );
};
```

## Testing

### Testing Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Utilities

```typescript
// src/test/utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
```

### Integration Tests

```typescript
// src/test/integration/auth.test.tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import { LoginPage } from '@/pages/auth/LoginPage';

describe('Authentication Integration', () => {
  it('allows user to login successfully', async () => {
    const user = userEvent.setup();
    
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });
  });
});
```

## Build and Deployment

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Analyze bundle size
npm run analyze
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment-Specific Builds

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}));
```

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Maintainer**: Universe Book Writer Team
