# UI Core Package (@verseforge/ui-core)

A foundational React UI component library providing core design system components, hooks, and utilities for the VerseForge application. This package serves as the base layer for all user interface components across the platform.

## Table of Contents

- [Installation](#installation)
- [Core Philosophy](#core-philosophy)
- [Component System](#component-system)
- [Design Tokens](#design-tokens)
- [Accessibility](#accessibility)
- [Usage Examples](#usage-examples)
- [Development](#development)
- [API Reference](#api-reference)

## Installation

```bash
npm install @verseforge/ui-core
```

## Core Philosophy

The UI Core package follows these design principles:

### 1. **Atomic Design Methodology**
Components are organized in a hierarchical structure:
- **Atoms**: Basic building blocks (Button, Input, Icon)
- **Molecules**: Simple component combinations (SearchBox, FormField)
- **Organisms**: Complex interface sections (Header, Sidebar, Modal)
- **Templates**: Page-level structure components
- **Pages**: Specific application views

### 2. **Design System Consistency**
- Unified color palette and typography
- Consistent spacing and sizing scales
- Standardized interaction patterns
- Comprehensive theme support

### 3. **Accessibility First**
- WCAG 2.1 AA compliance by default
- Comprehensive keyboard navigation
- Screen reader optimization
- High contrast support

### 4. **Plugin Extensibility**
- Theme customization hooks
- Component extension points
- Style override mechanisms
- Universe-specific adaptations

## Component System

### Core Components

#### Atoms

**Button**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}
```

**Input**
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search';
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  helper?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}
```

**Icon**
```typescript
interface IconProps {
  name: string;
  size?: number | 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}
```

#### Molecules

**FormField**
```typescript
interface FormFieldProps {
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
  children: ReactNode;
}
```

**SearchBox**
```typescript
interface SearchBoxProps {
  placeholder?: string;
  value?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  suggestions?: string[];
  loading?: boolean;
}
```

**Card**
```typescript
interface CardProps {
  header?: ReactNode;
  footer?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  border?: boolean;
  children: ReactNode;
}
```

#### Organisms

**Modal**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  children: ReactNode;
}
```

**DataTable**
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  filtering?: FilteringConfig;
  onRowClick?: (row: T) => void;
}
```

**Navigation**
```typescript
interface NavigationProps {
  items: NavigationItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  activeItem?: string;
}
```

### Layout Components

**Grid**
```typescript
interface GridProps {
  columns?: number | 'auto' | ResponsiveValue<number>;
  gap?: SpacingValue;
  align?: 'start' | 'center' | 'end';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  children: ReactNode;
}
```

**Stack**
```typescript
interface StackProps {
  direction?: 'horizontal' | 'vertical';
  spacing?: SpacingValue;
  align?: 'start' | 'center' | 'end';
  wrap?: boolean;
  children: ReactNode;
}
```

**Container**
```typescript
interface ContainerProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: SpacingValue;
  center?: boolean;
  children: ReactNode;
}
```

## Design Tokens

### Color System

```typescript
interface ColorPalette {
  primary: {
    50: string;
    100: string;
    200: string;
    // ... through 900
    DEFAULT: string;
  };
  secondary: ColorScale;
  accent: ColorScale;
  neutral: ColorScale;
  semantic: {
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
    info: ColorScale;
  };
}
```

### Typography Scale

```typescript
interface Typography {
  fontFamily: {
    sans: string[];
    serif: string[];
    mono: string[];
  };
  fontSize: {
    xs: [string, string]; // [size, lineHeight]
    sm: [string, string];
    base: [string, string];
    lg: [string, string];
    xl: [string, string];
    '2xl': [string, string];
    // ... through 9xl
  };
  fontWeight: {
    thin: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
}
```

### Spacing System

```typescript
interface Spacing {
  0: string;
  px: string;
  0.5: string;
  1: string;
  1.5: string;
  2: string;
  // ... through 96
  auto: string;
}
```

## Theme System

### Theme Structure

```typescript
interface Theme {
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  borderRadius: BorderRadiusScale;
  shadows: ShadowScale;
  transitions: TransitionScale;
  breakpoints: BreakpointScale;
  zIndex: ZIndexScale;
}
```

### Theme Provider

```typescript
import { ThemeProvider, createTheme } from '@verseforge/ui-core';

const customTheme = createTheme({
  colors: {
    primary: {
      DEFAULT: '#3B82F6',
      // ... custom colors
    }
  }
});

function App() {
  return (
    <ThemeProvider theme={customTheme}>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Dark Mode Support

```typescript
import { useDarkMode, DarkModeProvider } from '@verseforge/ui-core';

function ThemeToggle() {
  const { isDark, toggle } = useDarkMode();
  
  return (
    <Button onClick={toggle}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </Button>
  );
}
```

## Accessibility Features

### Keyboard Navigation
- Tab order management
- Focus trapping in modals
- Arrow key navigation for lists
- Escape key handling

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Live region announcements
- Role definitions

### Visual Accessibility
- High contrast mode support
- Reduced motion preferences
- Focus indicators
- Color contrast compliance

### Implementation Example

```typescript
import { useA11y } from '@verseforge/ui-core';

function AccessibleButton({ children, ...props }) {
  const { focusProps, pressProps } = useA11y();
  
  return (
    <button
      {...focusProps}
      {...pressProps}
      {...props}
      role="button"
      tabIndex={0}
    >
      {children}
    </button>
  );
}
```

## Responsive Design

### Breakpoint System

```typescript
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};
```

### Responsive Hooks

```typescript
import { useBreakpoint, useMediaQuery } from '@verseforge/ui-core';

function ResponsiveComponent() {
  const breakpoint = useBreakpoint();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div>
      Current breakpoint: {breakpoint}
      {isMobile && <MobileView />}
      {!isMobile && <DesktopView />}
    </div>
  );
}
```

## Animation System

### Transition Utilities

```typescript
import { motion, Transition } from '@verseforge/ui-core';

const fadeIn: Transition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

function AnimatedCard() {
  return (
    <motion.div
      variants={fadeIn}
      transition={{ duration: 0.3 }}
    >
      <Card>Content</Card>
    </motion.div>
  );
}
```

### Predefined Animations

- **Fade**: `fadeIn`, `fadeOut`, `fadeInUp`, `fadeInDown`
- **Slide**: `slideInLeft`, `slideInRight`, `slideInUp`, `slideInDown`
- **Scale**: `scaleIn`, `scaleOut`, `zoomIn`, `zoomOut`
- **Rotate**: `rotateIn`, `rotateOut`, `spin`

## Form System

### Form Components

```typescript
import { Form, FormField, FormValidation } from '@verseforge/ui-core';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
});

function SignupForm() {
  return (
    <Form
      schema={schema}
      onSubmit={(data) => console.log(data)}
    >
      <FormField name="name" label="Full Name">
        <Input placeholder="Enter your name" />
      </FormField>
      
      <FormField name="email" label="Email">
        <Input type="email" placeholder="Enter your email" />
      </FormField>
      
      <FormField name="password" label="Password">
        <Input type="password" placeholder="Enter password" />
      </FormField>
      
      <Button type="submit">Sign Up</Button>
    </Form>
  );
}
```

### Validation Integration

```typescript
import { useFormValidation } from '@verseforge/ui-core';

function CustomForm() {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isValid
  } = useFormValidation({
    initialValues: { email: '', password: '' },
    validationSchema: schema
  });
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Plugin Integration

### Theme Customization

```typescript
// In a Star Trek plugin
export const starTrekTheme = createTheme({
  colors: {
    primary: {
      DEFAULT: '#FFD700', // Starfleet gold
    },
    secondary: {
      DEFAULT: '#1E3A8A', // Deep space blue
    }
  },
  typography: {
    fontFamily: {
      sans: ['Okuda', 'Arial', 'sans-serif']
    }
  }
});

// Usage in plugin
function StarTrekApp() {
  return (
    <ThemeProvider theme={starTrekTheme}>
      <UniverseApp />
    </ThemeProvider>
  );
}
```

### Component Extensions

```typescript
// Extend base components for universe-specific needs
import { Button as BaseButton } from '@verseforge/ui-core';

interface StarfleetButtonProps extends ButtonProps {
  rank?: 'ensign' | 'lieutenant' | 'commander' | 'captain';
  division?: 'command' | 'science' | 'engineering';
}

export function StarfleetButton({ rank, division, ...props }: StarfleetButtonProps) {
  const divisionColor = getDivisionColor(division);
  const rankInsignia = getRankInsignia(rank);
  
  return (
    <BaseButton
      {...props}
      style={{ borderColor: divisionColor }}
      icon={rankInsignia}
    />
  );
}
```

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Component Development Workflow

1. **Create Component**
   ```bash
   npm run generate:component ComponentName
   ```

2. **Write Tests**
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { ComponentName } from './ComponentName';
   
   describe('ComponentName', () => {
     it('renders correctly', () => {
       render(<ComponentName />);
       expect(screen.getByRole('...')).toBeInTheDocument();
     });
   });
   ```

3. **Document Component**
   - Add to Storybook
   - Update type definitions
   - Add usage examples

### Testing Strategy

- **Unit Tests**: Jest + Testing Library
- **Visual Regression**: Chromatic + Storybook
- **Accessibility Tests**: jest-axe
- **Performance Tests**: Lighthouse CI

## API Reference

### Core Exports

```typescript
// Components
export { Button, Input, Card, Modal, Grid, Stack } from './components';

// Hooks
export { 
  useTheme, 
  useDarkMode, 
  useBreakpoint, 
  useMediaQuery,
  useFormValidation 
} from './hooks';

// Utilities
export { 
  createTheme, 
  mergeThemes, 
  responsive, 
  variants 
} from './utils';

// Types
export type {
  Theme,
  ColorPalette,
  Typography,
  ComponentProps,
  ResponsiveValue
} from './types';

// Providers
export { ThemeProvider, DarkModeProvider } from './providers';
```

### Utility Functions

```typescript
// Theme utilities
export function createTheme(config: Partial<Theme>): Theme;
export function mergeThemes(base: Theme, override: Partial<Theme>): Theme;
export function getThemeValue(path: string, theme: Theme): any;

// Responsive utilities
export function responsive<T>(values: ResponsiveObject<T>): ResponsiveValue<T>;
export function breakpoint(bp: string): string;

// Style utilities
export function variants<T>(config: VariantConfig<T>): VariantFunction<T>;
export function spacing(value: SpacingValue): string;
export function color(value: ColorValue): string;
```

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Accessibility**: Screen readers, keyboard navigation
- **Performance**: Code splitting, tree shaking, lazy loading

## Bundle Size

| Component Category | Gzipped Size |
|-------------------|--------------|
| Core components   | ~15KB        |
| Layout components | ~8KB         |
| Form components   | ~12KB        |
| Animation system  | ~6KB         |
| Theme system      | ~4KB         |
| **Total (all)**   | **~45KB**    |

## Migration Guide

### From v0.1.x to v0.2.x

Breaking changes and migration steps will be documented here when new versions are released.

## Contributing

1. Follow the component development workflow
2. Ensure accessibility compliance
3. Add comprehensive tests
4. Update documentation
5. Submit pull request with detailed description

## License

Private - VerseForge Project

---

**Version**: 0.0.1-alpha.1  
**Last Updated**: 2024  
**Maintainer**: VerseForge Team
