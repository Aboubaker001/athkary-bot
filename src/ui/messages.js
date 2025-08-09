import config from '../config/index.js'
import moment from 'moment-timezone'
import _ from 'lodash'

const { emojis } = config

/**
 * Advanced Message Formatting System for Smart Hadith Bot
 * Handles Arabic text, rich formatting, and beautiful layouts
 */
class MessageFormatter {
  constructor() {
    this.maxLength = config.messages.maxLength
    this.previewLength = config.messages.previewLength
  }

  /**
   * Format welcome message with personalized greeting
   */
  formatWelcome(user, isNewUser = false) {
    const greeting = this.getTimeBasedGreeting()
    const userName = user.firstName || user.username || 'أخي الكريم'
    
    const message = isNewUser ? `
${emojis.mosque} **أهلاً وسهلاً بك في بوت الأحاديث الذكي** ${emojis.mosque}

${greeting} *${userName}*!

🌟 **مرحباً بك في رحلة إسلامية مميزة**

هذا البوت يوفر لك:
${emojis.search} **البحث الذكي** في آلاف الأحاديث النبوية الشريفة
${emojis.favorites} **حفظ المفضلات** مع إمكانية التنظيم والتصنيف  
${emojis.reminder} **التذكيرات الذكية** لأحاديث منتقاة بعناية
${emojis.stats} **تتبع رحلتك** مع الإحصائيات والإنجازات
${emojis.book} **مصادر موثوقة** من كتب الحديث المعتمدة

✨ **ابدأ رحلتك الآن** باختيار أحد الخيارات أدناه:

${emojis.prayer} *"اللهم بارك لنا فيما علمتنا وعلمنا ما ينفعنا"*
    ` : `
${emojis.mosque} **مرحباً بعودتك** ${emojis.mosque}

${greeting} *${userName}*!

${emojis.heart} سعداء برؤيتك مرة أخرى في بوت الأحاديث الذكي

اختر ما تريد القيام به:
    `

    return this.cleanAndFormat(message)
  }

  /**
   * Format hadith display with beautiful layout
   */
  formatHadith(hadith, options = {}) {
    const {
      showMetadata = true,
      showActions = true,
      isPreview = false,
      highlightQuery = null
    } = options

    let message = ''

    // Header with book source
    if (hadith.source && showMetadata) {
      message += `${emojis.book} **${hadith.source}**\n`
      if (hadith.hadithNumber) {
        message += `📋 رقم الحديث: *${hadith.hadithNumber}*\n`
      }
      message += '\n'
    }

    // Main hadith text (Arabic)
    if (hadith.arabicText) {
      let arabicText = hadith.arabicText
      
      // Highlight search terms if provided
      if (highlightQuery) {
        arabicText = this.highlightText(arabicText, highlightQuery)
      }

      // Truncate for preview
      if (isPreview && arabicText.length > this.previewLength) {
        arabicText = arabicText.substring(0, this.previewLength) + '...'
      }

      message += `${emojis.crescent} *الحديث الشريف:*\n\n`
      message += `"${arabicText}"\n\n`
    }

    // Translation if available
    if (hadith.translation && !isPreview) {
      message += `🌐 *الترجمة:*\n`
      message += `"${hadith.translation}"\n\n`
    }

    // Narrator information
    if (hadith.narrator && showMetadata) {
      message += `👤 *الراوي:* ${hadith.narrator}\n`
    }

    // Grade/Authentication
    if (hadith.grade && showMetadata) {
      const gradeEmoji = this.getGradeEmoji(hadith.grade)
      message += `${gradeEmoji} *الدرجة:* ${hadith.grade}\n`
    }

    // Chapter/Topic if available
    if (hadith.chapter && showMetadata) {
      message += `📚 *الباب:* ${hadith.chapter}\n`
    }

    if (hadith.topic && showMetadata) {
      message += `🏷️ *الموضوع:* ${hadith.topic}\n`
    }

    // Additional metadata for full view
    if (!isPreview && showMetadata) {
      message += '\n'
      
      // Favorite count
      if (hadith._count?.favorites) {
        message += `${emojis.heart} *محفوظ لدى:* ${hadith._count.favorites} مستخدم\n`
      }

      // Search count
      if (hadith.searchCount > 0) {
        message += `${emojis.search} *تم البحث عنه:* ${hadith.searchCount} مرة\n`
      }

      // Verification status
      if (hadith.isVerified) {
        message += `${emojis.check} *تم التحقق من المصدر*\n`
      }
    }

    // Footer with ID for reference
    if (!isPreview && showMetadata) {
      message += `\n🆔 \`${hadith.id}\``
    }

    return this.cleanAndFormat(message)
  }

