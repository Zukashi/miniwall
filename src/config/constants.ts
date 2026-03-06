/** HTTP status codes — avoids magic numbers throughout the codebase */
export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
} as const;

/** Validation length constraints */
export const LIMITS = {
  USERNAME_MIN: 3,
  USERNAME_MAX: 30,
  PASSWORD_MIN: 8,
  POST_TITLE_MIN: 3,
  POST_TITLE_MAX: 100,
  POST_DESC_MIN: 10,
  POST_DESC_MAX: 1000,
  COMMENT_MIN: 1,
  COMMENT_MAX: 500,
} as const;

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
} as const;

/** bcrypt salt rounds */
export const BCRYPT_ROUNDS = 10;

/** Rate-limit windows (milliseconds) */
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_MAX: 10,
  API_MAX: 100,
} as const;
