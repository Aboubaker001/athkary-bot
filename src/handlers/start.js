import messages from '../ui/messages.js'
import keyboards from '../ui/keyboards.js'
import logger from '../utils/logger.js'
import config from '../config/index.js'

/**
 * Start Handler - Welcome and initial setup
 */

/**
 * Handle /start command
 */
async function start(ctx) {
  try {
    const user = ctx.user
    if (!user) {
      logger.warn('Start command without authenticated user')
      return
    }

    // Check if this is a new user
    const isNewUser = Date.now() - new Date(user.createdAt).getTime() < 60000 // Within last minute

    // Format welcome message
    const welcomeMessage = messages.formatWelcome(user, isNewUser)
    
    // Log user activity
    logger.userActivity(user.id, 'start_command', { isNewUser })

    // Send welcome message with main keyboard
    await ctx.safeReply(welcomeMessage, {
      reply_markup: keyboards.get('main').reply_markup,
      parse_mode: 'Markdown'
    })

  } catch (error) {
    logger.logError(error, { 
      operation: 'start_handler',
      userId: ctx.user?.id 
    })
    await ctx.safeReply('❌ حدث خطأ أثناء بدء التشغيل. يرجى المحاولة مرة أخرى.')
  }
}

/**
 * Handle /help command
 */
async function help(ctx) {
  try {
    const helpMessage = `
${config.emojis.book} **دليل استخدام بوت الأحاديث الذكي**

🚀 **الأوامر الأساسية:**
• \`/start\` - بدء المحادثة وعرض القائمة الرئيسية
• \`/search [نص]\` - البحث في الأحاديث النبوية
• \`/random\` - عرض حديث عشوائي
• \`/favorites\` - عرض الأحاديث المحفوظة
• \`/settings\` - إعدادات البوت الشخصية
• \`/stats\` - إحصائياتك الشخصية

🔍 **كيفية البحث:**
• ابحث بكلمة مفتاحية: "الصلاة"
• ابحث بالراوي: "أبو هريرة"
• ابحث بالكتاب: "صحيح البخاري"

⭐ **الميزات الخاصة:**
• احفظ الأحاديث المفضلة مع علامات مخصصة
• احصل على تذكيرات يومية للأحاديث
• تتبع تقدمك في القراءة والتعلم
• مشاركة الأحاديث مع الأصدقاء

💡 **نصائح:**
• استخدم الأزرار التفاعلية للتنقل السهل
• اكتب أي كلمة للبحث المباشر
• استخدم القائمة الرئيسية للوصول السريع

${config.emojis.prayer} *نسأل الله أن ينفعنا وإياكم بما تعلمنا*
    `

    await ctx.safeReply(helpMessage, {
      reply_markup: keyboards.get('main').reply_markup,
      parse_mode: 'Markdown'
    })

    logger.userActivity(ctx.user?.id, 'help_command')

  } catch (error) {
    logger.logError(error, { 
      operation: 'help_handler',
      userId: ctx.user?.id 
    })
    await ctx.safeReply('❌ حدث خطأ أثناء عرض المساعدة.')
  }
}

/**
 * Handle back to main menu action
 */
async function backToMain(ctx) {
  try {
    const user = ctx.user
    if (!user) return

    const welcomeMessage = messages.formatWelcome(user, false)
    
    if (ctx.callbackQuery) {
      await ctx.safeAnswerCbQuery('العودة للقائمة الرئيسية')
      await ctx.safeEditText(welcomeMessage, {
        reply_markup: keyboards.get('main').reply_markup,
        parse_mode: 'Markdown'
      })
    } else {
      await ctx.safeReply(welcomeMessage, {
        reply_markup: keyboards.get('main').reply_markup,
        parse_mode: 'Markdown'
      })
    }

    logger.userActivity(user.id, 'back_to_main')

  } catch (error) {
    logger.logError(error, { 
      operation: 'back_to_main',
      userId: ctx.user?.id 
    })
  }
}

/**
 * Show about information
 */
async function showAbout(ctx) {
  try {
    const aboutMessage = `
${config.emojis.mosque} **بوت الأحاديث النبوية الذكي**

🌟 **نبذة عن البوت:**
بوت ذكي ومتطور لتصفح وإدارة الأحاديث النبوية الشريفة، مصمم لجعل تعلم السنة النبوية أسهل وأكثر تنظيماً.

📚 **المصادر:**
• صحيح البخاري
• صحيح مسلم  
• سنن أبي داود
• جامع الترمذي
• سنن النسائي
• سنن ابن ماجه
• مسند أحمد
• موطأ مالك

🔧 **التقنيات المستخدمة:**
• Node.js + Telegraf
• قاعدة بيانات SQLite
• API موسوعة الحديث - Dorar.net

👨‍💻 **المطور:**
فريق بوت الأحاديث الذكي

📧 **التواصل:**
للاستفسارات والاقتراحات: @SmartHadithBotSupport

🎯 **الهدف:**
نشر علم السنة النبوية وتسهيل الوصول إليها بطريقة عصرية ومنظمة

${config.emojis.prayer} *"من دعا إلى هدى كان له من الأجر مثل أجور من تبعه"*

📅 **الإصدار:** 1.0.0
🏷️ **آخر تحديث:** ${new Date().toLocaleDateString('ar-SA')}
    `

    await ctx.safeAnswerCbQuery('معلومات عن البوت')
    await ctx.safeEditText(aboutMessage, {
      reply_markup: keyboards.get('main').reply_markup,
      parse_mode: 'Markdown'
    })

    logger.userActivity(ctx.user?.id, 'view_about')

  } catch (error) {
    logger.logError(error, { 
      operation: 'show_about',
      userId: ctx.user?.id 
    })
  }
}

/**
 * Show dua (prayer)
 */
async function showDua(ctx) {
  try {
    const duaMessage = `
${config.emojis.prayer} **دعاء طلب العلم**

${config.emojis.crescent} *اللهم انفعني بما علمتني، وعلمني ما ينفعني، وزدني علماً*

${config.emojis.crescent} *اللهم إني أسألك من فضلك ورحمتك، فإنه لا يملكها إلا أنت*

${config.emojis.crescent} *رب اشرح لي صدري ويسر لي أمري واحلل عقدة من لساني يفقهوا قولي*

${config.emojis.crescent} *اللهم بارك لنا فيما علمتنا وعلمنا ما ينفعنا وانفعنا بما علمتنا*

💫 **دعاء عند قراءة الحديث:**
${config.emojis.crescent} *اللهم اجعلنا من المتبعين لسنة نبيك محمد صلى الله عليه وسلم*

${config.emojis.star} *آمين يا رب العالمين*

🤲 *ادع بما شئت، فالدعاء عبادة*
    `

    await ctx.safeAnswerCbQuery('بارك الله فيك')
    await ctx.safeEditText(duaMessage, {
      reply_markup: keyboards.get('main').reply_markup,
      parse_mode: 'Markdown'
    })

    logger.userActivity(ctx.user?.id, 'view_dua')

  } catch (error) {
    logger.logError(error, { 
      operation: 'show_dua',
      userId: ctx.user?.id 
    })
  }
}

export default {
  start,
  help,
  backToMain,
  showAbout,
  showDua
}