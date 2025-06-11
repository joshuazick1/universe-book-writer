/**
 * Admin routes for administrative functionality
 */

import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';

export function createAdminRoutes(
  adminController: AdminController,
  authMiddleware: AuthMiddleware
): Router {
  const router = Router();

  // All admin routes require authentication and admin role
  router.use(authMiddleware.authenticate);
  router.use(authMiddleware.requireAdmin);

  // User management routes
  router.get('/users', adminController.getAllUsers.bind(adminController));
  router.put('/users/:id/role', adminController.updateUserRole.bind(adminController));
  router.put('/users/:id/status', adminController.updateUserStatus.bind(adminController));
  router.post('/users/:id/verify-email', adminController.verifyUserEmail.bind(adminController));
  router.post('/users', adminController.createUser.bind(adminController));

  // Settings routes
  router.get('/settings', adminController.getAdminSettings.bind(adminController));
  router.put('/settings', adminController.updateAdminSettings.bind(adminController));

  // Security routes
  router.get('/security/logs', adminController.getSecurityLogs.bind(adminController));

  return router;
}
