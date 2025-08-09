import hadithAPI from '../api/hadith.js'
import messages from '../ui/messages.js'
import keyboards from '../ui/keyboards.js'
import logger from '../utils/logger.js'

async function randomCommand(ctx) {
  await ctx.safeReply('🎲 جاري البحث عن حديث عشوائي...')
  logger.userActivity(ctx.user?.id, 'random_command')
}

async function getRandomHadith(ctx) {
  try {
    await ctx.safeAnswerCbQuery('جاري البحث عن حديث عشوائي...')
    await ctx.safeEditText('🎲 قريباً... الحديث العشوائي قيد التطوير', {
      reply_markup: keyboards.get('main').reply_markup
    })
  } catch (error) {
    logger.logError(error, { operation: 'get_random_hadith', userId: ctx.user?.id })
  }
}

export default { randomCommand, getRandomHadith }