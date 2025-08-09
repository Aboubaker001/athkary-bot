import dotenv from 'dotenv'
import joi from 'joi'

// Load environment variables
dotenv.config()

// Environment validation schema
const envSchema = joi.object({
  // Bot Configuration
  BOT_TOKEN: joi.string().required().description('Telegram Bot Token'),
  BOT_USERNAME: joi.string().required().description('Bot Username'),
  ADMIN_ID: joi.number().integer().positive().required().description('Admin Telegram ID'),

  // API Configuration
  DORAR_API_URL: joi.string().uri().default('https://dorar.net/dorar_api.json'),
  API_TIMEOUT: joi.number().integer().positive().default(10000),
  CACHE_TTL: joi.number().integer().positive().default(3600),

  // Database Configuration
  DATABASE_URL: joi.string().default('file:./data/hadith_bot.db'),
  DATABASE_POOL_SIZE: joi.number().integer().positive().default(10),

  // Application Configuration
  NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
  LOG_LEVEL: joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  PORT: joi.number().integer().positive().default(3000),

  // External Services
  REDIS_URL: joi.string().uri().optional(),
  WEBHOOK_URL: joi.string().uri().optional(),

  // Security & Rate Limiting
  JWT_SECRET: joi.string().min(32).optional(),
  RATE_LIMIT_WINDOW: joi.number().integer().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: joi.number().integer().positive().default(30),

  // Feature Toggles
  ENABLE_ANALYTICS: joi.boolean().default(true),
  ENABLE_REMINDERS: joi.boolean().default(true),
  ENABLE_GROUPS: joi.boolean().default(true),
  ENABLE_ADMIN_PANEL: joi.boolean().default(true),

  // Localization
  DEFAULT_TIMEZONE: joi.string().default('UTC'),
  SUPPORTED_LANGUAGES: joi.string().default('en,ar'),

  // Performance & Caching
  MEMORY_CACHE_TTL: joi.number().integer().positive().default(300),
  MEMORY_CACHE_MAX: joi.number().integer().positive().default(1000),
  DATABASE_CACHE_TTL: joi.number().integer().positive().default(3600)
}).unknown()

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}

// Configuration object
const config = {
  // Environment
  env: envVars.NODE_ENV,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',

  // Server
  port: envVars.PORT,

  // Bot Configuration
  bot: {
    token: envVars.BOT_TOKEN,
    username: envVars.BOT_USERNAME,
    adminId: envVars.ADMIN_ID
  },

  // API Configuration
  api: {
    dorarUrl: envVars.DORAR_API_URL,
    timeout: envVars.API_TIMEOUT,
    cacheTtl: envVars.CACHE_TTL
  },

  // Database Configuration
  database: {
    url: envVars.DATABASE_URL,
    poolSize: envVars.DATABASE_POOL_SIZE
  },

  // External Services
  external: {
    redisUrl: envVars.REDIS_URL,
    webhookUrl: envVars.WEBHOOK_URL
  },

  // Security
  security: {
    jwtSecret: envVars.JWT_SECRET || 'fallback-secret-for-development-only',
    rateLimitWindow: envVars.RATE_LIMIT_WINDOW,
    rateLimitMaxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
  },

  // Feature Flags
  features: {
    analytics: envVars.ENABLE_ANALYTICS,
    reminders: envVars.ENABLE_REMINDERS,
    groups: envVars.ENABLE_GROUPS,
    adminPanel: envVars.ENABLE_ADMIN_PANEL
  },

  // Localization
  localization: {
    defaultTimezone: envVars.DEFAULT_TIMEZONE,
    supportedLanguages: envVars.SUPPORTED_LANGUAGES.split(',').map(lang => lang.trim())
  },

  // Performance & Caching
  cache: {
    memory: {
      ttl: envVars.MEMORY_CACHE_TTL,
      max: envVars.MEMORY_CACHE_MAX
    },
    database: {
      ttl: envVars.DATABASE_CACHE_TTL
    }
  },

  // Logging
  logging: {
    level: envVars.LOG_LEVEL,
    file: {
      error: 'logs/error.log',
      combined: 'logs/combined.log'
    }
  },

  // Rate Limits by Feature
  rateLimits: {
    search: { requests: 30, window: 60000 }, // 30 searches per minute
    random: { requests: 10, window: 60000 }, // 10 random hadiths per minute
    favorite: { requests: 50, window: 60000 }, // 50 favorites operations per minute
    reminder: { requests: 20, window: 300000 }, // 20 reminder operations per 5 minutes
    admin: { requests: 100, window: 60000 } // 100 admin operations per minute
  },

  // Pagination
  pagination: {
    defaultLimit: 10,
    maxLimit: 50
  },

  // Emoji Configuration
  emojis: {
    // Core Islamic
    mosque: '🕌',
    book: '📖',
    prayer: '🤲',
    star: '⭐',
    crescent: '🌙',
    
    // Actions
    search: '🔍',
    heart: '❤️',
    heartFilled: '💖',
    share: '📤',
    save: '💾',
    bookmark: '🔖',
    
    // Navigation
    next: '▶️',
    prev: '◀️',
    home: '🏠',
    back: '🔙',
    up: '⬆️',
    down: '⬇️',
    
    // Status
    success: '✅',
    warning: '⚠️',
    error: '❌',
    loading: '⏳',
    check: '✔️',
    cross: '❌',
    
    // Features
    random: '🎲',
    favorites: '⭐',
    reminder: '⏰',
    settings: '⚙️',
    stats: '📊',
    trophy: '🏆',
    
    // Time
    clock: '🕐',
    calendar: '📅',
    
    // User
    user: '👤',
    group: '👥',
    admin: '👑'
  },

  // Message Limits
  messages: {
    maxLength: 4096, // Telegram message limit
    maxCaptionLength: 1024,
    previewLength: 200
  }
}

export default config