# UI Components Documentation

## Overview

The Universe Book Writer frontend features a comprehensive design system with modular UI components that serve as the foundation for all user interfaces. These components are designed with plugin extensibility, universe theming, accessibility, and performance in mind.

## Architecture Overview

### Component Hierarchy

```
UI Component System
├── Core Components (packages/ui-core/)
│   ├── Base Components (Button, Input, Card, etc.)
│   ├── Layout Components (Grid, Container, Stack)
│   ├── Form Components (Form, Field, Validation)
│   └── Navigation Components (Menu, Breadcrumb, Tabs)
├── Composite Components (frontend/src/components/)
│   ├── Feature Components (Editor, Dashboard, Library)
│   ├── Domain Components (Universe, Story, Character)
│   └── Page Components (Home, Settings, Profile)
├── Plugin Components (dynamic registration)
│   ├── Universe-Specific Components
│   ├── Theme Components
│   └── Feature Extensions
└── Animation Framework (frontend/src/components/animation/)
    ├── Motion Components
    ├── Transition Components
    └── Animation Hooks
```

### Design Principles

1. **Plugin-First Architecture**: All components support plugin-based customization and extension
2. **Universe Theming**: Components adapt to universe-specific design languages (LCARS, Imperial, etc.)
3. **Accessibility**: WCAG 2.1 AA compliance with screen reader and keyboard navigation support
4. **Performance**: Optimized for React 18 with concurrent features and code splitting
5. **Type Safety**: Full TypeScript integration with strict typing and IntelliSense support

### Plugin Integration System

All components use the `withPluginComponent` Higher-Order Component (HOC) that enables:

- **Dynamic Component Registration**: Plugins can register custom component variants
- **Runtime Component Replacement**: Hot-swappable components without app restart
- **Props Augmentation**: Plugin-specific props and behavior injection
- **Universe-Specific Variants**: Components adapt to active universe context
- **Theme Override System**: Complete visual customization through plugin themes

### Theme Integration Architecture

Components integrate with the comprehensive ThemeProvider system:

- **Multi-Theme Support**: Default, dark, light, and universe-specific themes
- **CSS Custom Properties**: Dynamic theming with CSS variables
- **Plugin Theme Registration**: Plugins can register custom theme configurations
- **Runtime Theme Switching**: Seamless theme transitions without page reload
- **Responsive Design**: Mobile-first responsive components with breakpoint support

## Core Components Library

### Base Components (packages/ui-core/)

#### Button Component

**Location**: `packages/ui-core/src/components/Button/Button.tsx`

A versatile, accessible button component with comprehensive variant support and plugin integration.

**Component Features**:
- **Accessibility**: Full ARIA support, keyboard navigation, focus management
- **Variants**: 8 semantic variants with universe-specific styling
- **Sizes**: 4 size options with consistent spacing and typography
- **States**: Loading, disabled, pressed, and hover states
- **Plugin Support**: Universe-specific button styles and behaviors

**Props Interface**:

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'universe' | 'danger' | 'ghost' | 'outline' | 'link' | 'icon';
  size: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

**Usage Examples**:

```tsx
import { Button } from '@universe-book-writer/ui-core';

// Primary button with loading state
<Button variant="primary" size="lg" loading>
  Creating Universe...
</Button>

// Universe-themed button (adapts to active universe)
<Button variant="universe" leftIcon={<StarIcon />}>
  Enter Starfleet
</Button>

// Icon button with accessibility
<Button variant="icon" size="sm" aria-label="Delete character">
  <TrashIcon />
</Button>

// Full-width form button
<Button variant="primary" fullWidth>
  Save Story
</Button>
```

**Plugin Customization**:

```typescript
// Star Trek plugin button variant
pluginManager.registerComponent('Button', {
  universeId: 'star-trek',
  component: StarfleetButton,
  props: {
    variant: 'starfleet',
    soundEffects: true,
    lcarsAnimation: true
  }
});
```

#### Input Component

**Location**: `packages/ui-core/src/components/Input/Input.tsx`

A comprehensive form input component with validation, accessibility, and plugin theming support.

