import logger from '../utils/logger.js'

class SchedulerService {
  constructor() {
    this.isInitialized = false
  }

  async initialize() {
    try {
      this.isInitialized = true
      logger.info('Scheduler service initialized successfully')
    } catch (error) {
      logger.logError(error, { operation: 'scheduler_initialize' })
      throw error
    }
  }

  async stop() {
    try {
      this.isInitialized = false
      logger.info('Scheduler service stopped')
    } catch (error) {
      logger.logError(error, { operation: 'scheduler_stop' })
    }
  }
}

const schedulerService = new SchedulerService()
export default schedulerService