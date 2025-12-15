const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['auth', 'enrollment', 'grade', 'student', 'system'],
        required: true
    },
    sourceService: {
        type: String,
        required: true
    },
    relatedEntityId: String,
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        index: true,
        expires: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);