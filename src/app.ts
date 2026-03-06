import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import 'dotenv/config';

import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import searchRoutes from './routes/search';
import { errorHandler } from './middleware/errorHandler';
import { RATE_LIMIT } from './config/constants';
import { swaggerSpec } from './config/swagger';

const app = express();

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// HTTP request logging (skipped in test env to keep output clean)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

/** Strict limit for authentication endpoints to mitigate brute-force attacks */
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

/** General API limit for all other routes */
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/search', searchRoutes);

/** Health-check endpoint */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/** Swagger UI — interactive API docs */
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/** Raw OpenAPI JSON (useful for importing into Postman) */
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// ─── Centralised error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

export default app;
