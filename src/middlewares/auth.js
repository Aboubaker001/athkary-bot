import config from '../config/index.js'
import logger from '../utils/logger.js'
import db from '../database/index.js'

/**
 * Authentication Middleware
 * Handles user authentication, session management, and access control
 */

/**
 * Main authentication middleware
 */
async function authMiddleware(ctx, next) {
  try {
    const startTime = Date.now()
    
    // Extract user information from Telegram update
    const telegramUser = ctx.from
    if (!telegramUser) {
      logger.warn('No user information in update', { update: ctx.update })
      return // Skip updates without user info (like channel posts)
    }

    // Check if user is blocked
    if (telegramUser.is_bot && telegramUser.id !== ctx.botInfo?.id) {
      logger.security('Bot user detected', telegramUser.id, { 
        username: telegramUser.username 
      })
      return // Ignore other bots
    }

    // Find or create user in database
    const user = await db.user.findOrCreate(telegramUser)
    
    if (!user) {
      logger.warn('Failed to create/find user', { telegramId: telegramUser.id })
      return
    }

    // Check if user is blocked
    if (user.isBlocked) {
      logger.security('Blocked user attempted access', user.id, {
        telegramId: user.telegramId,
        username: user.username
      })
      await ctx.reply('⛔ تم حظر حسابك من استخدام البوت')
      return
    }

    // Check if user is active
    if (!user.isActive) {
      logger.userActivity(user.id, 'inactive_user_access')
      // Reactivate user
      await db.prisma.user.update({
        where: { id: user.id },
        data: { isActive: true, lastActivity: new Date() }
      })
    }

    // Update last activity
    db.user.updateActivity(user.id).catch(error => {
      logger.logError(error, { operation: 'update_user_activity', userId: user.id })
    })

    // Add user to context
    ctx.user = user
    ctx.session.user = {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      isPremium: user.isPremium,
      preferences: JSON.parse(user.preferences || '{}')
    }

    // Add helper methods to context
    addContextHelpers(ctx)

    // Log user activity
    logger.telegramUpdate(
      ctx.updateType,
      user.id,
      ctx.message?.message_id || ctx.callbackQuery?.message?.message_id
    )

    // Performance logging
    const duration = Date.now() - startTime
    if (duration > 100) { // Log slow auth operations
      logger.performance('auth_middleware', duration, { userId: user.id })
    }

    // Continue to next middleware
    await next()

  } catch (error) {
    logger.logError(error, { 
      operation: 'auth_middleware',
      userId: ctx.user?.id,
      telegramId: ctx.from?.id
    })
    
    // Don't block the request, but log the error
    try {
      await next()
    } catch (nextError) {
      logger.logError(nextError, { operation: 'auth_middleware_next' })
    }
  }
}

/**
 * Admin access control middleware
 */
function requireAdmin(ctx, next) {
  if (!ctx.user) {
    logger.security('Admin access without authenticated user', null, {
      telegramId: ctx.from?.id
    })
    return ctx.reply('🔒 غير مصرح لك بالوصول')
  }

  if (ctx.user.telegramId !== config.bot.adminId) {
    logger.security('Non-admin attempted admin access', ctx.user.id, {
      telegramId: ctx.user.telegramId,
      username: ctx.user.username
    })
    return ctx.reply('🔒 هذا الأمر متاح للمدير فقط')
  }

  logger.userActivity(ctx.user.id, 'admin_access')
  return next()
}

/**
 * Group admin access control
 */
async function requireGroupAdmin(ctx, next) {
  const chatId = ctx.chat?.id
  const userId = ctx.from?.id
  
  if (!chatId || !userId) {
    return ctx.reply('❌ خطأ في معلومات المجموعة')
  }

  try {
    const chatMember = await ctx.telegram.getChatMember(chatId, userId)
    const isAdmin = ['creator', 'administrator'].includes(chatMember.status)
    
    if (!isAdmin) {
      logger.security('Non-admin attempted group admin action', ctx.user?.id, {
        chatId,
        userId,
        status: chatMember.status
      })
      return ctx.reply('🔒 هذا الأمر متاح لمديري المجموعة فقط')
    }

    return next()
  } catch (error) {
    logger.logError(error, { 
      operation: 'check_group_admin',
      chatId,
      userId 
    })
    return ctx.reply('❌ لا يمكن التحقق من صلاحياتك في المجموعة')
  }
}

/**
 * Premium user access control
 */
function requirePremium(ctx, next) {
  if (!ctx.user || !ctx.user.isPremium) {
    return ctx.reply('⭐ هذه الميزة متاحة للمستخدمين المميزين فقط')
  }
  
  return next()
}

/**
 * Check if feature is enabled
 */
function requireFeature(featureName) {
  return (ctx, next) => {
    if (!config.features[featureName]) {
      return ctx.reply('🚫 هذه الميزة غير متاحة حالياً')
    }
    return next()
  }
}

/**
 * Rate limiting for specific operations
 */