**Component Features**:
- **Input Types**: Text, email, password, number, textarea, select
- **Validation**: Real-time validation with error states and messages
- **Accessibility**: ARIA labels, descriptions, and error announcements
- **Plugin Theming**: Universe-specific input styling and behavior

**Props Interface**:

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant: 'default' | 'universe' | 'minimal';
  size: 'sm' | 'md' | 'lg';
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => string | null;
  };
}
```

**Usage Examples**:

```tsx
// Character name input with validation
<Input
  label="Character Name"
  placeholder="Enter character name..."
  required
  validation={{
    required: true,
    minLength: 2,
    maxLength: 50
  }}
  error={errors.characterName}
/>

// Universe-themed password input
<Input
  type="password"
  label="Starfleet Authorization Code"
  variant="universe"
  leftIcon={<ShieldIcon />}
  validation={{
    required: true,
    minLength: 8,
    pattern: /^(?=.*[A-Z])(?=.*[0-9])/
  }}
/>
```

#### Card Component

**Location**: `packages/ui-core/src/components/Card/Card.tsx`

A flexible card container component for content organization with plugin theming support.

**Component Features**:
- **Layout Variants**: Standard, compact, elevated, bordered
- **Interactive States**: Hover, focus, selected states
- **Content Organization**: Header, body, footer sections
- **Plugin Integration**: Universe-specific card styling

**Props Interface**:

```typescript
interface CardProps {
  variant: 'default' | 'compact' | 'elevated' | 'bordered' | 'universe';
  interactive?: boolean;
  selected?: boolean;
  loading?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}
```

**Usage Examples**:

```tsx
// Universe card with interactive states
<Card
  variant="universe"
  interactive
  selected={selectedUniverse === universe.id}
  header={
    <div className="flex items-center space-x-2">
      <UniverseIcon universe={universe.type} />
      <h3>{universe.name}</h3>
    </div>
  }
  footer={
    <div className="flex justify-between">
      <span>{universe.stories.length} stories</span>
      <Button variant="ghost" size="sm">Edit</Button>
    </div>
  }
>
  <p>{universe.description}</p>
</Card>

// Character profile card
<Card variant="elevated" loading={isLoading}>
  <CharacterAvatar character={character} />
  <h4>{character.name}</h4>
  <p>{character.role}</p>
</Card>
```

### Layout Components

#### Grid Component

**Location**: `packages/ui-core/src/components/Grid/Grid.tsx`

A responsive grid system with CSS Grid and Flexbox support.

**Props Interface**:

```typescript
interface GridProps {
  columns: number | 'auto' | 'auto-fit' | 'auto-fill';
  gap: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  children: React.ReactNode;
  className?: string;
}
```

**Usage Examples**:

```tsx
// Responsive character grid
<Grid
  columns="auto-fit"
  gap="md"
  responsive={{
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4
  }}
>
  {characters.map(character => (
    <CharacterCard key={character.id} character={character} />
  ))}
</Grid>

// Fixed column layout
<Grid columns={3} gap="lg">
  <UniversePanel />
  <StoryEditor />
  <CharacterPanel />
</Grid>
```

#### Stack Component

**Location**: `packages/ui-core/src/components/Stack/Stack.tsx`

A flexible layout component for vertical and horizontal arrangements.

**Props Interface**:

```typescript
interface StackProps {
  direction: 'row' | 'column';
  align: 'start' | 'center' | 'end' | 'stretch';
  justify: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  gap: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  wrap?: boolean;
  children: React.ReactNode;
  className?: string;
}
```

### Form Components

#### Form Component

**Location**: `packages/ui-core/src/components/Form/Form.tsx`

A comprehensive form component with validation, accessibility, and plugin integration.

**Component Features**:
- **Schema Validation**: Integration with Zod validation schemas
- **Error Handling**: Field-level and form-level error management
- **Accessibility**: ARIA form markup and screen reader support
- **Plugin Integration**: Universe-specific form styling and validation

**Props Interface**:

```typescript
interface FormProps<T> {
  schema: z.ZodSchema<T>;
  defaultValues?: Partial<T>;
  onSubmit: (data: T) => void | Promise<void>;
  loading?: boolean;
  children: React.ReactNode | ((form: UseFormReturn<T>) => React.ReactNode);
  className?: string;
}
```

**Usage Examples**:

```tsx
// Character creation form
<Form
  schema={CharacterSchema}
  defaultValues={{ universe: selectedUniverse }}
  onSubmit={handleCreateCharacter}
  loading={isCreating}
