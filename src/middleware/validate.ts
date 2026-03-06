import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HTTP } from '../config/constants';

/**
 * Runs the accumulated express-validator checks and, if any fail,
 * responds with 422 Unprocessable Entity and a structured error list.
 * Pass this as the final middleware in a validation chain.
 *
 * @param req  - Express request containing validation results
 * @param res  - Express response
 * @param next - Calls next middleware if validation passes
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP.UNPROCESSABLE).json({ success: false, errors: errors.array() });
    return;
  }
  next();
}
