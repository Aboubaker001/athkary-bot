import logger from '../utils/logger.js'

/**
 * Logging Middleware
 * Logs all incoming updates and bot interactions
 */

function loggingMiddleware(ctx, next) {
  const startTime = Date.now()
  
  // Extract relevant information from the update
  const updateInfo = extractUpdateInfo(ctx)
  
  // Log the incoming update
  logger.telegramUpdate(
    updateInfo.type,
    updateInfo.userId,
    updateInfo.messageId
  )
  
  // Continue to next middleware and measure response time
  return next().then(() => {
    const duration = Date.now() - startTime
    
    // Log performance if request took too long
    if (duration > 1000) { // Log requests taking more than 1 second
      logger.performance('bot_request', duration, {
        updateType: updateInfo.type,
        userId: updateInfo.userId,
        command: updateInfo.command,
        callbackData: updateInfo.callbackData
      })
    }
  }).catch(error => {
    const duration = Date.now() - startTime
    
    // Log error with context
    logger.logError(error, {
      operation: 'bot_request_handler',
      duration,
      updateType: updateInfo.type,
      userId: updateInfo.userId,
      command: updateInfo.command,
      callbackData: updateInfo.callbackData,
      chatType: ctx.chat?.type
    })
    
    // Re-throw the error so it can be handled by error middleware
    throw error
  })
}

/**
 * Extract useful information from the update for logging
 */
function extractUpdateInfo(ctx) {
  const info = {
    type: ctx.updateType || 'unknown',
    userId: ctx.from?.id || null,
    messageId: null,
    command: null,
    callbackData: null,
    chatType: ctx.chat?.type || 'unknown'
  }
  
  // Extract message-specific info
  if (ctx.message) {
    info.messageId = ctx.message.message_id
    
    if (ctx.message.text?.startsWith('/')) {
      info.command = ctx.message.text.split(' ')[0]
    }
  }
  
  // Extract callback query info
  if (ctx.callbackQuery) {
    info.messageId = ctx.callbackQuery.message?.message_id
    info.callbackData = ctx.callbackQuery.data
  }
  
  return info
}

export default loggingMiddleware