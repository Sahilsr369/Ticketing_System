require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');

const logger         = require('./utils/logger');
const requestLogger  = require('./middleware/requestLogger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes       = require('./routes/auth.routes');
const usersRoutes      = require('./routes/users.routes');
const ticketsRoutes    = require('./routes/tickets.routes');
const reportsRoutes    = require('./routes/reports.routes');
const categoriesRoutes = require('./routes/categories.routes');
const emailRoutes      = require('./routes/email.routes');
const importRoutes     = require('./routes/import.routes');
const gdprRoutes       = require('./routes/gdpr.routes');
const auditRoutes      = require('./routes/audit.routes');

const app  = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

const EXPLICIT_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^https:\/\/[a-z0-9-]+-\d+\.app\.github\.dev$/.test(origin)) return callback(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    if (EXPLICIT_ORIGINS.includes(origin)) return callback(null, true);
    if (process.env.ALLOWED_ORIGINS) {
      const allowed = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
      if (allowed.includes(origin)) return callback(null, true);
    }
    logger.warn(`CORS rejected: ${origin}`);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === 'production' ? 300 : 500,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests' } },
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  message: { success: false, error: { message: 'Too many login attempts' } },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.json({
    success: true, service: 'IT Ticketing API', version: '1.0.0',
    environment: NODE_ENV, timestamp: new Date().toISOString(),
    frontendUrl: process.env.FRONTEND_URL || '(not set)',
  });
});

app.use('/api/auth',               authLimiter, authRoutes);
app.use('/api/users',              usersRoutes);
app.use('/api/tickets',            ticketsRoutes);
app.use('/api/tickets/:id/emails', emailRoutes);
app.use('/api/reports',            reportsRoutes);
app.use('/api/categories',         categoriesRoutes);
app.use('/api/import',             importRoutes);
app.use('/api/gdpr',               gdprRoutes);
app.use('/api/audit',              auditRoutes);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`IT Ticketing API started on port ${PORT} [${NODE_ENV}]`);
  logger.info(`Health: http://localhost:${PORT}/health`);
  logger.info(`CORS frontend: ${process.env.FRONTEND_URL || 'any *.app.github.dev'}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} in use. Run: kill $(lsof -ti:${PORT})`);
    process.exit(1);
  }
  throw err;
});

const shutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => { logger.info('HTTP server closed'); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
