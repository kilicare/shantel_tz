export default () => ({
  app: {
    port: parseInt(process.env.API_PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
    apiVersion: 'v1',
    corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  database: {
    url: process.env.DATABASE_URL,
    logging: process.env.NODE_ENV === 'development',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '24h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  security: {
    bcryptRounds: 10,
    enableRateLimiting: true,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'combined',
  },

  features: {
    allowNegativeStock: process.env.ALLOW_NEGATIVE_STOCK === 'true',
    enableAuditLogging: true,
    enableApprovals: true,
  },
});