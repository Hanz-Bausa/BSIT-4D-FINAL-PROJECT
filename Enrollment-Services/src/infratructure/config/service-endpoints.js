export const EXTERNAL_SERVICES = {
    IDENTITY_SERVICE: process.env.IDENTITY_SERVICE_URL || 'http://identity-service:3100',
    CURRICULUM_SERVICE: process.env.CURRICULUM_SERVICE_URL || 'http://curriculum-service:3200',
    FINANCE_SERVICE: process.env.FINANCE_SERVICE_URL || 'http://finance-service:3300',
    NOTIFICATION_SERVICE: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3400'
};

export const INTERNAL_CONFIG = {
    MAX_APPLICATIONS_PER_CYCLE: 3,
    APPLICATION_FEE_AMOUNT: 5000,
    DOCUMENT_UPLOAD_LIMIT: 5,
    REVIEW_PROCESSING_DAYS: 14
};