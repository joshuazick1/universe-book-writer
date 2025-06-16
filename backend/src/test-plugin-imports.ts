/* eslint-disable @typescript-eslint/no-unused-vars */
// Test plugin system imports
import 'dotenv/config';

console.log('Testing plugin system imports...');

try {
  console.log('Testing PluginSystemFactory import...');
  const { PluginSystemFactory: _PluginSystemFactory } = await import(
    './plugins/manager/plugin-system.factory.js'
  );
  console.log('✅ PluginSystemFactory imported successfully');
} catch (error) {
  console.error('❌ PluginSystemFactory import failed:', error);
}

try {
  console.log('Testing route imports...');
  const { createPluginRoutes: _createPluginRoutes } = await import('./api/routes/plugin.routes.js');
  const { createAuthRoutes: _createAuthRoutes } = await import('./api/routes/auth.routes.js');
  const { createUserRoutes: _createUserRoutes } = await import('./api/routes/user.routes.js');
  const { createAdminRoutes: _createAdminRoutes } = await import('./api/routes/admin.routes.js');
  console.log('✅ All route imports successful');
} catch (error) {
  console.error('❌ Route import failed:', error);
}

console.log('✅ Plugin system imports tested');
