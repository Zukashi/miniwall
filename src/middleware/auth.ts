import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { HTTP } from '../config/constants';

interface JwtPayload {
  id: string;
  username: string;
}

// Verifies the Bearer JWT and attaches req.user; returns 401 if missing or invalid
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = { id: payload.id, username: payload.username };
    next();
  } catch {
    res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'Invalid or expired token' });
  }
}
