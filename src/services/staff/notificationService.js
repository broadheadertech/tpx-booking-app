import ApiService from '../api'

/**
 * Notification Service for Staff Dashboard
 * Handles all notification-related API calls
 */
class NotificationService {
  /**
   * Get all notifications for the authenticated user
   * @returns {Promise<Array>} Array of notifications
   */
  async getNotifications() {
    try {
      console.log('NotificationService: Fetching notifications from /notifications/')
      const data = await ApiService.get('/notifications/')
      console.log('NotificationService: Raw API response:', data)
      
      if (!data) {
        console.warn('NotificationService: API returned null/undefined data')
        return []
      }
      
      const transformedData = this.transformNotifications(data)
      console.log('NotificationService: Transformed notifications:', transformedData)
      return transformedData
    } catch (error) {
      console.error('NotificationService: Error fetching notifications:', {
        message: error.message,
        status: error.status,
        data: error.data,
        stack: error.stack
      })
      throw new Error(error.message || 'Failed to load notifications')
    }
  }

  /**
   * Mark notification as read (UI only - backend doesn't support this yet)
   * According to API docs: "No mark-as-read endpoint"
   * @param {number} notificationId - ID of the notification
   * @returns {Promise<boolean>} Success status
   */
  async markAsRead(notificationId) {
    console.log(`NotificationService: Mark as read not supported by backend API (notification ${notificationId})`)
    return false // Indicate operation not supported
  }

  /**
   * Mark notification as unread (UI only - backend doesn't support this yet)
   * According to API docs: "No mark-as-read endpoint"
   * @param {number} notificationId - ID of the notification
   * @returns {Promise<boolean>} Success status
   */
  async markAsUnread(notificationId) {
    console.log(`NotificationService: Mark as unread not supported by backend API (notification ${notificationId})`)
    return false // Indicate operation not supported
  }

  /**
   * Delete notification (UI only - backend doesn't support this yet)
   * According to API docs: Current limitations include no delete endpoint
   * @param {number} notificationId - ID of the notification
   * @returns {Promise<boolean>} Success status
   */
  async deleteNotification(notificationId) {
    console.log(`NotificationService: Delete not supported by backend API (notification ${notificationId})`)
    return false // Indicate operation not supported
  }

  /**
   * Mark all notifications as read (UI only - backend doesn't support this yet)
   * According to API docs: "No mark-as-read endpoint"
   * @returns {Promise<boolean>} Success status
   */
  async markAllAsRead() {
    console.log('NotificationService: Mark all as read not supported by backend API')
    return false // Indicate operation not supported
  }

  /**
   * Get unread notification count
   * @returns {Promise<number>} Number of unread notifications
   */
  async getUnreadCount() {
    try {
      const notifications = await this.getNotifications()
      return notifications.filter(n => n.status === 'unread').length
    } catch (error) {
      console.error('NotificationService: Error getting unread count:', error)
      return 0
    }
  }

  /**
   * Transform backend notification data to frontend format
   * Based on API spec: {id, title, message, created_at, read}
   * @param {Array} backendNotifications - Raw notifications from backend
   * @returns {Array} Transformed notifications
   */
  transformNotifications(backendNotifications) {
    if (!Array.isArray(backendNotifications)) {
      console.warn('NotificationService: Expected array of notifications, got:', typeof backendNotifications)
      return []
    }

    return backendNotifications.map(notification => {
      // Use exact API response format from documentation
      return {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        created_at: notification.created_at,
        read: notification.read,
        // Frontend-only fields for UI
        type: this.inferTypeFromTitle(notification.title),
        status: notification.read ? 'read' : 'unread',
        priority: this.inferPriorityFromTitle(notification.title),
        timestamp: notification.created_at,
        actionUrl: null
      }
    })
  }

  /**
   * Infer notification type from title
   * @param {string} title - Notification title
   * @returns {string} Notification type
   */
  inferTypeFromTitle(title) {
    if (!title) return 'system'
    
    const titleLower = title.toLowerCase()
    if (titleLower.includes('booking') || titleLower.includes('appointment')) return 'booking'
    if (titleLower.includes('voucher') || titleLower.includes('payment')) return 'payment'
    if (titleLower.includes('stock') || titleLower.includes('inventory')) return 'inventory'
    if (titleLower.includes('event') || titleLower.includes('workshop')) return 'event'
    return 'system'
  }

  /**
   * Infer notification priority from title
   * @param {string} title - Notification title
   * @returns {string} Notification priority
   */
  inferPriorityFromTitle(title) {
    if (!title) return 'low'
    
    const titleLower = title.toLowerCase()
    if (titleLower.includes('urgent') || titleLower.includes('critical') || titleLower.includes('emergency')) return 'high'
    if (titleLower.includes('low stock') || titleLower.includes('cancelled') || titleLower.includes('important')) return 'medium'
    return 'low'
  }

  /**
   * Create a new notification (for testing purposes)
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      // This would be used by backend services to create notifications
      // Frontend typically doesn't create notifications directly
      const data = await ApiService.post('/notifications/', notificationData)
      return this.transformNotifications([data])[0]
    } catch (error) {
      console.error('NotificationService: Error creating notification:', error)
      throw new Error('Failed to create notification')
    }
  }
}

export default new NotificationService()