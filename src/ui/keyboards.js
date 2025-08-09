import { Markup } from 'telegraf'
import config from '../config/index.js'

const { emojis } = config

/**
 * Advanced Keyboard Builder for Smart Hadith Bot
 * Creates beautiful, responsive, and context-aware keyboards
 */
class KeyboardBuilder {
  constructor() {
    this.keyboards = new Map()
    this.initializeKeyboards()
  }

  /**
   * Initialize all keyboard layouts
   */
  initializeKeyboards() {
    // Main menu keyboard
    this.keyboards.set('main', this.createMainMenu())
    
    // Search keyboards
    this.keyboards.set('search_options', this.createSearchOptions())
    this.keyboards.set('search_filters', this.createSearchFilters())
    
    // Hadith display keyboards
    this.keyboards.set('hadith_actions', this.createHadithActions())
    this.keyboards.set('hadith_navigation', this.createHadithNavigation())
    
    // Favorites keyboards
    this.keyboards.set('favorites_menu', this.createFavoritesMenu())
    this.keyboards.set('favorites_organize', this.createFavoritesOrganize())
    
    // Settings keyboards
    this.keyboards.set('settings_main', this.createSettingsMain())
    this.keyboards.set('settings_reminders', this.createSettingsReminders())
    this.keyboards.set('settings_language', this.createSettingsLanguage())
    
    // Admin keyboards
    this.keyboards.set('admin_panel', this.createAdminPanel())
    this.keyboards.set('admin_stats', this.createAdminStats())
    
    // Group keyboards
    this.keyboards.set('group_settings', this.createGroupSettings())
  }

  /**
   * Get keyboard by name with optional customization
   */
  get(name, options = {}) {
    const keyboard = this.keyboards.get(name)
    if (!keyboard) {
      throw new Error(`Keyboard '${name}' not found`)
    }

    // Apply customizations if provided
    if (options.customize) {
      return options.customize(keyboard)
    }

    return keyboard
  }

