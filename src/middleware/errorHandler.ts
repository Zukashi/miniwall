import { Request, Response, NextFunction } from 'express';
import { HTTP } from '../config/constants';

// Named error classes so route handlers can throw semantically meaningful errors
export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(HTTP.FORBIDDEN, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(HTTP.NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(HTTP.CONFLICT, message);
    this.name = 'ConflictError';
  }
}

// Central error handler — must be the last app.use() in app.ts
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Mongoose duplicate key (e.g. duplicate email/username)
  if ((err as NodeJS.ErrnoException).name === 'MongoServerError' &&
      (err as { code?: number }).code === 11000) {
    res.status(HTTP.CONFLICT).json({ success: false, message: 'Duplicate value — resource already exists' });
    return;
  }

  // Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    res.status(HTTP.BAD_REQUEST).json({ success: false, message: 'Invalid resource ID' });
    return;
  }

  const isDev = process.env.NODE_ENV !== 'production';
  res.status(HTTP.INTERNAL).json({
    success: false,
    message: 'Internal server error',
    ...(isDev && { detail: err.message }),
  });
}
