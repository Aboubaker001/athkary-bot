import config from '../config/index.js'
import logger from '../utils/logger.js'

/**
 * Rate Limiting Middleware
 * Prevents spam and abuse by limiting requests per user
 */

// In-memory store for rate limiting (can be replaced with Redis in production)
const rateLimitStore = new Map()

/**
 * Main rate limiting middleware
 */
function rateLimitMiddleware(ctx, next) {
  try {
    const userId = ctx.user?.id || ctx.from?.id
    if (!userId) {
      return next() // Skip rate limiting for requests without user
    }

    // Determine rate limit based on request type
    const { operation, limit, window } = determineRateLimit(ctx)
    
    if (!operation) {
      return next() // No rate limiting for this operation
    }

    // Check rate limit
    const rateLimitKey = `${userId}:${operation}`
    const currentTime = Date.now()
    
    // Get or create rate limit data
    if (!rateLimitStore.has(rateLimitKey)) {
      rateLimitStore.set(rateLimitKey, {
        requests: [],
        blocked: false,
        blockedUntil: 0
      })
    }
    
    const rateLimitData = rateLimitStore.get(rateLimitKey)
    
    // Check if user is temporarily blocked
    if (rateLimitData.blocked && currentTime < rateLimitData.blockedUntil) {
      const remainingTime = Math.ceil((rateLimitData.blockedUntil - currentTime) / 1000)
      logger.security('Rate limit blocked request', userId, {
        operation,
        remainingTime,
        requests: rateLimitData.requests.length
      })
      
      return ctx.safeReply(
        `⚠️ **تم تجاوز الحد المسموح**\n\n` +
        `عذراً، لقد تجاوزت الحد المسموح لعملية **${getOperationName(operation)}**\n\n` +
        `⏱️ **الوقت المتبقي:** ${remainingTime} ثانية\n\n` +
        `💡 **نصيحة:** استخدم البوت بشكل معتدل لتجنب هذا التحديد`
      )
    }
    
    // Clean old requests
    rateLimitData.requests = rateLimitData.requests.filter(
      timestamp => currentTime - timestamp < window
    )
    
    // Check if limit exceeded
    if (rateLimitData.requests.length >= limit) {
      // Block user temporarily
      rateLimitData.blocked = true
      rateLimitData.blockedUntil = currentTime + window
      
      logger.security('Rate limit exceeded', userId, {
        operation,
        requests: rateLimitData.requests.length,
        limit,
        window
      })
      
      // Send warning message
      return ctx.safeReply(
        `🚫 **تم تجاوز الحد المسموح!**\n\n` +
        `لقد تجاوزت الحد المسموح لعملية **${getOperationName(operation)}**\n\n` +
        `📊 **الحد المسموح:** ${limit} طلب كل ${Math.round(window / 1000)} ثانية\n` +
        `⏱️ **مدة الحظر:** ${Math.round(window / 1000)} ثانية\n\n` +
        `💡 **يرجى الانتظار قبل المحاولة مرة أخرى**`
      )
    }
    
    // Add current request
    rateLimitData.requests.push(currentTime)
    
    // Reset blocked status if needed
    if (rateLimitData.blocked && currentTime >= rateLimitData.blockedUntil) {
      rateLimitData.blocked = false
      rateLimitData.blockedUntil = 0
    }
    
    // Continue to next middleware
    return next()
    
  } catch (error) {
    logger.logError(error, { 
      operation: 'rate_limit_middleware',
      userId: ctx.user?.id 
    })
    // Don't block the request on rate limiting errors
    return next()
  }
}

/**
 * Determine rate limit parameters based on request type
 */
