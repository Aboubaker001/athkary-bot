import logger from '../utils/logger.js'
import keyboards from '../ui/keyboards.js'

async function favoritesCommand(ctx) {
  await ctx.safeReply('⭐ قريباً... المفضلات قيد التطوير')
  logger.userActivity(ctx.user?.id, 'favorites_command')
}

async function showFavorites(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... المفضلات قيد التطوير')
  await ctx.safeEditText('⭐ قريباً... المفضلات قيد التطوير', {
    reply_markup: keyboards.get('main').reply_markup
  })
}

async function addToFavorites(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... إضافة للمفضلات قيد التطوير')
}

async function removeFromFavorites(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... حذف من المفضلات قيد التطوير')
}

async function handleFavoritesAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... إدارة المفضلات قيد التطوير')
}

async function handleTagAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... إدارة العلامات قيد التطوير')
}

async function handleCollectionAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... إدارة المجموعات قيد التطوير')
}

export default {
  favoritesCommand,
  showFavorites,
  addToFavorites,
  removeFromFavorites,
  handleFavoritesAction,
  handleTagAction,
  handleCollectionAction
}