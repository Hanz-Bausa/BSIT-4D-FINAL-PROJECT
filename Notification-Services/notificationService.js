const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');
const externalServices = require('./externalServices');

class NotificationService {
    constructor() {
        // Email transporter setup
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async createNotification(data) {
        try {
            const notification = new Notification({
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                sourceService: data.sourceService,
                relatedEntityId: data.relatedEntityId,
                priority: data.priority || 'medium',
                metadata: data.metadata || {},
                expiresAt: data.expiresAt
            });

            await notification.save();
            
            // Send real-time notification via WebSocket (if implemented)
            this.sendRealTimeNotification(notification);
            
            // Send email notification for high priority
            if (data.priority === 'high' || data.priority === 'critical') {
                await this.sendEmailNotification(notification);
            }

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    async sendEmailNotification(notification) {
        try {
            const user = await externalServices.getUserById(notification.userId);
            
            if (user && user.email) {
                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: user.email,
                    subject: notification.title,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">
                            <h2>${notification.title}</h2>
                            <p>${notification.message}</p>
                            <p><strong>Type:</strong> ${notification.type}</p>
                            <p><strong>Priority:</strong> ${notification.priority}</p>
                            <p><em>This is an automated notification. Please do not reply.</em></p>
                        </div>
                    `
                };

                await this.transporter.sendMail(mailOptions);
                console.log(`Email notification sent to ${user.email}`);
            }
        } catch (error) {
            console.error('Failed to send email notification:', error);
        }
    }

    sendRealTimeNotification(notification) {
        // This would be connected to your WebSocket server
        // For now, we'll log it
        console.log(`Real-time notification ready for user ${notification.userId}: ${notification.title}`);
    }

    async getUserNotifications(userId, options = {}) {
        const {
            page = 1,
            limit = 20,
            type,
            isRead,
            startDate,
            endDate
        } = options;

        const query = { userId };

        if (type) query.type = type;
        if (isRead !== undefined) query.isRead = isRead;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1, priority: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments(query)
        ]);

        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async markAsRead(notificationId, userId) {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );
        
        if (!notification) {
            throw new Error('Notification not found or unauthorized');
        }
        
        return notification;
    }

    async markAllAsRead(userId) {
        const result = await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );
        
        return { modifiedCount: result.modifiedCount };
    }

    async deleteNotification(notificationId, userId) {
        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            userId
        });
        
        if (!notification) {
            throw new Error('Notification not found or unauthorized');
        }
        
        return notification;
    }

    async getUnreadCount(userId) {
        const count = await Notification.countDocuments({
            userId,
            isRead: false
        });
        
        return { count };
    }

    // Service-specific notification triggers
    async triggerAuthNotification(userId, event, metadata = {}) {
        const notifications = {
            'register': {
                title: 'Welcome to Our Platform!',
                message: 'Your account has been successfully created.',
                type: 'auth'
            },
            'login': {
                title: 'New Login Detected',
                message: 'Your account was accessed from a new device.',
                type: 'auth'
            },
            'password_change': {
                title: 'Password Changed',
                message: 'Your password has been successfully changed.',
                type: 'auth'
            }
        };

        if (notifications[event]) {
            return await this.createNotification({
                userId,
                ...notifications[event],
                sourceService: 'auth',
                metadata
            });
        }
    }

    async triggerEnrollmentNotification(userId, event, enrollmentId, metadata = {}) {
        const notifications = {
            'enrolled': {
                title: 'Course Enrollment Confirmed',
                message: 'You have been successfully enrolled in the course.',
                type: 'enrollment'
            },
            'dropped': {
                title: 'Course Dropped',
                message: 'You have been dropped from the course.',
                type: 'enrollment'
            },
            'waitlist': {
                title: 'Added to Waitlist',
                message: 'You have been added to the course waitlist.',
                type: 'enrollment'
            }
        };

        if (notifications[event]) {
            return await this.createNotification({
                userId,
                ...notifications[event],
                sourceService: 'enrollment',
                relatedEntityId: enrollmentId,
                metadata
            });
        }
    }

    async triggerGradeNotification(userId, event, gradeId, metadata = {}) {
        const notifications = {
            'grade_posted': {
                title: 'New Grade Posted',
                message: 'A new grade has been posted for your course.',
                type: 'grade'
            },
            'grade_updated': {
                title: 'Grade Updated',
                message: 'Your grade has been updated.',
                type: 'grade'
            },
            'final_grade': {
                title: 'Final Grade Available',
                message: 'Your final grade for the course is now available.',
                type: 'grade'
            }
        };

        if (notifications[event]) {
            return await this.createNotification({
                userId,
                ...notifications[event],
                sourceService: 'grade',
                relatedEntityId: gradeId,
                metadata
            });
        }
    }

    async triggerStudentNotification(userId, event, studentId, metadata = {}) {
        const notifications = {
            'profile_updated': {
                title: 'Profile Updated',
                message: 'Your student profile has been updated.',
                type: 'student'
            },
            'document_uploaded': {
                title: 'Document Uploaded',
                message: 'A new document has been uploaded to your profile.',
                type: 'student'
            },
            'status_changed': {
                title: 'Status Changed',
                message: 'Your student status has been updated.',
                type: 'student'
            }
        };

        if (notifications[event]) {
            return await this.createNotification({
                userId,
                ...notifications[event],
                sourceService: 'student',
                relatedEntityId: studentId,
                metadata
            });
        }
    }
}

module.exports = new NotificationService();