import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user payload attached by the JWT middleware */
      user: {
        id: string;
        username: string;
      };
    }
  }
}
