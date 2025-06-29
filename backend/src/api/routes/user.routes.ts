import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { ValidationMiddleware } from '../middleware/validation.middleware.js';

export function createUserRoutes(
  userController: UserController,
  authMiddleware: AuthMiddleware,
  validationMiddleware: ValidationMiddleware
): Router {
  const router = Router();

  // All user routes require authentication
  router.use(authMiddleware.authenticate);

  // User profile management
  router.put(
    '/profile',
    validationMiddleware.validateProfileUpdate,
    userController.updateProfile.bind(userController)
  );

  router.put(
    '/change-password',
    validationMiddleware.validatePasswordChange,
    userController.changePassword.bind(userController)
  );

  router.delete(
    '/account',
    validationMiddleware.validateAccountDeletion,
    userController.deleteAccount.bind(userController)
  );

  // User lookup (self or admin/moderator for others)
  router.get('/:id', userController.getUserById.bind(userController));

  // Admin/Moderator routes
  router.get(
    '/',
    authMiddleware.requireModeratorOrAdmin,
    userController.listUsers.bind(userController)
  );

  // Admin only routes
  router.put(
    '/:id/roles',
    authMiddleware.requireAdmin,
    validationMiddleware.validateRoleUpdate,
    userController.updateUserRole.bind(userController)
  );

  router.post(
    '/:id/suspend',
    authMiddleware.requireModeratorOrAdmin,
    validationMiddleware.validateUserSuspension,
    userController.suspendUser.bind(userController)
  );

  // User search for collaboration
  router.get(
    '/search',
    userController.searchUsersForCollaboration.bind(userController)
  );

  return router;
}
