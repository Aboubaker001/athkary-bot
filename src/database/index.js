import { PrismaClient } from '@prisma/client'
import config from '../config/index.js'
import logger from '../utils/logger.js'

// Enhanced Prisma client with logging and error handling
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query'
    },
    {
      emit: 'event',
      level: 'error'
    },
    {
      emit: 'event',
      level: 'info'
    },
    {
      emit: 'event',
      level: 'warn'
    }
  ],
  errorFormat: 'colorless'
})

// Log database events
prisma.$on('query', (e) => {
  if (config.isDevelopment) {
    logger.database('query', e.query, e.duration)
  }
})

prisma.$on('error', (e) => {
  logger.database('error', null, null, new Error(e.message))
})

prisma.$on('info', (e) => {
  logger.info('Database Info', { message: e.message, type: 'database_info' })
})

prisma.$on('warn', (e) => {
  logger.warn('Database Warning', { message: e.message, type: 'database_warning' })
})

// Database utility functions
const db = {
  // Core Prisma client
  prisma,

  // Connection management
  connect: async () => {
    try {
      await prisma.$connect()
      logger.info('Database connected successfully')
      return true
    } catch (error) {
      logger.logError(error, { operation: 'database_connect' })
      throw error
    }
  },

  disconnect: async () => {
    try {
      await prisma.$disconnect()
      logger.info('Database disconnected successfully')
      return true
    } catch (error) {
      logger.logError(error, { operation: 'database_disconnect' })
      throw error
    }
  },

  // Health check
  ping: async () => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      logger.logError(error, { operation: 'database_ping' })
      return false
    }
  },

  // Transaction wrapper with logging
  transaction: async (operations, options = {}) => {
    const startTime = Date.now()
    try {
      const result = await prisma.$transaction(operations, options)
      const duration = Date.now() - startTime
      logger.performance('database_transaction', duration, { 
        operationsCount: operations.length 
      })
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.logError(error, { 
        operation: 'database_transaction', 
        duration,
        operationsCount: operations.length 
      })
      throw error
    }
  },

  // Enhanced query methods with error handling and logging
  executeRaw: async (query, ...params) => {
    const startTime = Date.now()
    try {
      const result = await prisma.$executeRaw(query, ...params)
      const duration = Date.now() - startTime
      logger.database('executeRaw', query.toString(), duration)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.database('executeRaw', query.toString(), duration, error)
      throw error
    }
  },

  queryRaw: async (query, ...params) => {
    const startTime = Date.now()
    try {
      const result = await prisma.$queryRaw(query, ...params)
      const duration = Date.now() - startTime
      logger.database('queryRaw', query.toString(), duration)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      logger.database('queryRaw', query.toString(), duration, error)
      throw error
    }
  },

  // Cache management
  cache: {
    set: async (key, data, expiresAt) => {
      try {
        return await prisma.cache.upsert({
          where: { id: key },
          update: { data: JSON.stringify(data), expiresAt },
          create: { id: key, data: JSON.stringify(data), expiresAt }
        })
      } catch (error) {
        logger.logError(error, { operation: 'cache_set', key })
        return null
      }
    },

    get: async (key) => {
      try {
        const cached = await prisma.cache.findUnique({
          where: { id: key }
        })
        
        if (!cached) {
          logger.cache('miss', key)
          return null
        }

        // Check if expired
        if (cached.expiresAt < new Date()) {
          await prisma.cache.delete({ where: { id: key } })
          logger.cache('expired', key)
          return null
        }

        logger.cache('hit', key)
        return JSON.parse(cached.data)
      } catch (error) {
        logger.logError(error, { operation: 'cache_get', key })
        return null
      }
    },

    delete: async (key) => {
      try {
        await prisma.cache.delete({ where: { id: key } })
        logger.cache('delete', key)
        return true
      } catch (error) {
        logger.logError(error, { operation: 'cache_delete', key })
        return false
      }
    },

    clear: async () => {
      try {
        const result = await prisma.cache.deleteMany({})
        logger.cache('clear', 'all', null, result.count)
        return result.count
      } catch (error) {
        logger.logError(error, { operation: 'cache_clear' })
        return 0
      }
    },

    cleanup: async () => {
      try {
        const result = await prisma.cache.deleteMany({
          where: {
            expiresAt: {
              lt: new Date()
            }
          }
        })
        logger.cache('cleanup', 'expired', null, result.count)
        return result.count
      } catch (error) {
        logger.logError(error, { operation: 'cache_cleanup' })
        return 0
      }
    }
  },

  // User management helpers
  user: {
    findOrCreate: async (telegramUser) => {
      try {
        return await prisma.user.upsert({
          where: { telegramId: telegramUser.id },
          update: { 
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            languageCode: telegramUser.language_code,
            lastActivity: new Date()
          },
          create: {
            telegramId: telegramUser.id,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            languageCode: telegramUser.language_code
          }
        })
      } catch (error) {
        logger.logError(error, { operation: 'user_find_or_create', telegramId: telegramUser.id })
        throw error
      }
    },

    updateActivity: async (userId) => {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { lastActivity: new Date() }
        })
      } catch (error) {
        logger.logError(error, { operation: 'user_update_activity', userId })
        // Don't throw for activity updates
      }
    },

    updatePreferences: async (userId, preferences) => {
      try {
        return await prisma.user.update({
          where: { id: userId },
          data: { preferences: JSON.stringify(preferences) }
        })
      } catch (error) {
        logger.logError(error, { operation: 'user_update_preferences', userId })
        throw error
      }
    },

    getPreferences: async (userId) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { preferences: true }
        })
        return user ? JSON.parse(user.preferences) : {}
      } catch (error) {
        logger.logError(error, { operation: 'user_get_preferences', userId })
        return {}
      }
    }
  },

  // Analytics helpers
  analytics: {
    recordActivity: async (userId, activity, metadata = {}) => {
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        await prisma.userAnalytics.upsert({
          where: {
            userId_date: {
              userId,
              date: today
            }
          },
          update: {
            [`${activity}Count`]: {
              increment: 1
            },
            lastActiveHour: new Date().getHours(),
            featuresUsed: JSON.stringify([
              ...new Set([
                ...JSON.parse(metadata.featuresUsed || '[]'),
                activity
              ])
            ])
          },
          create: {
            userId,
            date: today,
            [`${activity}Count`]: 1,
            lastActiveHour: new Date().getHours(),
            featuresUsed: JSON.stringify([activity])
          }
        })
      } catch (error) {
        logger.logError(error, { operation: 'analytics_record_activity', userId, activity })
        // Don't throw for analytics
      }
    }
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...')
  await db.disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...')
  await db.disconnect()
  process.exit(0)
})

export default db