  /**
   * Main Menu Keyboard - 4x2 grid layout
   */
  createMainMenu() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`${emojis.search} بحث في الأحاديث`, 'action_search'),
        Markup.button.callback(`${emojis.random} حديث عشوائي`, 'action_random')
      ],
      [
        Markup.button.callback(`${emojis.favorites} مفضلاتي`, 'action_favorites'),
        Markup.button.callback(`${emojis.reminder} التذكيرات`, 'action_reminders')
      ],
      [
        Markup.button.callback(`${emojis.stats} الإحصائيات`, 'action_stats'),
        Markup.button.callback(`${emojis.settings} الإعدادات`, 'action_settings')
      ],
      [
        Markup.button.callback(`${emojis.book} عن البوت`, 'action_about'),
        Markup.button.callback(`${emojis.prayer} دعاء`, 'action_dua')
      ]
    ])
  }

  /**
   * Search Options Keyboard
   */
  createSearchOptions() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`${emojis.search} بحث عام`, 'search_general'),
        Markup.button.callback(`🎯 بحث متقدم`, 'search_advanced')
      ],
      [
        Markup.button.callback(`📚 البحث في كتاب`, 'search_by_book'),
        Markup.button.callback(`👤 البحث بالراوي`, 'search_by_narrator')
      ],
      [
        Markup.button.callback(`🏷️ البحث بالموضوع`, 'search_by_topic'),
        Markup.button.callback(`⭐ الأحاديث الصحيحة`, 'search_sahih_only')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة`, 'back_to_main')
      ]
    ])
  }

  /**
   * Search Filters Keyboard
   */
  createSearchFilters() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('📖 صحيح البخاري', 'filter_bukhari'),
        Markup.button.callback('📖 صحيح مسلم', 'filter_muslim')
      ],
      [
        Markup.button.callback('📖 سنن أبي داود', 'filter_abu_dawud'),
        Markup.button.callback('📖 جامع الترمذي', 'filter_tirmidhi')
      ],
      [
        Markup.button.callback('📖 سنن النسائي', 'filter_nasai'),
        Markup.button.callback('📖 سنن ابن ماجه', 'filter_ibn_majah')
      ],
      [
        Markup.button.callback('✅ تطبيق الفلاتر', 'apply_filters'),
        Markup.button.callback('🗑️ مسح الفلاتر', 'clear_filters')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة`, 'back_to_search')
      ]
    ])
  }

  /**
   * Hadith Actions Keyboard - Context-aware
   */
  createHadithActions(hadithId, userId, isFavorited = false, hasShared = false) {
    const buttons = []

    // First row - Save and Share
    const firstRow = []
    if (isFavorited) {
      firstRow.push(Markup.button.callback(`${emojis.heartFilled} محفوظ`, `favorite_remove_${hadithId}`))
    } else {
      firstRow.push(Markup.button.callback(`${emojis.heart} حفظ`, `favorite_add_${hadithId}`))
    }
    firstRow.push(Markup.button.callback(`${emojis.share} مشاركة`, `share_${hadithId}`))
    buttons.push(firstRow)

    // Second row - Additional actions
    buttons.push([
      Markup.button.callback(`📝 إضافة ملاحظة`, `note_add_${hadithId}`),
      Markup.button.callback(`🏷️ إضافة تاق`, `tag_add_${hadithId}`)
    ])

    // Third row - More options
    buttons.push([
      Markup.button.callback(`📋 نسخ النص`, `copy_${hadithId}`),
      Markup.button.callback(`🔗 رابط دائم`, `permalink_${hadithId}`)
    ])

    // Fourth row - Related and Navigation
    buttons.push([
      Markup.button.callback(`🔗 أحاديث مشابهة`, `related_${hadithId}`),
      Markup.button.callback(`📚 المزيد من نفس الكتاب`, `more_from_book_${hadithId}`)
    ])

    return Markup.inlineKeyboard(buttons)
  }

  /**
   * Hadith Navigation Keyboard - For paginated results
   */
  createHadithNavigation(currentPage = 1, totalPages = 1, searchId = null) {
    const buttons = []

    // Navigation buttons
    const navRow = []
    if (currentPage > 1) {
      navRow.push(Markup.button.callback(`${emojis.prev} السابق`, `nav_prev_${searchId}_${currentPage - 1}`))
    }

    // Page indicator
    navRow.push(Markup.button.callback(`📄 ${currentPage}/${totalPages}`, 'nav_page_info'))

    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback(`${emojis.next} التالي`, `nav_next_${searchId}_${currentPage + 1}`))
    }

    if (navRow.length > 0) {
      buttons.push(navRow)
    }

    // Quick jump buttons
    if (totalPages > 5) {
      const jumpRow = []
      if (currentPage > 3) {
        jumpRow.push(Markup.button.callback('⏮️ الأول', `nav_first_${searchId}`))
      }
      if (currentPage < totalPages - 2) {
        jumpRow.push(Markup.button.callback('⏭️ الأخير', `nav_last_${searchId}`))
      }
      if (jumpRow.length > 0) {
        buttons.push(jumpRow)
      }
    }

    // Action buttons
    buttons.push([
      Markup.button.callback(`🔍 بحث جديد`, 'action_search'),
      Markup.button.callback(`${emojis.home} القائمة الرئيسية`, 'back_to_main')
    ])

    return Markup.inlineKeyboard(buttons)
  }

  /**
   * Favorites Menu Keyboard
   */
  createFavoritesMenu() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`📚 جميع المفضلات`, 'favorites_all'),
        Markup.button.callback(`🏷️ حسب التاق`, 'favorites_by_tag')
      ],
      [
        Markup.button.callback(`📖 حسب الكتاب`, 'favorites_by_book'),
        Markup.button.callback(`👤 حسب الراوي`, 'favorites_by_narrator')
      ],
      [
        Markup.button.callback(`📝 التي لها ملاحظات`, 'favorites_with_notes'),
        Markup.button.callback(`⭐ المفضلة مؤخراً`, 'favorites_recent')
      ],
      [
        Markup.button.callback(`📊 إحصائيات المفضلات`, 'favorites_stats'),
        Markup.button.callback(`🗂️ تنظيم المجموعات`, 'favorites_organize')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة`, 'back_to_main')
      ]
    ])
  }

  /**
   * Favorites Organization Keyboard
   */
  createFavoritesOrganize() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`🏷️ إنشاء تاق جديد`, 'tag_create'),
        Markup.button.callback(`✏️ تعديل التاقات`, 'tag_edit')
      ],
      [
        Markup.button.callback(`📁 إنشاء مجموعة`, 'collection_create'),
        Markup.button.callback(`🗂️ إدارة المجموعات`, 'collection_manage')
      ],
      [
        Markup.button.callback(`📤 تصدير المفضلات`, 'favorites_export'),
        Markup.button.callback(`📥 استيراد مفضلات`, 'favorites_import')
      ],
      [
        Markup.button.callback(`🗑️ حذف المفضلات`, 'favorites_delete_menu'),
        Markup.button.callback(`🔄 إعادة تنظيم`, 'favorites_reorganize')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة للمفضلات`, 'back_to_favorites')
      ]
    ])
  }

  /**
   * Settings Main Menu
   */
  createSettingsMain() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`${emojis.reminder} إعدادات التذكيرات`, 'settings_reminders'),
        Markup.button.callback(`🌐 اللغة والمنطقة`, 'settings_language')
      ],
      [
        Markup.button.callback(`🎨 المظهر والعرض`, 'settings_appearance'),
        Markup.button.callback(`🔔 الإشعارات`, 'settings_notifications')
      ],
      [
        Markup.button.callback(`🔒 الخصوصية`, 'settings_privacy'),
        Markup.button.callback(`📊 البيانات والتحليلات`, 'settings_analytics')
      ],
      [
        Markup.button.callback(`💾 النسخ الاحتياطي`, 'settings_backup'),
        Markup.button.callback(`🔄 إعادة تعيين`, 'settings_reset')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة`, 'back_to_main')
      ]
    ])
  }

  /**
   * Reminder Settings Keyboard
   */
  createSettingsReminders() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`➕ إضافة تذكير`, 'reminder_add'),
        Markup.button.callback(`📋 إدارة التذكيرات`, 'reminder_manage')
      ],
      [
        Markup.button.callback(`🕐 تعديل الأوقات`, 'reminder_times'),
        Markup.button.callback(`📅 تعديل الأيام`, 'reminder_days')
      ],
      [
        Markup.button.callback(`🏷️ اختيار المواضيع`, 'reminder_topics'),
        Markup.button.callback(`🔔 نوع الإشعارات`, 'reminder_notification_type')
      ],
      [
        Markup.button.callback(`⏸️ إيقاف مؤقت`, 'reminder_pause'),
        Markup.button.callback(`🗑️ حذف جميع التذكيرات`, 'reminder_delete_all')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة للإعدادات`, 'back_to_settings')
      ]
    ])
  }

  /**
   * Language Settings Keyboard
   */
  createSettingsLanguage() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`🇸🇦 العربية`, 'lang_ar'),
        Markup.button.callback(`🇺🇸 English`, 'lang_en')
      ],
      [
        Markup.button.callback(`🕐 المنطقة الزمنية`, 'timezone_select'),
        Markup.button.callback(`📅 تنسيق التاريخ`, 'date_format')
      ],
      [
        Markup.button.callback(`🔤 الخط والحجم`, 'font_settings'),
        Markup.button.callback(`📱 اتجاه النص`, 'text_direction')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة للإعدادات`, 'back_to_settings')
      ]
    ])
  }

  /**
   * Admin Panel Keyboard
   */
  createAdminPanel() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`${emojis.stats} إحصائيات النظام`, 'admin_system_stats'),
        Markup.button.callback(`👥 إدارة المستخدمين`, 'admin_users')
      ],
      [
        Markup.button.callback(`📊 تحليلات الاستخدام`, 'admin_analytics'),
        Markup.button.callback(`🗄️ إدارة قاعدة البيانات`, 'admin_database')
      ],
      [
        Markup.button.callback(`📢 إرسال إعلان`, 'admin_broadcast'),
        Markup.button.callback(`🔧 صيانة النظام`, 'admin_maintenance')
      ],
      [
        Markup.button.callback(`📝 سجل الأخطاء`, 'admin_error_logs'),
        Markup.button.callback(`⚙️ إعدادات التطبيق`, 'admin_app_settings')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة`, 'back_to_main')
      ]
    ])
  }

  /**
   * Admin Statistics Keyboard
   */
  createAdminStats() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`📈 المستخدمون النشطون`, 'admin_active_users'),
        Markup.button.callback(`🔍 إحصائيات البحث`, 'admin_search_stats')
      ],
      [
        Markup.button.callback(`⭐ إحصائيات المفضلات`, 'admin_favorites_stats'),
        Markup.button.callback(`⏰ إحصائيات التذكيرات`, 'admin_reminder_stats')
      ],
      [
        Markup.button.callback(`🌐 إحصائيات API`, 'admin_api_stats'),
        Markup.button.callback(`💾 استخدام قاعدة البيانات`, 'admin_db_usage')
      ],
      [
        Markup.button.callback(`📊 تقرير شامل`, 'admin_full_report'),
        Markup.button.callback(`📤 تصدير البيانات`, 'admin_export_data')
      ],
      [
        Markup.button.callback(`${emojis.back} العودة للوحة التحكم`, 'back_to_admin')
      ]
    ])
  }

  /**
   * Group Settings Keyboard
   */
  createGroupSettings() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`⚙️ إعدادات المجموعة`, 'group_settings_main'),
        Markup.button.callback(`👥 إدارة الأعضاء`, 'group_members')
      ],
      [
        Markup.button.callback(`🔔 إشعارات المجموعة`, 'group_notifications'),
        Markup.button.callback(`⏰ تذكيرات المجموعة`, 'group_reminders')
      ],
      [
        Markup.button.callback(`🚫 الكلمات المحظورة`, 'group_banned_words'),
        Markup.button.callback(`🛡️ الحماية من السبام`, 'group_anti_spam')
      ],
      [
        Markup.button.callback(`📊 إحصائيات المجموعة`, 'group_stats'),
        Markup.button.callback(`🗑️ حذف البيانات`, 'group_delete_data')
      ]
    ])
  }

  /**
   * Create confirmation keyboard
   */
  createConfirmation(actionCallback, cancelCallback = 'cancel', confirmText = 'تأكيد', cancelText = 'إلغاء') {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`✅ ${confirmText}`, actionCallback),
        Markup.button.callback(`❌ ${cancelText}`, cancelCallback)
      ]
    ])
  }

  /**
   * Create pagination keyboard
   */
  createPagination(currentPage, totalPages, baseCallback, extraButtons = []) {
    const buttons = []

    // Add extra buttons at the top if provided
    if (extraButtons.length > 0) {
      buttons.push(extraButtons)
    }

    // Navigation row
    const navRow = []
    if (currentPage > 1) {
      navRow.push(Markup.button.callback(`◀️`, `${baseCallback}_${currentPage - 1}`))
    }

    navRow.push(Markup.button.callback(`${currentPage}/${totalPages}`, 'page_info'))

    if (currentPage < totalPages) {
      navRow.push(Markup.button.callback(`▶️`, `${baseCallback}_${currentPage + 1}`))
    }

    if (navRow.length > 1) { // Only add if there's actual navigation
      buttons.push(navRow)
    }

    // Quick jump for large result sets
    if (totalPages > 5) {
      const jumpRow = []
      if (currentPage > 3) {
        jumpRow.push(Markup.button.callback('⏮️ الأول', `${baseCallback}_1`))
      }
      if (currentPage < totalPages - 2) {
        jumpRow.push(Markup.button.callback('⏭️ الأخير', `${baseCallback}_${totalPages}`))
      }
      if (jumpRow.length > 0) {
        buttons.push(jumpRow)
      }
    }

    return Markup.inlineKeyboard(buttons)
  }

  /**
   * Create a choice keyboard from options
   */
  createChoice(options, callback, columns = 2) {
    const buttons = []
    const rows = Math.ceil(options.length / columns)

    for (let i = 0; i < rows; i++) {
      const row = []
      for (let j = 0; j < columns && (i * columns + j) < options.length; j++) {
        const option = options[i * columns + j]
        row.push(Markup.button.callback(option.text, `${callback}_${option.value}`))
      }
      buttons.push(row)
    }

    return Markup.inlineKeyboard(buttons)
  }

  /**
   * Create progress bar visualization
   */
  createProgressBar(current, total, width = 10) {
    const filled = Math.floor((current / total) * width)
    const empty = width - filled
    return '█'.repeat(filled) + '░'.repeat(empty)
  }

  /**
   * Format button text with emoji and proper spacing
   */
  formatButtonText(emoji, text, maxLength = 25) {
    const formatted = `${emoji} ${text}`
    return formatted.length > maxLength 
      ? formatted.substring(0, maxLength - 3) + '...'
      : formatted
  }

  /**
   * Create a keyboard with loading state
   */
  createLoading(text = 'جاري التحميل...') {
    return Markup.inlineKeyboard([
      [Markup.button.callback(`${emojis.loading} ${text}`, 'loading')]
    ])
  }

  /**
   * Create error keyboard with retry option
   */
  createError(retryCallback, backCallback = 'back_to_main') {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`🔄 إعادة المحاولة`, retryCallback),
        Markup.button.callback(`${emojis.back} العودة`, backCallback)
      ]
    ])
  }
}

// Create singleton instance
const keyboards = new KeyboardBuilder()

export default keyboards