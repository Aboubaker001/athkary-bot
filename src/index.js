import { Telegraf, session } from 'telegraf'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'

// Import core modules
import config from './config/index.js'
import logger from './utils/logger.js'
import db from './database/index.js'

// Import middleware
import authMiddleware from './middlewares/auth.js'
import rateLimitMiddleware from './middlewares/rateLimit.js'
import loggingMiddleware from './middlewares/logging.js'
import errorMiddleware from './middlewares/error.js'

// Import handlers
import startHandler from './handlers/start.js'
import searchHandler from './handlers/search.js'
import randomHandler from './handlers/random.js'
import favoritesHandler from './handlers/favorites.js'
import settingsHandler from './handlers/settings.js'
import statsHandler from './handlers/stats.js'
import adminHandler from './handlers/admin.js'
import groupHandler from './handlers/group.js'

// Import services
import schedulerService from './services/schedulerService.js'

/**
 * Smart Hadith Bot - Main Application
 * A sophisticated Telegram bot for Islamic Hadith content
 */
class SmartHadithBot {
  constructor() {
    this.bot = null
    this.server = null
    this.isShuttingDown = false
    
    // Initialize the bot
    this.initializeBot()
    this.setupMiddleware()
    this.setupHandlers()
    this.setupErrorHandling()
    
    // Setup web server for health checks and webhooks
    this.setupWebServer()
    
    // Initialize services
    this.initializeServices()
  }

  /**
   * Initialize Telegraf bot with session support
   */
  initializeBot() {
    try {
      // Validate bot token
      if (!config.bot.token) {
        throw new Error('BOT_TOKEN is required but not provided')
      }

      // Create bot instance
      this.bot = new Telegraf(config.bot.token, {
        handlerTimeout: 30000, // 30 seconds timeout
        contextType: 'default'
      })

      // Session configuration
      this.bot.use(session({
        defaultSession: () => ({
          user: null,
          searchState: {},
          favorites: {},
          settings: {},
          admin: {},
          lastActivity: Date.now()
        })
      }))

      logger.info('Telegraf bot initialized successfully', {
        botUsername: config.bot.username,
        handlerTimeout: 30000
      })
    } catch (error) {
      logger.logError(error, { operation: 'bot_initialization' })
      throw error
    }
  }

  /**
   * Setup bot middleware in correct order
   */
  setupMiddleware() {
    try {
      // Logging middleware (must be first)
      this.bot.use(loggingMiddleware)

      // Authentication middleware
      this.bot.use(authMiddleware)

      // Rate limiting middleware
      this.bot.use(rateLimitMiddleware)

      // Error handling middleware (must be last)
      this.bot.use(errorMiddleware)

      logger.info('Bot middleware configured successfully')
    } catch (error) {
      logger.logError(error, { operation: 'middleware_setup' })
      throw error
    }
  }

  /**
   * Setup command and callback handlers
   */
  setupHandlers() {
    try {
      // Command handlers
      this.bot.start(startHandler.start)
      this.bot.help(startHandler.help)
      this.bot.command('search', searchHandler.searchCommand)
      this.bot.command('random', randomHandler.randomCommand)
      this.bot.command('favorites', favoritesHandler.favoritesCommand)
      this.bot.command('settings', settingsHandler.settingsCommand)
      this.bot.command('stats', statsHandler.statsCommand)
      this.bot.command('admin', adminHandler.adminCommand)

      // Dynamic hadith command handler
      this.bot.command(/hadith_(.+)/, (ctx) => {
        const hadithId = ctx.match[1]
        return searchHandler.showHadith(ctx, hadithId)
      })

      // Callback query handlers
      this.setupCallbackHandlers()

      // Text message handlers
      this.setupTextHandlers()

      // Group-specific handlers
      this.setupGroupHandlers()

      logger.info('Bot handlers configured successfully')
    } catch (error) {
      logger.logError(error, { operation: 'handlers_setup' })
      throw error
    }
  }

