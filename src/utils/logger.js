import winston from 'winston'
import config from '../config/index.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs')
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true })
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level}]: ${message} ${metaStr}`
  })
)

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Create transports array
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: config.isDevelopment ? 'debug' : config.logging.level,
    format: consoleFormat,
    handleExceptions: true,
    handleRejections: true
  }),

  // File transport for errors
  new winston.transports.File({
    filename: config.logging.file.error,
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    handleExceptions: true,
    handleRejections: true
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: config.logging.file.combined,
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
)

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: fileFormat,
  defaultMeta: {
    service: 'smart-hadith-bot',
    version: process.env.npm_package_version || '1.0.0',
    pid: process.pid
  },
  transports,
  exitOnError: false
})

// Logger utility functions
const loggerUtils = {
  // Enhanced logging methods with context
  logWithContext: (level, message, context = {}) => {
    logger.log(level, message, {
      ...context,
      timestamp: new Date().toISOString()
    })
  },

  // Bot-specific logging methods
  botAction: (userId, action, details = {}) => {
    logger.info('Bot Action', {
      userId,
      action,
      details,
      type: 'bot_action'
    })
  },

  apiCall: (method, url, responseTime, statusCode, error = null) => {
    const level = error ? 'error' : 'info'
    logger.log(level, 'API Call', {
      method,
      url,
      responseTime,
      statusCode,
      error: error ? error.message : null,
      type: 'api_call'
    })
  },

  userActivity: (userId, activity, metadata = {}) => {
    logger.info('User Activity', {
      userId,
      activity,
      metadata,
      type: 'user_activity'
    })
  },

  performance: (operation, duration, details = {}) => {
    const level = duration > 5000 ? 'warn' : 'info' // Warn if operation takes > 5s
    logger.log(level, 'Performance Metric', {
      operation,
      duration,
      details,
      type: 'performance'
    })
  },

  security: (event, userId, details = {}) => {
    logger.warn('Security Event', {
      event,
      userId,
      details,
      type: 'security'
    })
  },

  database: (operation, query, duration, error = null) => {
    const level = error ? 'error' : 'debug'
    logger.log(level, 'Database Operation', {
      operation,
      query: config.isDevelopment ? query : '[REDACTED]',
      duration,
      error: error ? error.message : null,
      type: 'database'
    })
  },

  cache: (operation, key, hit = null, duration = null) => {
    logger.debug('Cache Operation', {
      operation,
      key,
      hit,
      duration,
      type: 'cache'
    })
  },

  // Error logging with stack trace
  logError: (error, context = {}) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      type: 'application_error'
    })
  },

  // Telegram-specific logging
  telegramUpdate: (updateType, userId, messageId = null) => {
    logger.debug('Telegram Update', {
      updateType,
      userId,
      messageId,
      type: 'telegram_update'
    })
  },

  telegramError: (error, update = null) => {
    logger.error('Telegram Error', {
      message: error.message,
      stack: error.stack,
      update: update ? JSON.stringify(update) : null,
      type: 'telegram_error'
    })
  },

  // Analytics logging
  analytics: (event, userId, properties = {}) => {
    logger.info('Analytics Event', {
      event,
      userId,
      properties,
      type: 'analytics'
    })
  }
}

// Add utility methods to logger instance
Object.assign(logger, loggerUtils)

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
    type: 'uncaught_exception'
  })
  // Don't exit in production to keep the bot running
  if (!config.isProduction) {
    process.exit(1)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : null,
    promise: promise.toString(),
    type: 'unhandled_rejection'
  })
})

// Log startup information
logger.info('Logger initialized', {
  level: config.logging.level,
  environment: config.env,
  pid: process.pid,
  nodeVersion: process.version
})

export default logger