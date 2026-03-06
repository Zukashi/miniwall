import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { validate } from '../middleware/validate';
import { HTTP, LIMITS } from '../config/constants';

const router = Router();

const registerRules = [
  body('username').trim()
    .isLength({ min: LIMITS.USERNAME_MIN, max: LIMITS.USERNAME_MAX })
    .withMessage(`Username must be ${LIMITS.USERNAME_MIN}–${LIMITS.USERNAME_MAX} characters`)
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, digits, and underscores'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: LIMITS.PASSWORD_MIN })
    .withMessage(`Password must be at least ${LIMITS.PASSWORD_MIN} characters`)
    .matches(/\d/)
    .withMessage('Password must contain at least one digit'),
];

const loginRules = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// POST /api/auth/register — create account and return signed JWT
router.post('/register', registerRules, validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, email, password } = req.body as { username: string; email: string; password: string };
      const user = await User.create({ username, email, password });

      const token = jwt.sign(
        { id: user._id.toString(), username: user.username },
        process.env.JWT_SECRET as string,
        { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as unknown as jwt.SignOptions['expiresIn'] }
      );

      res.status(HTTP.CREATED).json({ success: true, token, user: { id: user._id, username: user.username, email: user.email } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login — verify credentials and return signed JWT
router.post('/login', loginRules, validate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as { email: string; password: string };

      // select: false on password field requires explicit opt-in
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        res.status(HTTP.UNAUTHORIZED).json({ success: false, message: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign(
        { id: user._id.toString(), username: user.username },
        process.env.JWT_SECRET as string,
        { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as unknown as jwt.SignOptions['expiresIn'] }
      );

      res.status(HTTP.OK).json({ success: true, token, user: { id: user._id, username: user.username, email: user.email } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
