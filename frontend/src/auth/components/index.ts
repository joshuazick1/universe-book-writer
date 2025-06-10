/**
 * Authentication components barrel file
 * Exports all authentication-related components
 */

export { LoginForm } from './LoginForm';
export { RegisterForm } from './RegisterForm';
export { UserMenu } from './UserMenu';
export { ProtectedRoute } from './ProtectedRoute';

// Re-export default exports
export { default as ProtectedRouteDefault } from './ProtectedRoute';
