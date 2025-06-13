// Test complete TOKENS object from scratch
export const TEST_TOKENS = {
  // Repositories
  USER_REPOSITORY: Symbol('UserRepository'),
  AUTH_TOKEN_REPOSITORY: Symbol('AuthTokenRepository'),
  AUTH_SESSION_REPOSITORY: Symbol('AuthSessionRepository'),
  ADMIN_SETTINGS_REPOSITORY: Symbol('AdminSettingsRepository'),

  // Services
  PASSWORD_SERVICE: Symbol('PasswordService'),
  TOKEN_SERVICE: Symbol('TokenService'),
  EMAIL_SERVICE: Symbol('EmailService'),
  SECURITY_SERVICE: Symbol('SecurityService'),

  // Use Cases
  USER_USE_CASE: Symbol('UserUseCase'),
  AUTH_USE_CASE: Symbol('AuthUseCase'),
  ADMIN_USE_CASE: Symbol('AdminUseCase'),

  // Controllers
  AUTH_CONTROLLER: Symbol('AuthController'),
  USER_CONTROLLER: Symbol('UserController'),
  ADMIN_CONTROLLER: Symbol('AdminController'),

  // Middleware
  AUTH_MIDDLEWARE: Symbol('AuthMiddleware'),
  VALIDATION_MIDDLEWARE: Symbol('ValidationMiddleware'),

  // External Dependencies
  MONGO_CLIENT: Symbol('MongoClient'),
  DATABASE_NAME: Symbol('DatabaseName'),
  DATABASE: Symbol('Database'),
} as const;

console.log('TEST_TOKENS created with keys:', Object.keys(TEST_TOKENS));
console.log('Has ADMIN_CONTROLLER:', 'ADMIN_CONTROLLER' in TEST_TOKENS);
console.log('Has ADMIN_USE_CASE:', 'ADMIN_USE_CASE' in TEST_TOKENS);
console.log('Has ADMIN_SETTINGS_REPOSITORY:', 'ADMIN_SETTINGS_REPOSITORY' in TEST_TOKENS);
