/**
 * Authentication components barrel file
 * Exports all authentication-related components
 */

export * from './LoginForm';
export * from './RegisterForm';
export * from './ProtectedRoute';
export * from './PublicRoute';
export * from './UserMenu';
export * from './ForgotPasswordForm';

// Re-export default exports
export { default as ProtectedRouteDefault } from './ProtectedRoute';
