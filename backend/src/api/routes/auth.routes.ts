import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthMiddleware } from '../middleware/auth.middleware.js';
import { ValidationMiddleware } from '../middleware/validation.middleware.js';

export function createAuthRoutes(
  authController: AuthController,
  authMiddleware: AuthMiddleware,
  validationMiddleware: ValidationMiddleware
): Router {
  const router = Router();

  // Public routes
  router.post(
    '/register',
    validationMiddleware.validateRegistration,
    authController.register.bind(authController)
  );

  router.post(
    '/login',
    validationMiddleware.validateLogin,
    authController.login.bind(authController)
  );

  router.post(
    '/forgot-password',
    validationMiddleware.validateForgotPassword,
    authController.forgotPassword.bind(authController)
  );

  router.post(
    '/reset-password',
    validationMiddleware.validateResetPassword,
    authController.resetPassword.bind(authController)
  );

  router.post(
    '/verify-email',
    validationMiddleware.validateEmailVerification,
    authController.verifyEmail.bind(authController)
  );

  router.post(
    '/resend-verification',
    validationMiddleware.validateResendVerification,
    authController.resendVerification.bind(authController)
  );

  router.post('/refresh-token', authController.refreshToken.bind(authController));

  // Protected routes
  router.post('/logout', authMiddleware.authenticate, authController.logout.bind(authController));

  router.get(
    '/profile',
    authMiddleware.authenticate,
    authController.getProfile.bind(authController)
  );

  return router;
}