  /**
   * Setup callback query handlers for inline keyboards
   */
  setupCallbackHandlers() {
    // Main navigation callbacks
    this.bot.action('back_to_main', startHandler.backToMain)
    this.bot.action('action_search', searchHandler.showSearchOptions)
    this.bot.action('action_random', randomHandler.getRandomHadith)
    this.bot.action('action_favorites', favoritesHandler.showFavorites)
    this.bot.action('action_reminders', settingsHandler.showReminders)
    this.bot.action('action_settings', settingsHandler.showSettings)
    this.bot.action('action_stats', statsHandler.showStats)
    this.bot.action('action_about', startHandler.showAbout)
    this.bot.action('action_dua', startHandler.showDua)
    this.bot.action('action_admin', adminHandler.showAdminPanel)

    // Search callbacks
    this.bot.action(/^search_/, searchHandler.handleSearchAction)
    this.bot.action(/^filter_/, searchHandler.handleFilterAction)
    this.bot.action(/^nav_/, searchHandler.handleNavigationAction)

    // Hadith action callbacks
    this.bot.action(/^favorite_add_(.+)/, favoritesHandler.addToFavorites)
    this.bot.action(/^favorite_remove_(.+)/, favoritesHandler.removeFromFavorites)
    this.bot.action(/^share_(.+)/, searchHandler.shareHadith)
    this.bot.action(/^copy_(.+)/, searchHandler.copyHadith)
    this.bot.action(/^related_(.+)/, searchHandler.findRelated)
    this.bot.action(/^more_from_book_(.+)/, searchHandler.moreFromBook)

    // Favorites callbacks
    this.bot.action(/^favorites_/, favoritesHandler.handleFavoritesAction)
    this.bot.action(/^tag_/, favoritesHandler.handleTagAction)
    this.bot.action(/^collection_/, favoritesHandler.handleCollectionAction)

    // Settings callbacks
    this.bot.action(/^settings_/, settingsHandler.handleSettingsAction)
    this.bot.action(/^reminder_/, settingsHandler.handleReminderAction)
    this.bot.action(/^lang_/, settingsHandler.handleLanguageAction)

    // Admin callbacks (protected)
    this.bot.action(/^admin_/, adminHandler.handleAdminAction)

    // Generic callbacks
    this.bot.action('loading', (ctx) => {
      ctx.answerCbQuery('⏳ جاري التحميل...', { show_alert: false })
    })
    
    this.bot.action('cancel', (ctx) => {
      ctx.answerCbQuery('تم الإلغاء', { show_alert: false })
      return startHandler.backToMain(ctx)
    })
  }

  /**
   * Setup text message handlers
   */
  setupTextHandlers() {
    // Handle search queries
    this.bot.hears(/^[^\s\/].+/, searchHandler.handleTextSearch)

    // Handle special text patterns
    this.bot.hears(/^\/hadith_(.+)/, (ctx) => {
      const hadithId = ctx.match[1]
      return searchHandler.showHadith(ctx, hadithId)
    })
  }

  /**
   * Setup group-specific handlers
   */
  setupGroupHandlers() {
    if (!config.features.groups) return

    // Group events
    this.bot.on('new_chat_members', groupHandler.handleNewMembers)
    this.bot.on('left_chat_member', groupHandler.handleLeftMember)
    this.bot.on('group_chat_created', groupHandler.handleGroupCreated)
    this.bot.on('supergroup_chat_created', groupHandler.handleSupergroupCreated)

    // Group commands
    this.bot.command('groupsettings', groupHandler.showGroupSettings)
    this.bot.command('groupstats', groupHandler.showGroupStats)
  }

