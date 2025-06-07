import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
/**
 * Express middleware for validating request data against a Zod schema
 */
export declare const validateRequest: (
  schema: z.ZodSchema
) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Express error handler for validation errors
 */
export declare const validationErrorHandler: (
  error: z.ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void;
//# sourceMappingURL=validation.d.ts.map