  /**
   * Format search results list
   */
  formatSearchResults(results, query, currentPage = 1, totalPages = 1) {
    if (!results || results.length === 0) {
      return this.formatNoResults(query)
    }

    let message = `${emojis.search} **نتائج البحث عن:** *"${query}"*\n\n`
    
    // Results summary
    message += `📊 **العدد:** ${results.length} حديث`
    if (totalPages > 1) {
      message += ` | **الصفحة:** ${currentPage}/${totalPages}`
    }
    message += '\n\n'

    // Display each result as preview
    results.forEach((hadith, index) => {
      const number = ((currentPage - 1) * config.pagination.defaultLimit) + index + 1
      message += `**${number}.** ${this.formatHadithPreview(hadith, query)}\n`
      message += `➤ /hadith_${hadith.id}\n\n`
    })

    // Instructions
    message += `💡 *اضغط على رقم الحديث أو استخدم الأزرار أدناه للتنقل*`

    return this.cleanAndFormat(message)
  }

  /**
   * Format hadith preview for search results
   */
  formatHadithPreview(hadith, highlightQuery = null) {
    let preview = ''
    
    // Source
    if (hadith.source) {
      preview += `📖 ${hadith.source} `
    }

    // Grade emoji
    if (hadith.grade) {
      preview += `${this.getGradeEmoji(hadith.grade)} `
    }

    preview += '\n'

    // Text preview
    const text = hadith.arabicText || hadith.text || ''
    let textPreview = text.length > 100 ? text.substring(0, 100) + '...' : text
    
    if (highlightQuery) {
      textPreview = this.highlightText(textPreview, highlightQuery)
    }

    preview += `"${textPreview}"`

    return preview
  }

  /**
   * Format no results message
   */
  formatNoResults(query) {
    return `
${emojis.search} **البحث عن:** *"${query}"*

${emojis.warning} **لم يتم العثور على نتائج**

💡 **نصائح للبحث:**
• تأكد من صحة الكلمات المكتوبة
• جرب استخدام كلمات مفتاحية مختلفة  
• استخدم البحث المتقدم للخيارات الإضافية
• ابحث باللغة العربية للحصول على نتائج أفضل

🔍 **اقتراحات للبحث:**
• الصلاة، الزكاة، الصوم، الحج
• الإيمان، البر، الإحسان
• اسم راوي محدد مثل "أبو هريرة"
• اسم كتاب مثل "صحيح البخاري"
    `
  }

  /**
   * Format favorites list
   */
  formatFavoritesList(favorites, page = 1, totalPages = 1) {
    if (!favorites || favorites.length === 0) {
      return `
${emojis.favorites} **مفضلاتي**

${emojis.heart} لا توجد أحاديث محفوظة بعد

💡 ابحث عن أحاديث واحفظ المفيد منها لتتمكن من الوصول إليها بسهولة لاحقاً

🔍 استخدم زر "البحث" لبدء البحث عن الأحاديث
      `
    }

    let message = `${emojis.favorites} **مفضلاتي** (${favorites.length})\n\n`

    if (totalPages > 1) {
      message += `📄 الصفحة ${page}/${totalPages}\n\n`
    }

    favorites.forEach((favorite, index) => {
      const number = ((page - 1) * config.pagination.defaultLimit) + index + 1
      const hadith = favorite.hadith
      
      message += `**${number}.** `
      
      // Source and grade
      if (hadith.source) {
        message += `📖 ${hadith.source} `
      }
      if (hadith.grade) {
        message += `${this.getGradeEmoji(hadith.grade)} `
      }
      
      message += '\n'
      
      // Preview text
      const text = hadith.arabicText || hadith.text || ''
      const preview = text.length > 80 ? text.substring(0, 80) + '...' : text
      message += `"${preview}"\n`
      
      // Tags if available
      if (favorite.tags) {
        try {
          const tags = JSON.parse(favorite.tags)
          if (tags.length > 0) {
            message += `🏷️ ${tags.join(', ')}\n`
          }
        } catch (e) {
          // Ignore invalid JSON
        }
      }
      
      // Notes preview
      if (favorite.notes) {
        const notesPreview = favorite.notes.length > 50 
          ? favorite.notes.substring(0, 50) + '...'
          : favorite.notes
        message += `📝 ${notesPreview}\n`
      }
      
      // Date added
      const dateAdded = moment(favorite.createdAt).locale('ar').format('DD/MM/YYYY')
      message += `📅 أضيف في: ${dateAdded}\n`
      
      message += `➤ /hadith_${hadith.id}\n\n`
    })

    return this.cleanAndFormat(message)
  }

