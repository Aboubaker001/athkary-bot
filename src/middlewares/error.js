import logger from '../utils/logger.js'
import messages from '../ui/messages.js'
import keyboards from '../ui/keyboards.js'

/**
 * Error Handling Middleware
 * Provides graceful error handling and user-friendly error messages
 */

/**
 * Main error handling middleware
 */
async function errorMiddleware(ctx, next) {
  try {
    await next()
  } catch (error) {
    await handleError(error, ctx)
  }
}

/**
 * Handle different types of errors
 */
async function handleError(error, ctx) {
  const errorId = generateErrorId()
  
  // Log the error with full context
  logger.logError(error, {
    errorId,
    operation: 'bot_error_handler',
    userId: ctx.user?.id,
    telegramId: ctx.from?.id,
    chatType: ctx.chat?.type,
    updateType: ctx.updateType,
    command: ctx.message?.text?.split(' ')[0],
    callbackData: ctx.callbackQuery?.data
  })

  // Determine error type and respond accordingly
  const errorType = categorizeError(error)
  await sendErrorResponse(ctx, errorType, errorId)
}

/**
 * Categorize error types for appropriate responses
 */
function categorizeError(error) {
  // Telegram API errors
  if (error.code) {
    switch (error.code) {
      case 400:
        return 'bad_request'
      case 401:
        return 'unauthorized'
      case 403:
        return 'forbidden'
      case 404:
        return 'not_found'
      case 429:
        return 'rate_limited'
      case 502:
      case 503:
      case 504:
        return 'server_error'
      default:
        return 'telegram_api'
    }
  }

  // Database errors
  if (error.name?.includes('Prisma') || error.message?.includes('database')) {
    return 'database'
  }

  // Network/API errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return 'network'
  }

  // Validation errors
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return 'validation'
  }

  // Rate limiting errors
  if (error.message?.includes('rate limit')) {
    return 'rate_limit'
  }

  // Default to general error
  return 'general'
}

/**
 * Send appropriate error response to user
 */
async function sendErrorResponse(ctx, errorType, errorId) {
  let responseMessage
  let keyboard = null

  switch (errorType) {
    case 'bad_request':
      responseMessage = `
❌ **طلب غير صحيح**

عذراً، هناك خطأ في الطلب المرسل.

💡 **يرجى التأكد من:**
• صحة الأمر المستخدم
• صحة المعلومات المدخلة
• أن الأمر متاح في هذا السياق

🔄 حاول مرة أخرى أو استخدم القائمة الرئيسية
      `
      keyboard = keyboards.get('main')
      break

    case 'forbidden':
      responseMessage = `
🚫 **غير مسموح**

عذراً، لا يمكن تنفيذ هذا الطلب.

💡 **الأسباب المحتملة:**
• البوت محظور في هذه المجموعة
• لا توجد صلاحيات كافية
• الميزة غير متاحة في هذا السياق

👥 تواصل مع مدير المجموعة إذا كنت في مجموعة
      `
      break

    case 'rate_limited':
      responseMessage = `
⏱️ **تم تجاوز الحد المسموح**

عذراً، تم إرسال طلبات كثيرة في وقت قصير.

💡 **يرجى الانتظار قليلاً ثم المحاولة مرة أخرى**

⏰ عادة ما يكون الانتظار بضع دقائق كافياً
      `
      break

    case 'server_error':
      responseMessage = `
🔧 **مشكلة في الخادم**

عذراً، يواجه تليجرام مشاكل مؤقتة.

💡 **يرجى المحاولة بعد قليل**

🔄 هذه المشاكل عادة ما تُحل تلقائياً
      `
      keyboard = keyboards.createError('retry_last_action')
      break

    case 'database':
      responseMessage = `
💾 **مشكلة في قاعدة البيانات**

عذراً، حدث خطأ أثناء الوصول للبيانات.

🔄 يتم العمل على حل المشكلة

💡 حاول مرة أخرى بعد قليل
      `
      keyboard = keyboards.createError('retry_last_action')
      break

    case 'network':
      responseMessage = `
🌐 **مشكلة في الاتصال**

عذراً، هناك مشكلة في الاتصال بالخدمات الخارجية.

💡 **يرجى المحاولة بعد قليل**

🔄 عادة ما تُحل هذه المشاكل بسرعة
      `
      keyboard = keyboards.createError('retry_last_action')
      break

    case 'validation':
      responseMessage = `
⚠️ **بيانات غير صحيحة**

عذراً، البيانات المدخلة غير صحيحة.

💡 **يرجى التأكد من:**
• صحة النص المدخل
• استخدام الأحرف المناسبة
• الالتزام بالحد المسموح للنص

🔄 حاول مرة أخرى بطريقة صحيحة
      `
      keyboard = keyboards.get('main')
      break

    default:
      responseMessage = messages.formatError(null, { errorId })
      keyboard = keyboards.createError('retry_last_action')
  }

  try {
    if (ctx.callbackQuery) {
      // For callback queries, answer the query and edit the message
      await ctx.safeAnswerCbQuery('حدث خطأ، يرجى المحاولة مرة أخرى')
      
      if (keyboard) {
        await ctx.safeEditText(responseMessage, { 
          reply_markup: keyboard.reply_markup,
          parse_mode: 'Markdown'
        })
      } else {
        await ctx.safeEditText(responseMessage, { parse_mode: 'Markdown' })
      }
    } else {
      // For regular messages, send a new message
      if (keyboard) {
        await ctx.safeReply(responseMessage, { 
          reply_markup: keyboard.reply_markup,
          parse_mode: 'Markdown'
        })
      } else {
        await ctx.safeReply(responseMessage, { parse_mode: 'Markdown' })
      }
    }
  } catch (responseError) {
    // If we can't send the error message, log it and try a simple message
    logger.logError(responseError, {
      operation: 'send_error_response',
      originalErrorId: errorId,
      userId: ctx.user?.id
    })

    try {
      await ctx.reply('❌ حدث خطأ غير متوقع')
    } catch (finalError) {
      logger.logError(finalError, {
        operation: 'send_final_error_response',
        originalErrorId: errorId,
        userId: ctx.user?.id
      })
    }
  }
}

