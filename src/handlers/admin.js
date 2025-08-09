import { requireAdmin } from '../middlewares/auth.js'
import logger from '../utils/logger.js'
import keyboards from '../ui/keyboards.js'

async function adminCommand(ctx) {
  if (!ctx.isAdmin()) {
    return await ctx.safeReply('🔒 هذا الأمر متاح للمدير فقط')
  }
  await ctx.safeReply('👑 قريباً... لوحة التحكم قيد التطوير')
  logger.userActivity(ctx.user?.id, 'admin_command')
}

async function showAdminPanel(ctx) {
  if (!ctx.isAdmin()) {
    return await ctx.safeAnswerCbQuery('🔒 غير مصرح لك')
  }
  await ctx.safeAnswerCbQuery('قريباً... لوحة التحكم قيد التطوير')
  await ctx.safeEditText('👑 قريباً... لوحة التحكم قيد التطوير', {
    reply_markup: keyboards.get('main').reply_markup
  })
}

async function handleAdminAction(ctx) {
  if (!ctx.isAdmin()) {
    return await ctx.safeAnswerCbQuery('🔒 غير مصرح لك')
  }
  await ctx.safeAnswerCbQuery('قريباً... عمليات الإدارة قيد التطوير')
}

export default { adminCommand, showAdminPanel, handleAdminAction }