  /**
   * Format user statistics
   */
  formatUserStats(user, stats) {
    const joinDate = moment(user.createdAt).locale('ar').format('DD MMMM YYYY')
    const lastActive = moment(user.lastActivity).locale('ar').fromNow()

    return `
${emojis.stats} **إحصائياتك الشخصية**

${emojis.user} **معلومات أساسية:**
• تاريخ الانضمام: ${joinDate}
• آخر نشاط: ${lastActive}
• إجمالي المفضلات: ${stats.totalFavorites || 0}
• إجمالي البحثات: ${stats.totalSearches || 0}

📊 **نشاط هذا الشهر:**
• عمليات البحث: ${stats.monthlySearches || 0}
• أحاديث جديدة محفوظة: ${stats.monthlyFavorites || 0}
• تذكيرات مستلمة: ${stats.monthlyReminders || 0}

🏆 **الإنجازات:**
${this.formatAchievements(stats.achievements || [])}

📈 **الشارة الحالية:** ${this.getUserBadge(stats)}

${emojis.trophy} *استمر في التعلم لفتح إنجازات جديدة!*
    `
  }

  /**
   * Format reminder message
   */
  formatReminder(hadith, reminderName = 'تذكير يومي') {
    const currentTime = moment().locale('ar').format('HH:mm')
    const currentDate = moment().locale('ar').format('dddd، DD MMMM YYYY')
    
    return `
${emojis.reminder} **${reminderName}**
🕐 ${currentTime} - ${currentDate}

${emojis.crescent} *تذكرة إيمانية:*

${this.formatHadith(hadith, { showActions: false, showMetadata: true })}

${emojis.prayer} *"ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار"*

💫 نسأل الله أن ينفعنا بما تعلمنا
    `
  }

  /**
   * Format admin statistics
   */
  formatAdminStats(stats) {
    return `
${emojis.admin} **إحصائيات النظام**

👥 **المستخدمون:**
• إجمالي المستخدمين: ${stats.totalUsers || 0}
• نشطون اليوم: ${stats.activeToday || 0}
• نشطون هذا الأسبوع: ${stats.activeWeek || 0}
• مستخدمون جدد هذا الشهر: ${stats.newThisMonth || 0}

📊 **المحتوى:**
• إجمالي الأحاديث: ${stats.totalHadiths || 0}
• أحاديث محفوظة: ${stats.totalFavorites || 0}
• عمليات بحث اليوم: ${stats.searchesToday || 0}
• تذكيرات مرسلة اليوم: ${stats.remindersToday || 0}

🔧 **النظام:**
• وقت التشغيل: ${this.formatUptime(stats.uptime)}
• استخدام الذاكرة: ${this.formatMemory(stats.memory)}
• استجابة API: ${stats.apiResponseTime || 0}ms
• استجابة قاعدة البيانات: ${stats.dbResponseTime || 0}ms

📈 **الأداء:**
• معدل نجاح العمليات: ${stats.successRate || 0}%
• متوسط وقت الاستجابة: ${stats.avgResponseTime || 0}ms
• استخدام التخزين المؤقت: ${stats.cacheHitRate || 0}%
    `
  }

