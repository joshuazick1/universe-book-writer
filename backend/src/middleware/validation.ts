import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

/**
 * Express middleware for validating request data against a Zod schema
 */
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Attach validated data to request
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Express error handler for validation errors
 */
export const validationErrorHandler = (
  error: z.ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: error.errors,
    });
    return;
  }
  next(error);
};
