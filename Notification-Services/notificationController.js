const notificationService = require('../services/notificationService');

class NotificationController {
    // Create notification (used by other services)
    async createNotification(req, res) {
        try {
            const notification = await notificationService.createNotification(req.body);
            res.status(201).json({
                success: true,
                data: notification
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get user notifications
    async getUserNotifications(req, res) {
        try {
            const { userId } = req.params;
            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                type: req.query.type,
                isRead: req.query.isRead ? req.query.isRead === 'true' : undefined,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const result = await notificationService.getUserNotifications(userId, options);
            
            res.json({
                success: true,
                data: result.notifications,
                pagination: result.pagination
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Get unread count
    async getUnreadCount(req, res) {
        try {
            const { userId } = req.params;
            const result = await notificationService.getUnreadCount(userId);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Mark as read
    async markAsRead(req, res) {
        try {
            const { notificationId } = req.params;
            const notification = await notificationService.markAsRead(notificationId, req.user.id);
            
            res.json({
                success: true,
                data: notification
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    // Mark all as read
    async markAllAsRead(req, res) {
        try {
            const result = await notificationService.markAllAsRead(req.user.id);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Delete notification
    async deleteNotification(req, res) {
        try {
            const { notificationId } = req.params;
            const notification = await notificationService.deleteNotification(notificationId, req.user.id);
            
            res.json({
                success: true,
                data: notification
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                message: error.message
            });
        }
    }

    // Clear all notifications
    async clearAllNotifications(req, res) {
        try {
            await Notification.deleteMany({ userId: req.user.id });
            
            res.json({
                success: true,
                message: 'All notifications cleared'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    // Service-specific triggers (for internal use)
    async triggerAuthNotification(req, res) {
        try {
            const { userId, event, metadata } = req.body;
            const notification = await notificationService.triggerAuthNotification(userId, event, metadata);
            
            res.json({
                success: true,
                data: notification
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async triggerEnrollmentNotification(req, res) {
        try {
            const { userId, event, enrollmentId, metadata } = req.body;
            const notification = await notificationService.triggerEnrollmentNotification(userId, event, enrollmentId, metadata);
            
            res.json({
                success: true,
                data: notification
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async triggerGradeNotification(req, res) {
        try {
            const { userId, event, gradeId, metadata } = req.body;
            const notification = await notificationService.triggerGradeNotification(userId, event, gradeId, metadata);
            
            res.json({
                success: true,
                data: notification
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async triggerStudentNotification(req, res) {
        try {
            const { userId, event, studentId, metadata } = req.body;
            const notification = await notificationService.triggerStudentNotification(userId, event, studentId, metadata);
            
            res.json({
                success: true,
                data: notification
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new NotificationController();