  /**
   * Format error message
   */
  formatError(error, context = {}) {
    const errorId = context.errorId || 'ERR_' + Date.now()
    
    return `
${emojis.error} **حدث خطأ غير متوقع**

نعتذر، حدث خطأ أثناء معالجة طلبك.

🆔 **رقم الخطأ:** \`${errorId}\`

💡 **يمكنك:**
• إعادة المحاولة بعد قليل
• التأكد من صحة المدخلات
• التواصل مع الدعم إذا استمر الخطأ

🔄 استخدم الأزرار أدناه لإعادة المحاولة أو العودة للقائمة الرئيسية
    `
  }

  /**
   * Format loading message
   */
  formatLoading(action = 'معالجة الطلب') {
    const loadingTexts = [
      'جاري البحث في آلاف الأحاديث...',
      'يتم تحضير النتائج...',
      'جاري التحميل...',
      'يرجى الانتظار...'
    ]
    
    const randomText = loadingTexts[Math.floor(Math.random() * loadingTexts.length)]
    
    return `${emojis.loading} **${action}**\n\n${randomText}`
  }

  /**
   * Helper methods
   */

  getTimeBasedGreeting() {
    const hour = moment().hour()
    
    if (hour >= 5 && hour < 12) {
      return 'صباح الخير'
    } else if (hour >= 12 && hour < 17) {
      return 'مساء الخير'
    } else if (hour >= 17 && hour < 21) {
      return 'مساء الخير'
    } else {
      return 'أهلاً وسهلاً'
    }
  }

  getGradeEmoji(grade) {
    const gradeEmojis = {
      'صحيح': '✅',
      'حسن': '🟢', 
      'ضعيف': '🟡',
      'موضوع': '🔴'
    }
    
    return gradeEmojis[grade] || '📖'
  }

  highlightText(text, query) {
    if (!query || !text) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '**$1**')
  }

  formatAchievements(achievements) {
    if (!achievements || achievements.length === 0) {
      return '• لا توجد إنجازات بعد'
    }
    
    return achievements.map(achievement => 
      `• ${achievement.icon} ${achievement.name}`
    ).join('\n')
  }

  getUserBadge(stats) {
    const searchCount = stats.totalSearches || 0
    const favoriteCount = stats.totalFavorites || 0
    
    if (searchCount >= 1000 || favoriteCount >= 500) {
      return '🥇 عالم محدث'
    } else if (searchCount >= 500 || favoriteCount >= 250) {
      return '🥈 طالب علم متقدم'
    } else if (searchCount >= 100 || favoriteCount >= 50) {
      return '🥉 طالب علم'
    } else if (searchCount >= 10 || favoriteCount >= 5) {
      return '📚 مبتدئ نشط'
    } else {
      return '🌱 مستخدم جديد'
    }
  }

  formatUptime(uptimeSeconds) {
    const days = Math.floor(uptimeSeconds / 86400)
    const hours = Math.floor((uptimeSeconds % 86400) / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    
    return `${days} يوم، ${hours} ساعة، ${minutes} دقيقة`
  }

  formatMemory(memoryBytes) {
    const mb = (memoryBytes / 1024 / 1024).toFixed(2)
    return `${mb} MB`
  }

  cleanAndFormat(message) {
    return message
      .replace(/\n{3,}/g, '\n\n') // Remove multiple newlines
      .trim() // Remove leading/trailing whitespace
      .substring(0, this.maxLength) // Ensure within Telegram limits
  }

  /**
   * Format progress bar for any metric
   */
  formatProgressBar(current, total, width = 10) {
    const percentage = Math.min(100, Math.max(0, (current / total) * 100))
    const filled = Math.floor((percentage / 100) * width)
    const empty = width - filled
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    return `${bar} ${percentage.toFixed(0)}%`
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Truncate text with proper word boundaries
   */
  truncateText(text, maxLength, suffix = '...') {
    if (text.length <= maxLength) return text
    
    const truncated = text.substring(0, maxLength - suffix.length)
    const lastSpace = truncated.lastIndexOf(' ')
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + suffix
      : truncated + suffix
  }
}

// Create singleton instance
const messages = new MessageFormatter()

export default messages