function rateLimitOperation(operation, limit = 10, window = 60000) {
  const userOperations = new Map()
  
  return (ctx, next) => {
    const userId = ctx.user?.id
    if (!userId) return next()
    
    const now = Date.now()
    const userKey = `${userId}:${operation}`
    
    if (!userOperations.has(userKey)) {
      userOperations.set(userKey, [])
    }
    
    const operations = userOperations.get(userKey)
    
    // Clean old operations
    const validOperations = operations.filter(timestamp => now - timestamp < window)
    
    if (validOperations.length >= limit) {
      logger.security('Rate limit exceeded', userId, {
        operation,
        count: validOperations.length,
        limit
      })
      return ctx.reply(`⚠️ تم تجاوز الحد المسموح لعملية ${operation}. حاول مرة أخرى بعد قليل.`)
    }
    
    validOperations.push(now)
    userOperations.set(userKey, validOperations)
    
    return next()
  }
}

/**
 * Add helper methods to context
 */
function addContextHelpers(ctx) {
  // Check if user is admin
  ctx.isAdmin = () => {
    return ctx.user?.telegramId === config.bot.adminId
  }

  // Check if user is premium
  ctx.isPremium = () => {
    return ctx.user?.isPremium || false
  }

  // Get user preference
  ctx.getUserPreference = (key, defaultValue = null) => {
    const preferences = ctx.session.user?.preferences || {}
    return preferences[key] !== undefined ? preferences[key] : defaultValue
  }

  // Set user preference
  ctx.setUserPreference = async (key, value) => {
    if (!ctx.user) return false
    
    try {
      const preferences = ctx.session.user?.preferences || {}
      preferences[key] = value
      
      await db.user.updatePreferences(ctx.user.id, preferences)
      if (ctx.session.user) {
        ctx.session.user.preferences = preferences
      }
      
      return true
    } catch (error) {
      logger.logError(error, { 
        operation: 'set_user_preference',
        userId: ctx.user.id,
        key,
        value 
      })
      return false
    }
  }

  // Check if in group
  ctx.isGroup = () => {
    return ['group', 'supergroup'].includes(ctx.chat?.type)
  }

  // Check if in private chat
  ctx.isPrivate = () => {
    return ctx.chat?.type === 'private'
  }

  // Safe reply with error handling
  ctx.safeReply = async (text, extra = {}) => {
    try {
      return await ctx.reply(text, extra)
    } catch (error) {
      logger.logError(error, { 
        operation: 'safe_reply',
        userId: ctx.user?.id,
        text: text.substring(0, 100) 
      })
      
      // Try with simpler message
      try {
        return await ctx.reply('❌ حدث خطأ أثناء إرسال الرسالة')
      } catch (retryError) {
        logger.logError(retryError, { 
          operation: 'safe_reply_retry',
          userId: ctx.user?.id 
        })
      }
    }
  }

  // Safe edit with error handling
  ctx.safeEditText = async (text, extra = {}) => {
    try {
      return await ctx.editMessageText(text, extra)
    } catch (error) {
      logger.logError(error, { 
        operation: 'safe_edit',
        userId: ctx.user?.id,
        text: text.substring(0, 100) 
      })
      
      // If edit fails, try to send new message
      return ctx.safeReply(text, extra)
    }
  }

  // Safe answer callback query
  ctx.safeAnswerCbQuery = async (text = '', extra = {}) => {
    try {
      return await ctx.answerCbQuery(text, extra)
    } catch (error) {
      logger.logError(error, { 
        operation: 'safe_answer_cb_query',
        userId: ctx.user?.id,
        text 
      })
    }
  }
}

/**
 * Middleware for handling user sessions
 */
function sessionMiddleware(ctx, next) {
  // Initialize session if not exists
  if (!ctx.session) {
    ctx.session = {
      user: null,
      searchState: {},
      favorites: {},
      settings: {},
      admin: {},
      lastActivity: Date.now()
    }
  }

  // Update last activity
  ctx.session.lastActivity = Date.now()

  return next()
}

/**
 * Middleware for tracking user analytics
 */
async function analyticsMiddleware(ctx, next) {
  if (!config.features.analytics || !ctx.user) {
    return next()
  }

  try {
    // Determine activity type
    let activity = 'message'
    if (ctx.message?.text?.startsWith('/')) {
      activity = 'command'
    } else if (ctx.callbackQuery) {
      activity = 'callback'
    }

    // Record activity
    await db.analytics.recordActivity(ctx.user.id, activity, {
      command: ctx.message?.text?.split(' ')[0],
      callbackData: ctx.callbackQuery?.data?.split('_')[0]
    })

    return next()
  } catch (error) {
    logger.logError(error, { 
      operation: 'analytics_middleware',
      userId: ctx.user.id 
    })
    return next()
  }
}

export default authMiddleware

export {
  requireAdmin,
  requireGroupAdmin,
  requirePremium,
  requireFeature,
  rateLimitOperation,
  sessionMiddleware,
  analyticsMiddleware
}