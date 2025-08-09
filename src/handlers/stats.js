import logger from '../utils/logger.js'
import keyboards from '../ui/keyboards.js'

async function statsCommand(ctx) {
  await ctx.safeReply('📊 قريباً... الإحصائيات قيد التطوير')
  logger.userActivity(ctx.user?.id, 'stats_command')
}

async function showStats(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... الإحصائيات قيد التطوير')
  await ctx.safeEditText('📊 قريباً... الإحصائيات قيد التطوير', {
    reply_markup: keyboards.get('main').reply_markup
  })
}

export default { statsCommand, showStats }