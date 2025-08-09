import logger from '../utils/logger.js'
import keyboards from '../ui/keyboards.js'

async function settingsCommand(ctx) {
  await ctx.safeReply('⚙️ قريباً... الإعدادات قيد التطوير')
  logger.userActivity(ctx.user?.id, 'settings_command')
}

async function showSettings(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... الإعدادات قيد التطوير')
  await ctx.safeEditText('⚙️ قريباً... الإعدادات قيد التطوير', {
    reply_markup: keyboards.get('main').reply_markup
  })
}

async function showReminders(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... التذكيرات قيد التطوير')
  await ctx.safeEditText('⏰ قريباً... التذكيرات قيد التطوير', {
    reply_markup: keyboards.get('main').reply_markup
  })
}

async function handleSettingsAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... إعدادات متقدمة قيد التطوير')
}

async function handleReminderAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... إدارة التذكيرات قيد التطوير')
}

async function handleLanguageAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... تغيير اللغة قيد التطوير')
}

export default {
  settingsCommand,
  showSettings,
  showReminders,
  handleSettingsAction,
  handleReminderAction,
  handleLanguageAction
}