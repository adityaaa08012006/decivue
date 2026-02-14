/**
 * Main Server Entry Point
 * Initializes the Express server, middleware, and routes
 * Initializes the Express server, middleware, and routes
 * (Restart trigger 2)
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initializeDatabase } from '@data/database';
import { registerReEvaluationHandlers } from '@events/handlers/re-evaluation-handler';
import { logger } from '@utils/logger';
import { AppError } from '@utils/errors';
import { authenticate } from './middleware/auth';
import authRoutes from '@api/routes/auth';
import decisionRoutes from '@api/routes/decisions';
import assumptionRoutes from '@api/routes/assumptions';
import dependencyRoutes from '@api/routes/dependencies';
import constraintRoutes from '@api/routes/constraints';
import constraintViolationsRoutes from '@api/routes/constraint-violations';
import assumptionConflictsRoutes from '@api/routes/assumption-conflicts';
import profileRoutes from '@api/routes/profile';
import timelineRoutes from '@api/routes/timeline';
import notificationRoutes from '@api/routes/notifications';
import timeSimulationRoutes from '@api/routes/time-simulation';
import parameterTemplatesRoutes from '@api/routes/parameter-templates';
import usersRoutes from '@api/routes/users';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS support
app.use(express.json()); // JSON body parsing
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((_req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${_req.method} ${_req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'decivue-backend'
  });
});

// API Routes
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'DECIVUE API - Deterministic Decision Monitoring System',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      decisions: '/api/decisions',
      assumptions: '/api/assumptions',
      constraints: '/api/constraints'
    }
  });
});

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected routes (authentication required)
app.use('/api/decisions', authenticate, decisionRoutes);
app.use('/api/assumptions', authenticate, assumptionRoutes);
app.use('/api/dependencies', authenticate, dependencyRoutes);
app.use('/api/constraints', authenticate, constraintRoutes);
app.use('/api/constraint-violations', authenticate, constraintViolationsRoutes);
app.use('/api/assumption-conflicts', authenticate, assumptionConflictsRoutes);
app.use('/api/profile', authenticate, profileRoutes);
app.use('/api/timeline', authenticate, timelineRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/simulate-time', authenticate, timeSimulationRoutes);
app.use('/api/parameter-templates', authenticate, parameterTemplatesRoutes);
app.use('/api/users', authenticate, usersRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${_req.method} ${_req.path} not found`
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message
    });
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

/**
 * Start the server
 */
async function startServer() {
  try {
    // Initialize database connection
    initializeDatabase();
    logger.info('Database initialized');

    // Register event handlers
    registerReEvaluationHandlers();
    logger.info('Event handlers registered');

    // Start listening
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', {
    reason: reason,
    message: reason?.message || 'Unknown error',
    stack: reason?.stack || 'No stack trace',
    details: reason?.details || 'No details'
  });

  // In development, don't exit - just log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    logger.warn('⚠️ Server continuing despite unhandled rejection (development mode)');
  }
});

// Start the server
startServer();