/**
 * Handle bot-level errors (not caught by middleware)
 */
async function handleBotError(error, ctx) {
  const errorId = generateErrorId()
  
  logger.telegramError(error, ctx.update)
  
  try {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('حدث خطأ، يرجى المحاولة مرة أخرى', { show_alert: true })
    } else {
      await ctx.reply(`❌ حدث خطأ غير متوقع\n\n🆔 رقم الخطأ: \`${errorId}\``, { 
        parse_mode: 'Markdown',
        reply_markup: keyboards.get('main').reply_markup
      })
    }
  } catch (responseError) {
    logger.logError(responseError, {
      operation: 'handle_bot_error_response',
      originalErrorId: errorId
    })
  }
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId() {
  return 'ERR_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5)
}

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  const retryableCodes = [502, 503, 504, 429]
  const retryableMessages = ['timeout', 'network', 'connection']
  
  if (retryableCodes.includes(error.code)) {
    return true
  }
  
  if (retryableMessages.some(msg => error.message?.toLowerCase().includes(msg))) {
    return true
  }
  
  return false
}

/**
 * Get error statistics
 */
let errorStats = {
  total: 0,
  byType: {},
  byUser: {},
  recent: []
}

function updateErrorStats(error, errorType, userId) {
  errorStats.total++
  
  if (!errorStats.byType[errorType]) {
    errorStats.byType[errorType] = 0
  }
  errorStats.byType[errorType]++
  
  if (userId) {
    if (!errorStats.byUser[userId]) {
      errorStats.byUser[userId] = 0
    }
    errorStats.byUser[userId]++
  }
  
  // Keep only last 100 errors
  errorStats.recent.push({
    timestamp: Date.now(),
    type: errorType,
    userId,
    message: error.message?.substring(0, 100)
  })
  
  if (errorStats.recent.length > 100) {
    errorStats.recent = errorStats.recent.slice(-100)
  }
}

function getErrorStats() {
  return { ...errorStats }
}

function resetErrorStats() {
  errorStats = {
    total: 0,
    byType: {},
    byUser: {},
    recent: []
  }
}

export default errorMiddleware

export {
  handleBotError,
  isRetryableError,
  getErrorStats,
  resetErrorStats
}