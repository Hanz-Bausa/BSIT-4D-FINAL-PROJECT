const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Public routes (for other services to trigger notifications)
router.post('/notifications', notificationController.createNotification);
router.post('/trigger/auth', notificationController.triggerAuthNotification);
router.post('/trigger/enrollment', notificationController.triggerEnrollmentNotification);
router.post('/trigger/grade', notificationController.triggerGradeNotification);
router.post('/trigger/student', notificationController.triggerStudentNotification);

// Protected routes (for users)
router.get('/users/:userId/notifications', authMiddleware, notificationController.getUserNotifications);
router.get('/users/:userId/notifications/unread', authMiddleware, notificationController.getUnreadCount);
router.patch('/notifications/:notificationId/read', authMiddleware, notificationController.markAsRead);
router.patch('/users/me/notifications/read-all', authMiddleware, notificationController.markAllAsRead);
router.delete('/notifications/:notificationId', authMiddleware, notificationController.deleteNotification);
router.delete('/users/me/notifications', authMiddleware, notificationController.clearAllNotifications);

// Admin routes
router.get('/admin/notifications', authMiddleware, requireRole('admin'), async (req, res) => {
    // Admin can view all notifications
    // Implementation similar to getUserNotifications but without user filter
});

module.exports = router;