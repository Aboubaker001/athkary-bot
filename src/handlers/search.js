import hadithAPI from '../api/hadith.js'
import messages from '../ui/messages.js'
import keyboards from '../ui/keyboards.js'
import logger from '../utils/logger.js'

/**
 * Search Handler - Hadith search functionality
 */

/**
 * Handle /search command
 */
async function searchCommand(ctx) {
  try {
    await ctx.safeAnswerCbQuery('البحث في الأحاديث')
    await ctx.safeEditText(
      `${require('../config/index.js').default.emojis.search} **البحث في الأحاديث النبوية**\n\nاختر نوع البحث المطلوب:`,
      {
        reply_markup: keyboards.get('search_options').reply_markup,
        parse_mode: 'Markdown'
      }
    )
    
    logger.userActivity(ctx.user?.id, 'search_menu_opened')
  } catch (error) {
    logger.logError(error, { operation: 'search_command', userId: ctx.user?.id })
    await ctx.safeReply('❌ حدث خطأ أثناء فتح قائمة البحث')
  }
}

/**
 * Handle text search queries
 */
async function handleTextSearch(ctx) {
  try {
    const query = ctx.message.text.trim()
    if (!query || query.length < 2) {
      return await ctx.safeReply('🔍 يرجى كتابة كلمة بحث تحتوي على حرفين على الأقل')
    }

    // Send loading message
    const loadingMsg = await ctx.safeReply(messages.formatLoading('البحث في الأحاديث'))
    
    // Search for hadiths
    const results = await hadithAPI.search(query)
    
    if (results.length === 0) {
      const noResultsMsg = messages.formatNoResults(query)
      return await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMsg.message_id,
        null,
        noResultsMsg,
        { 
          parse_mode: 'Markdown',
          reply_markup: keyboards.get('search_options').reply_markup
        }
      )
    }

    // Format and send results
    const resultsMsg = messages.formatSearchResults(results.slice(0, 10), query, 1, Math.ceil(results.length / 10))
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMsg.message_id,
      null,
      resultsMsg,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboards.createHadithNavigation(1, Math.ceil(results.length / 10), 'search').reply_markup
      }
    )

    logger.userActivity(ctx.user?.id, 'text_search', { query, resultCount: results.length })

  } catch (error) {
    logger.logError(error, { operation: 'handle_text_search', userId: ctx.user?.id })
    await ctx.safeReply('❌ حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.')
  }
}

/**
 * Show specific hadith
 */
async function showHadith(ctx, hadithId) {
  try {
    const hadith = await hadithAPI.getById(hadithId)
    
    if (!hadith) {
      return await ctx.safeReply('❌ لم يتم العثور على الحديث المطلوب')
    }

    const hadithMsg = messages.formatHadith(hadith)
    const hadithKeyboard = keyboards.createHadithActions(hadithId, ctx.user?.id)

    await ctx.safeReply(hadithMsg, {
      reply_markup: hadithKeyboard.reply_markup,
      parse_mode: 'Markdown'
    })

    logger.userActivity(ctx.user?.id, 'view_hadith', { hadithId })

  } catch (error) {
    logger.logError(error, { operation: 'show_hadith', userId: ctx.user?.id, hadithId })
    await ctx.safeReply('❌ حدث خطأ أثناء عرض الحديث')
  }
}

/**
 * Show search options
 */
async function showSearchOptions(ctx) {
  await searchCommand(ctx)
}

/**
 * Handle search action callbacks
 */
async function handleSearchAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... هذه الميزة قيد التطوير')
}

/**
 * Handle filter actions
 */
async function handleFilterAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... الفلاتر قيد التطوير')
}

/**
 * Handle navigation actions
 */
async function handleNavigationAction(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... التنقل قيد التطوير')
}

/**
 * Share hadith
 */
async function shareHadith(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... المشاركة قيد التطوير')
}

/**
 * Copy hadith text
 */
async function copyHadith(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... النسخ قيد التطوير')
}

/**
 * Find related hadiths
 */
async function findRelated(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... الأحاديث المشابهة قيد التطوير')
}

/**
 * Find more hadiths from same book
 */
async function moreFromBook(ctx) {
  await ctx.safeAnswerCbQuery('قريباً... البحث في نفس الكتاب قيد التطوير')
}

export default {
  searchCommand,
  handleTextSearch,
  showHadith,
  showSearchOptions,
  handleSearchAction,
  handleFilterAction,
  handleNavigationAction,
  shareHadith,
  copyHadith,
  findRelated,
  moreFromBook
}