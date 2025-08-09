import axios from 'axios'
import config from '../config/index.js'
import logger from '../utils/logger.js'
import db from '../database/index.js'
import { v4 as uuidv4 } from 'uuid'

class HadithAPI {
  constructor() {
    this.baseURL = config.api.dorarUrl
    this.timeout = config.api.timeout
    this.cacheTTL = config.api.cacheTtl
    
    // Create axios instance with default config
    this.client = axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': 'Smart-Hadith-Bot/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.apiCall(
          response.config.method.toUpperCase(),
          response.config.url,
          response.config.metadata?.startTime ? Date.now() - response.config.metadata.startTime : 0,
          response.status
        )
        return response
      },
      (error) => {
        logger.apiCall(
          error.config?.method?.toUpperCase() || 'UNKNOWN',
          error.config?.url || 'UNKNOWN',
          error.config?.metadata?.startTime ? Date.now() - error.config.metadata.startTime : 0,
          error.response?.status || 0,
          error
        )
        return Promise.reject(error)
      }
    )

    // Add request interceptor for timing
    this.client.interceptors.request.use((config) => {
      config.metadata = { startTime: Date.now() }
      return config
    })
  }

  /**
   * Search for hadiths using the Dorar.net API
   * @param {string} query - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of hadith objects
   */
  async search(query, options = {}) {
    try {
      // Input validation
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Search query is required and must be a non-empty string')
      }

      const trimmedQuery = query.trim()
      const cacheKey = this.generateCacheKey('search', trimmedQuery, options)
      
      // Try to get from cache first
      const cached = await this.getFromCache(cacheKey)
      if (cached) {
        logger.cache('hit', cacheKey)
        return cached
      }

      // Make API request
      const response = await this.client.get(this.baseURL, {
        params: {
          skey: trimmedQuery,
          ...options
        }
      })

      // Process and validate response
      const hadiths = await this.processSearchResponse(response.data)
      
      // Cache the results
      await this.setCache(cacheKey, hadiths)
      
      logger.info('Hadith search completed', {
        query: trimmedQuery,
        resultCount: hadiths.length,
        type: 'api_search'
      })

      return hadiths
    } catch (error) {
      logger.logError(error, { 
        operation: 'hadith_search', 
        query,
        options 
      })
      
      // Return empty array on error to prevent bot crashes
      return []
    }
  }

  /**
   * Get a random hadith from the database or API
   * @param {Object} filters - Optional filters (topic, narrator, etc.)
   * @returns {Promise<Object|null>} Random hadith object
   */
  async getRandom(filters = {}) {
    try {
      const cacheKey = this.generateCacheKey('random', JSON.stringify(filters))
      
      // Try to get a random hadith from our database first
      let hadith = await this.getRandomFromDatabase(filters)
      
      if (!hadith) {
        // If no hadith in database, get from API with a general search
        const searchTerms = ['الصلاة', 'الزكاة', 'الصيام', 'الحج', 'البر', 'الإيمان']
        const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)]
        
        const results = await this.search(randomTerm)
        if (results.length > 0) {
          hadith = results[Math.floor(Math.random() * results.length)]
        }
      }

      if (hadith) {
        logger.info('Random hadith retrieved', {
          hadithId: hadith.id,
          source: hadith.source,
          type: 'random_hadith'
        })
      }

      return hadith
    } catch (error) {
      logger.logError(error, { 
        operation: 'get_random_hadith',
        filters 
      })
      return null
    }
  }

  /**
   * Get hadith by ID from database
   * @param {string} hadithId - Hadith ID
   * @returns {Promise<Object|null>} Hadith object
   */
  async getById(hadithId) {
    try {
      const hadith = await db.prisma.hadith.findUnique({
        where: { id: hadithId },
        include: {
          favorites: {
            select: { userId: true }
          },
          _count: {
            select: { favorites: true }
          }
        }
      })

      if (hadith) {
        // Increment search count
        await db.prisma.hadith.update({
          where: { id: hadithId },
          data: { searchCount: { increment: 1 } }
        })
      }

      return hadith
    } catch (error) {
      logger.logError(error, { 
        operation: 'get_hadith_by_id',
        hadithId 
      })
      return null
    }
  }

  /**
   * Process and normalize API response data
   * @param {Object} responseData - Raw API response
   * @returns {Promise<Array>} Processed hadith array
   */
  async processSearchResponse(responseData) {
    try {
      if (!responseData || !Array.isArray(responseData)) {
        logger.warn('Invalid API response format', { 
          responseData: typeof responseData,
          type: 'api_response_validation' 
        })
        return []
      }

      const processedHadiths = []

      for (const rawHadith of responseData) {
        try {
          const processedHadith = await this.normalizeHadithData(rawHadith)
          if (processedHadith) {
            processedHadiths.push(processedHadith)
          }
        } catch (error) {
          logger.warn('Failed to process individual hadith', {
            error: error.message,
            rawHadith: JSON.stringify(rawHadith).substring(0, 200)
          })
          continue
        }
      }

      return processedHadiths
    } catch (error) {
      logger.logError(error, { operation: 'process_search_response' })
      return []
    }
  }

  /**
   * Normalize and save hadith data
   * @param {Object} rawHadith - Raw hadith data from API
   * @returns {Promise<Object>} Normalized hadith object
   */
  async normalizeHadithData(rawHadith) {
    try {
      // Extract and clean hadith data
      const hadithData = {
        id: uuidv4(),
        dorarId: rawHadith.id?.toString() || null,
        text: this.cleanText(rawHadith.hadith || rawHadith.text || ''),
        arabicText: this.cleanArabicText(rawHadith.hadith_ar || rawHadith.arabic || rawHadith.hadith || ''),
        narrator: this.cleanText(rawHadith.rawi || rawHadith.narrator || ''),
        source: this.cleanText(rawHadith.book || rawHadith.source || ''),
        book: this.cleanText(rawHadith.book_name || rawHadith.book || ''),
        chapter: this.cleanText(rawHadith.chapter || rawHadith.bab || ''),
        hadithNumber: rawHadith.hadith_number?.toString() || rawHadith.number?.toString() || null,
        grade: this.normalizeGrade(rawHadith.grade || rawHadith.hukm || ''),
        topic: this.extractTopic(rawHadith),
        keywords: this.extractKeywords(rawHadith),
        translation: this.cleanText(rawHadith.translation || ''),
        explanation: this.cleanText(rawHadith.explanation || rawHadith.sharh || ''),
        isVerified: this.isVerifiedSource(rawHadith.book || rawHadith.source || '')
      }

      // Only save if we have essential data
      if (hadithData.text || hadithData.arabicText) {
        // Try to save to database (upsert by dorarId if available)
        const savedHadith = await this.saveHadithToDatabase(hadithData)
        return savedHadith || hadithData
      }

      return null
    } catch (error) {
      logger.logError(error, { 
        operation: 'normalize_hadith_data',
        rawHadith: JSON.stringify(rawHadith).substring(0, 200)
      })
      return null
    }
  }

  /**
   * Save hadith to database with conflict resolution
   * @param {Object} hadithData - Normalized hadith data
   * @returns {Promise<Object>} Saved hadith object
   */
  async saveHadithToDatabase(hadithData) {
    try {
      let savedHadith

      if (hadithData.dorarId) {
        // Try to find existing hadith by dorarId
        const existing = await db.prisma.hadith.findUnique({
          where: { dorarId: hadithData.dorarId }
        })

        if (existing) {
          // Update existing hadith
          savedHadith = await db.prisma.hadith.update({
            where: { dorarId: hadithData.dorarId },
            data: {
              ...hadithData,
              updatedAt: new Date()
            }
          })
        } else {
          // Create new hadith
          savedHadith = await db.prisma.hadith.create({
            data: hadithData
          })
        }
      } else {
        // Create new hadith without dorarId
        savedHadith = await db.prisma.hadith.create({
          data: hadithData
        })
      }

      return savedHadith
    } catch (error) {
      logger.logError(error, { 
        operation: 'save_hadith_to_database',
        hadithData: hadithData.id 
      })
      return null
    }
  }

  /**
   * Get random hadith from database
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object|null>} Random hadith
   */
  async getRandomFromDatabase(filters = {}) {
    try {
      const whereClause = { isVerified: true }
      
      if (filters.topic) {
        whereClause.topic = { contains: filters.topic }
      }
      if (filters.narrator) {
        whereClause.narrator = { contains: filters.narrator }
      }
      if (filters.source) {
        whereClause.source = { contains: filters.source }
      }
      if (filters.grade) {
        whereClause.grade = filters.grade
      }

      // Get total count
      const count = await db.prisma.hadith.count({ where: whereClause })
      
      if (count === 0) return null

      // Get random hadith
      const skip = Math.floor(Math.random() * count)
      const hadith = await db.prisma.hadith.findFirst({
        where: whereClause,
        skip,
        include: {
          _count: {
            select: { favorites: true }
          }
        }
      })

      return hadith
    } catch (error) {
      logger.logError(error, { 
        operation: 'get_random_from_database',
        filters 
      })
      return null
    }
  }

  /**
   * Utility methods for data processing
   */

  cleanText(text) {
    if (!text || typeof text !== 'string') return ''
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
  }

  cleanArabicText(text) {
    if (!text || typeof text !== 'string') return ''
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFKC') // Normalize Arabic text
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
  }

  normalizeGrade(grade) {
    if (!grade || typeof grade !== 'string') return null
    
    const gradeMap = {
      'صحيح': 'صحيح',
      'حسن': 'حسن',
      'ضعيف': 'ضعيف',
      'موضوع': 'موضوع',
      'sahih': 'صحيح',
      'hasan': 'حسن',
      'weak': 'ضعيف',
      'fabricated': 'موضوع'
    }

    const normalized = grade.toLowerCase().trim()
    return gradeMap[normalized] || grade.trim()
  }

  extractTopic(rawHadith) {
    // Extract topic from various fields
    const topicFields = [
      rawHadith.topic,
      rawHadith.subject,
      rawHadith.category,
      rawHadith.bab,
      rawHadith.chapter
    ]

    for (const field of topicFields) {
      if (field && typeof field === 'string' && field.trim()) {
        return this.cleanText(field)
      }
    }

    return null
  }

  extractKeywords(rawHadith) {
    // Extract keywords from text and metadata
    const keywords = new Set()
    
    // Add explicit keywords if available
    if (rawHadith.keywords) {
      const keywordArray = Array.isArray(rawHadith.keywords) 
        ? rawHadith.keywords 
        : rawHadith.keywords.split(/[,،]/)
      
      keywordArray.forEach(keyword => {
        const cleaned = this.cleanText(keyword)
        if (cleaned) keywords.add(cleaned)
      })
    }

    // Add topic as keyword
    if (rawHadith.topic) {
      keywords.add(this.cleanText(rawHadith.topic))
    }

    // Add narrator as keyword
    if (rawHadith.rawi || rawHadith.narrator) {
      keywords.add(this.cleanText(rawHadith.rawi || rawHadith.narrator))
    }

    return Array.from(keywords).join(', ')
  }

  isVerifiedSource(source) {
    if (!source || typeof source !== 'string') return false
    
    const verifiedSources = [
      'صحيح البخاري',
      'صحيح مسلم',
      'سنن أبي داود',
      'جامع الترمذي',
      'سنن النسائي',
      'سنن ابن ماجه',
      'مسند أحمد',
      'موطأ مالك'
    ]

    return verifiedSources.some(verified => 
      source.includes(verified)
    )
  }

  /**
   * Cache management methods
   */

  generateCacheKey(operation, ...params) {
    const key = `hadith_api:${operation}:${params.join(':')}`
    return key.replace(/[^a-zA-Z0-9:_-]/g, '_').substring(0, 250)
  }

  async getFromCache(key) {
    try {
      return await db.cache.get(key)
    } catch (error) {
      logger.logError(error, { operation: 'cache_get', key })
      return null
    }
  }

  async setCache(key, data, ttl = null) {
    try {
      const expiresAt = new Date(Date.now() + (ttl || this.cacheTTL) * 1000)
      await db.cache.set(key, data, expiresAt)
    } catch (error) {
      logger.logError(error, { operation: 'cache_set', key })
    }
  }

  /**
   * Search suggestions and auto-completion
   */
  async getSearchSuggestions(partialQuery, limit = 5) {
    try {
      const suggestions = await db.prisma.searchHistory.groupBy({
        by: ['query'],
        where: {
          query: {
            contains: partialQuery,
            mode: 'insensitive'
          }
        },
        _count: {
          query: true
        },
        orderBy: {
          _count: {
            query: 'desc'
          }
        },
        take: limit
      })

      return suggestions.map(s => s.query)
    } catch (error) {
      logger.logError(error, { 
        operation: 'get_search_suggestions',
        partialQuery 
      })
      return []
    }
  }

  /**
   * Get popular search terms
   */
  async getPopularSearches(limit = 10) {
    try {
      const popular = await db.prisma.searchHistory.groupBy({
        by: ['query'],
        _count: {
          query: true
        },
        orderBy: {
          _count: {
            query: 'desc'
          }
        },
        take: limit
      })

      return popular.map(p => ({
        query: p.query,
        count: p._count.query
      }))
    } catch (error) {
      logger.logError(error, { operation: 'get_popular_searches' })
      return []
    }
  }
}

// Create singleton instance
const hadithAPI = new HadithAPI()

export default hadithAPI