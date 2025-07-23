import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationChain } from 'express-validator';
import { UserRole } from '../../core/entities/user.entity.js';

export class ValidationMiddleware {
  /**
   * Handle validation errors
   */
  private handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
      return;
    }
    next();
  };

  /**
   * Validate user registration
   */
  validateRegistration = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email address is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:,.<>?])/)
      .withMessage(
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      ),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name is required and must be less than 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name is required and must be less than 50 characters'),
    this.handleValidationErrors,
  ];

  /**
   * Validate user login
   */
  validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email address is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('rememberMe').optional().isBoolean().withMessage('Remember me must be a boolean'),
    this.handleValidationErrors,
  ];

  /**
   * Validate forgot password request
   */
  validateForgotPassword = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email address is required'),
    this.handleValidationErrors,
  ];

  /**
   * Validate password reset
   */
  validateResetPassword = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:,.<>?])/)
      .withMessage(
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      ),
    this.handleValidationErrors,
  ];

  /**
   * Validate email verification
   */
  validateEmailVerification = [
    body('token').notEmpty().withMessage('Verification token is required'),
    this.handleValidationErrors,
  ];

  /**
   * Validate resend verification request
   */
  validateResendVerification = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email address is required'),
    this.handleValidationErrors,
  ];

  /**
   * Validate profile update
   */
  validateProfileUpdate = [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be less than 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be less than 50 characters'),
    body('profile.bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must be less than 500 characters'),
    body('profile.website').optional().isURL().withMessage('Website must be a valid URL'),
    body('profile.location')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Location must be less than 100 characters'),
    body('profile.timezone')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Timezone must be less than 50 characters'),
    this.handleValidationErrors,
  ];

  /**
   * Validate password change
   */
  validatePasswordChange = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{}|;:,.<>?])/)
      .withMessage(
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
      ),
    this.handleValidationErrors,
  ];

  /**
   * Validate account deletion
   */
  validateAccountDeletion = [
    body('password').notEmpty().withMessage('Password is required for account deletion'),
    body('confirmDeletion')
      .equals('DELETE_MY_ACCOUNT')
      .withMessage('Confirmation text must be exactly "DELETE_MY_ACCOUNT"'),
    this.handleValidationErrors,
  ];

  /**
   * Validate role update (admin only)
   */
  validateRoleUpdate = [
    body('roles')
      .isArray({ min: 1 })
      .withMessage('Roles must be a non-empty array')
      .custom((roles: string[]) => {
        const validRoles = Object.values(UserRole);
        const invalidRoles = roles.filter(role => !validRoles.includes(role as UserRole));
        if (invalidRoles.length > 0) {
          throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
        }
        return true;
      }),
    this.handleValidationErrors,
  ];

  /**
   * Validate user suspension
   */
  validateUserSuspension = [
    body('reason')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Suspension reason is required and must be less than 500 characters'),
    this.handleValidationErrors,
  ];

  /**
   * Validate pagination parameters
   */
  validatePagination = [
    body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    this.handleValidationErrors,
  ];

  /**
   * Validate sort parameters
   */
  validateSort = [
    body('sortBy').optional().trim().isLength({ min: 1 }).withMessage('Sort field cannot be empty'),
    body('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort order must be "asc" or "desc"'),
    this.handleValidationErrors,
  ];

  /**
   * Sanitize and validate search parameters
   */
  validateSearch = [
    body('search')
      .optional()
      .trim()
      .escape()
      .isLength({ max: 100 })
      .withMessage('Search query must be less than 100 characters'),
    this.handleValidationErrors,
  ];

  /**
   * Custom validation for ObjectId format
   */
  validateObjectId = (field: string): ValidationChain => {
    return body(field)
      .matches(/^[0-9a-fA-F]{24}$/)
      .withMessage(`${field} must be a valid ObjectId`);
  };

  /**
   * Custom validation for arrays
   */
  validateArray = (field: string, minLength: number = 0, maxLength?: number): ValidationChain => {
    let validation = body(field)
      .isArray({ min: minLength })
      .withMessage(`${field} must be an array with at least ${minLength} items`);

    if (maxLength) {
      validation = validation
        .isArray({ max: maxLength })
        .withMessage(`${field} must not have more than ${maxLength} items`);
    }

    return validation;
  };

  /**
   * Validate file upload
   */
  validateFileUpload = [
    body('file').custom((value, { req }) => {
      if (!req.file) {
        throw new Error('File is required');
      }

      // Check file size (10MB max)
      if (req.file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error('File must be a valid image (JPEG, PNG, GIF, or WebP)');
      }

      return true;
    }),
    this.handleValidationErrors,
  ];
}