>
  {({ register, formState: { errors } }) => (
    <>
      <Input
        {...register('name')}
        label="Character Name"
        error={errors.name?.message}
        required
      />
      <Input
        {...register('description')}
        label="Description"
        as="textarea"
        error={errors.description?.message}
      />
      <Button type="submit" variant="primary" fullWidth>
        Create Character
      </Button>
    </>
  )}
</Form>
```

### Navigation Components

#### Tabs Component

**Location**: `packages/ui-core/src/components/Tabs/Tabs.tsx`

An accessible tab navigation component with keyboard support and plugin theming.

**Props Interface**:

```typescript
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant: 'default' | 'universe' | 'minimal';
  children: React.ReactNode;
  className?: string;
}

interface TabProps {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
}
```

**Usage Examples**:

```tsx
// Story editing tabs
<Tabs defaultValue="content" variant="universe">
  <TabsList>
    <Tab value="content">Content</Tab>
    <Tab value="characters">Characters</Tab>
    <Tab value="timeline">Timeline</Tab>
    <Tab value="settings">Settings</Tab>
  </TabsList>
  
  <TabContent value="content">
    <StoryEditor story={story} />
  </TabContent>
  
  <TabContent value="characters">
    <CharacterManager universe={story.universe} />
  </TabContent>
</Tabs>
```

### Composite Components (frontend/src/components/)

#### StoryEditor Component

**Location**: `frontend/src/components/story/StoryEditor.tsx`

A rich text editor component for story writing with collaborative features.

**Component Features**:
- **Rich Text Editing**: Advanced text formatting and styling
- **Collaborative Editing**: Real-time collaboration with conflict resolution
- **Auto-save**: Automatic draft saving and recovery
- **Plugin Integration**: Universe-specific writing tools and templates

#### UniverseSelector Component

**Location**: `frontend/src/components/universe/UniverseSelector.tsx`

A comprehensive universe selection and management component.

**Component Features**:
- **Universe Grid**: Visual grid of available universes
- **Search and Filter**: Text search and category filtering
- **Plugin Universes**: Support for plugin-registered universes
- **Creation Workflow**: Integrated universe creation flow

#### CharacterManager Component

**Location**: `frontend/src/components/character/CharacterManager.tsx`

A complete character management interface with relationship mapping.

**Component Features**:
- **Character Grid**: Visual character organization
- **Relationship Map**: Interactive character relationship visualization
- **Attribute Editor**: Dynamic attribute editing based on universe
- **Import/Export**: Character data import and export capabilities

### Input Component

**Location**: `src/components/base/Input/Input.tsx`

A comprehensive input component with form integration and validation support.

**Props**:

- `type`: HTML input type
- `label`: string (optional label)
- `placeholder`: string
- `value`: string
- `onChange`: (e: ChangeEvent<HTMLInputElement>) => void
- `disabled`: boolean
- `error`: string (error message)
- `helperText`: string (help text)
- `required`: boolean
- `className`: string

**Usage**:

```tsx
import { Input } from '@/components/base';

<Input
  label="Username"
  placeholder="Enter username"
  value={username}
  onChange={e => setUsername(e.target.value)}
  required
/>;
```

### Card Component

**Location**: `src/components/base/Card/Card.tsx`

A flexible card component with compound components for structured content.

**Props**:

- `variant`: 'default' | 'elevated' | 'outlined' | 'universe'
- `className`: string
- `children`: ReactNode

**Sub-components**:

- `Card.Header`: Card header section
- `Card.Title`: Card title
- `Card.Content`: Card main content area

**Usage**:

```tsx
import { Card } from '@/components/base';