function determineRateLimit(ctx) {
  // Admin users have higher limits
  const isAdmin = ctx.user?.telegramId === config.bot.adminId
  const multiplier = isAdmin ? 5 : 1
  
  // Command-based rate limiting
  if (ctx.message?.text?.startsWith('/')) {
    const command = ctx.message.text.split(' ')[0].toLowerCase()
    
    switch (command) {
      case '/search':
        return {
          operation: 'search',
          limit: config.rateLimits.search.requests * multiplier,
          window: config.rateLimits.search.window
        }
      
      case '/random':
        return {
          operation: 'random',
          limit: config.rateLimits.random.requests * multiplier,
          window: config.rateLimits.random.window
        }
        
      case '/favorites':
      case '/fav':
        return {
          operation: 'favorite',
          limit: config.rateLimits.favorite.requests * multiplier,
          window: config.rateLimits.favorite.window
        }
        
      case '/admin':
        if (isAdmin) {
          return {
            operation: 'admin',
            limit: config.rateLimits.admin.requests,
            window: config.rateLimits.admin.window
          }
        }
        break
        
      default:
        // General command rate limit
        return {
          operation: 'command',
          limit: 50 * multiplier,
          window: 60000 // 1 minute
        }
    }
  }
  
  // Callback query based rate limiting
  if (ctx.callbackQuery) {
    const data = ctx.callbackQuery.data
    
    if (data.startsWith('search_') || data.startsWith('nav_')) {
      return {
        operation: 'search',
        limit: config.rateLimits.search.requests * multiplier,
        window: config.rateLimits.search.window
      }
    }
    
    if (data.startsWith('favorite_')) {
      return {
        operation: 'favorite',
        limit: config.rateLimits.favorite.requests * multiplier,
        window: config.rateLimits.favorite.window
      }
    }
    
    if (data.startsWith('admin_')) {
      if (isAdmin) {
        return {
          operation: 'admin',
          limit: config.rateLimits.admin.requests,
          window: config.rateLimits.admin.window
        }
      }
    }
    
    // General callback rate limit
    return {
      operation: 'callback',
      limit: 100 * multiplier,
      window: 60000 // 1 minute
    }
  }
  
  // Text message rate limiting (for search queries)
  if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
    return {
      operation: 'search',
      limit: config.rateLimits.search.requests * multiplier,
      window: config.rateLimits.search.window
    }
  }
  
  // No rate limiting for other types
  return { operation: null }
}

/**
 * Get human-readable operation name
 */
function getOperationName(operation) {
  const names = {
    search: 'البحث',
    random: 'الحديث العشوائي',
    favorite: 'إدارة المفضلات',
    admin: 'عمليات الإدارة',
    command: 'الأوامر',
    callback: 'التفاعل مع الأزرار'
  }
  
  return names[operation] || operation
}

/**
 * Clean up expired rate limit data
 */
function cleanupRateLimitStore() {
  const currentTime = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  
  for (const [key, data] of rateLimitStore.entries()) {
    // Remove old entries
    data.requests = data.requests.filter(
      timestamp => currentTime - timestamp < maxAge
    )
    
    // Remove empty entries
    if (data.requests.length === 0 && !data.blocked) {
      rateLimitStore.delete(key)
    }
  }
  
  logger.debug(`Rate limit store cleanup: ${rateLimitStore.size} entries remaining`)
}

/**
 * Get rate limit statistics
 */
function getRateLimitStats() {
  const stats = {
    totalUsers: rateLimitStore.size,
    blockedUsers: 0,
    totalRequests: 0
  }
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.blocked) {
      stats.blockedUsers++
    }
    stats.totalRequests += data.requests.length
  }
  
  return stats
}

/**
 * Reset rate limits for a user (admin function)
 */
function resetUserRateLimit(userId) {
  let resetCount = 0
  
  for (const key of rateLimitStore.keys()) {
    if (key.startsWith(`${userId}:`)) {
      rateLimitStore.delete(key)
      resetCount++
    }
  }
  
  logger.info('Rate limits reset for user', { userId, resetCount })
  return resetCount
}

/**
 * Block/unblock user from rate limiting perspective
 */
function setUserBlock(userId, blocked, duration = 3600000) { // 1 hour default
  const currentTime = Date.now()
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (key.startsWith(`${userId}:`)) {
      data.blocked = blocked
      data.blockedUntil = blocked ? currentTime + duration : 0
    }
  }
  
  logger.security('User rate limit block status changed', userId, {
    blocked,
    duration: blocked ? duration : 0
  })
}

// Cleanup interval (run every 30 minutes)
setInterval(cleanupRateLimitStore, 30 * 60 * 1000)

export default rateLimitMiddleware

export {
  getRateLimitStats,
  resetUserRateLimit,
  setUserBlock,
  cleanupRateLimitStore
}