  /**
   * Setup comprehensive error handling
   */
  setupErrorHandling() {
    // Bot error handler
    this.bot.catch((error, ctx) => {
      logger.telegramError(error, ctx.update)
      return errorMiddleware.handleBotError(error, ctx)
    })

    // Process error handlers
    process.on('uncaughtException', (error) => {
      logger.logError(error, { type: 'uncaught_exception' })
      this.gracefulShutdown()
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.logError(new Error(reason), { 
        type: 'unhandled_rejection',
        promise: promise.toString()
      })
    })

    // Graceful shutdown handlers
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, initiating graceful shutdown...')
      this.gracefulShutdown()
    })

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, initiating graceful shutdown...')
      this.gracefulShutdown()
    })
  }

  /**
   * Setup Express web server for health checks and webhooks
   */
  setupWebServer() {
    try {
      this.server = express()
      
      // Basic middleware
      this.server.use(helmet())
      this.server.use(cors())
      this.server.use(express.json())

      // Health check endpoint
      this.server.get('/health', async (req, res) => {
        try {
          const dbStatus = await db.ping()
          const status = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: dbStatus ? 'connected' : 'disconnected',
            version: process.env.npm_package_version || '1.0.0'
          }
          res.status(200).json(status)
        } catch (error) {
          logger.logError(error, { operation: 'health_check' })
          res.status(500).json({ status: 'error', error: error.message })
        }
      })

      // Webhook endpoint (if configured)
      if (config.external.webhookUrl) {
        this.server.use(this.bot.webhookCallback('/webhook'))
      }

      // 404 handler
      this.server.use('*', (req, res) => {
        res.status(404).json({ 
          error: 'Not Found',
          message: 'Smart Hadith Bot API - Endpoint not found'
        })
      })

      logger.info('Web server configured successfully')
    } catch (error) {
      logger.logError(error, { operation: 'web_server_setup' })
      throw error
    }
  }

  /**
   * Initialize background services
   */
  async initializeServices() {
    try {
      // Initialize scheduler service for reminders
      if (config.features.reminders) {
        await schedulerService.initialize()
        logger.info('Scheduler service initialized')
      }

      // Initialize cache cleanup
      await this.setupCacheCleanup()

      logger.info('Background services initialized successfully')
    } catch (error) {
      logger.logError(error, { operation: 'services_initialization' })
      // Don't throw here as services are not critical for basic bot operation
    }
  }

  /**
   * Setup cache cleanup job
   */
  async setupCacheCleanup() {
    const cleanupInterval = 60 * 60 * 1000 // 1 hour
    
    setInterval(async () => {
      try {
        const cleaned = await db.cache.cleanup()
        if (cleaned > 0) {
          logger.info(`Cache cleanup: removed ${cleaned} expired entries`)
        }
      } catch (error) {
        logger.logError(error, { operation: 'cache_cleanup' })
      }
    }, cleanupInterval)
  }

  /**
   * Start the bot and web server
   */
  async start() {
    try {
      // Connect to database
      await db.connect()
      logger.info('Database connected successfully')

      // Start web server
      const port = config.port
      this.server.listen(port, () => {
        logger.info(`Web server listening on port ${port}`)
      })

      // Start bot
      if (config.external.webhookUrl) {
        // Use webhook mode
        await this.bot.telegram.setWebhook(config.external.webhookUrl + '/webhook')
        logger.info('Bot started in webhook mode', { 
          webhookUrl: config.external.webhookUrl 
        })
      } else {
        // Use polling mode
        await this.bot.launch({
          polling: {
            timeout: 30,
            limit: 100,
            allowedUpdates: [
              'message',
              'callback_query',
              'inline_query',
              'chosen_inline_result',
              'chat_member',
              'my_chat_member'
            ]
          }
        })
        logger.info('Bot started in polling mode')
      }

      // Log bot info
      const botInfo = await this.bot.telegram.getMe()
      logger.info('Bot information', {
        id: botInfo.id,
        username: botInfo.username,
        firstName: botInfo.first_name,
        canJoinGroups: botInfo.can_join_groups,
        canReadAllGroupMessages: botInfo.can_read_all_group_messages,
        supportsInlineQueries: botInfo.supports_inline_queries
      })

      logger.info('🕌 Smart Hadith Bot started successfully! 🕌')
      console.log('🕌 Smart Hadith Bot is running! 🕌')

    } catch (error) {
      logger.logError(error, { operation: 'bot_startup' })
      throw error
    }
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown() {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    logger.info('Initiating graceful shutdown...')

    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close()
        logger.info('Web server closed')
      }

      // Stop the bot
      if (this.bot) {
        this.bot.stop('SIGTERM')
        logger.info('Bot stopped')
      }

      // Stop background services
      if (config.features.reminders) {
        await schedulerService.stop()
        logger.info('Scheduler service stopped')
      }

      // Disconnect from database
      await db.disconnect()
      logger.info('Database disconnected')

      logger.info('Graceful shutdown completed')
      process.exit(0)
    } catch (error) {
      logger.logError(error, { operation: 'graceful_shutdown' })
      process.exit(1)
    }
  }

  /**
   * Get bot statistics
   */
  async getStats() {
    try {
      const stats = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        bot: {
          username: config.bot.username,
          adminId: config.bot.adminId
        },
        features: config.features,
        environment: config.env
      }

      return stats
    } catch (error) {
      logger.logError(error, { operation: 'get_stats' })
      return null
    }
  }
}

// Create and start the bot
async function main() {
  try {
    const bot = new SmartHadithBot()
    await bot.start()
  } catch (error) {
    logger.logError(error, { operation: 'main_startup' })
    console.error('Failed to start Smart Hadith Bot:', error.message)
    process.exit(1)
  }
}

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default SmartHadithBot