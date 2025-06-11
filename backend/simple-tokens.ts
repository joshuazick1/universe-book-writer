// Test minimal TOKENS
export const SIMPLE_TOKENS = {
  // Repositories
  USER_REPOSITORY: Symbol('UserRepository'),
  AUTH_TOKEN_REPOSITORY: Symbol('AuthTokenRepository'),
  AUTH_SESSION_REPOSITORY: Symbol('AuthSessionRepository'),
  ADMIN_SETTINGS_REPOSITORY: Symbol('AdminSettingsRepository'),
} as const;