<Card variant="elevated">
  <Card.Header>
    <Card.Title>Card Title</Card.Title>
  </Card.Header>
  <Card.Content>Card content goes here</Card.Content>
</Card>;
```

### Modal Component

**Location**: `src/components/base/Modal/Modal.tsx`

An accessible modal component with overlay and keyboard navigation support.

**Props**:

- `isOpen`: boolean
- `onClose`: () => void
- `title`: string (optional)
- `size`: 'sm' | 'md' | 'lg' | 'xl'
- `children`: ReactNode
- `className`: string

**Features**:

- Focus trapping
- Escape key handling
- Overlay click to close
- Accessible labels and roles

**Usage**:

```tsx
import { Modal } from '@/components/base';

<Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modal Title" size="md">
  <p>Modal content</p>
</Modal>;
```

## Theming System

### CSS Custom Properties

All components use CSS custom properties for theming:

```css
:root {
  /* Universe theme colors */
  --color-universe-primary: #3b82f6;
  --color-universe-secondary: #6b7280;
  --color-universe-background: #ffffff;
  --color-universe-surface: #f9fafb;
  --color-universe-text: #111827;
  --color-universe-text-secondary: #6b7280;
  --color-universe-border: #e5e7eb;
}
```

### Theme Provider

The `ThemeProvider` manages theme state and provides universe-specific theming:

```tsx
import { ThemeProvider } from '@/components/providers';

<ThemeProvider defaultTheme="default">
  <App />
</ThemeProvider>;
```

### Available Themes

- **default**: Standard light theme
- **dark**: Dark theme with inverted colors
- **lcars**: Star Trek LCARS interface theme
- **imperial**: Star Wars Imperial theme
- **cyberpunk**: Futuristic cyberpunk theme

## Plugin Integration

### Component Registration

Plugins can register custom components or variants:

```tsx
import { usePluginRegistry } from '@/components/providers';

const { registerComponent } = usePluginRegistry();

registerComponent('Button', 'star-trek-plugin', LCARSButton, 'star-trek', { variant: 'lcars' });
```

### HOC Extension

The `withPluginComponent` HOC automatically handles plugin integration:

```tsx
import { withPluginComponent } from '@/components/providers';

const Button = withPluginComponent('Button', BaseButton);
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators
- **Color Contrast**: Meets contrast requirements
- **Semantic HTML**: Uses appropriate HTML elements

## Responsive Design

Components use desktop-first responsive design with Tailwind CSS:

```css
/* Desktop first breakpoints */
xl: {
  max: '1279px';
} /* Large desktop */
lg: {
  max: '1023px';
} /* Desktop */
md: {
  max: '767px';
} /* Tablet */
sm: {
  max: '639px';
} /* Mobile */
```

## File Structure

```
src/components/base/
├── Button/
│   ├── Button.tsx
│   └── index.ts
├── Input/
│   ├── Input.tsx
│   └── index.ts
├── Card/
│   ├── Card.tsx
│   └── index.ts
├── Modal/
│   ├── Modal.tsx
│   └── index.ts
└── index.ts
```

## Development Guidelines

### Adding New Components

1. Create component directory in `src/components/base/`
2. Implement component with TypeScript interfaces
3. Add `withPluginComponent` HOC wrapper
4. Export from component `index.ts`
5. Add to main `index.ts`
6. Update documentation

### Plugin Component Development

1. Implement component following base interface
2. Register with `PluginRegistryProvider`
3. Provide universe-specific styling
4. Test with theme switching

## Next Steps (Phase 1.5)

The following enhancements are planned for Phase 1.5:

- **Storybook Setup**: Interactive component documentation
- **Animation Framework**: Smooth transitions and loading states
- **Advanced Components**: Data tables, forms, navigation
- **Component Testing**: Comprehensive test coverage

## Related Documentation

- [Frontend Architecture Decisions](../FRONTEND_ARCHITECTURE_DECISIONS.md)
- [Frontend Design System Plan](../FRONTEND_DESIGN_SYSTEM_PLAN.md)
- [Plugin System Documentation](../../packages/plugin-sdk/README.md)
