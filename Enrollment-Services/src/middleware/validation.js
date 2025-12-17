export const validateApplication = (req, res, next) => {
    const requiredFields = ['candidateId', 'programCode', 'admissionCycle', 'selectedSubjects'];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            missingFields,
            message: 'Please provide all required application details'
        });
    }

    if (!Array.isArray(req.body.selectedSubjects) || req.body.selectedSubjects.length === 0) {
        return res.status(400).json({
            error: 'Invalid subject selection',
            message: 'At least one subject must be selected'
        });
    }

    next();
};

export const validateApplicationStatus = (req, res, next) => {
    const validStatuses = ['APPROVED', 'REJECTED', 'CONDITIONAL', 'DEFERRED', 'UNDER_REVIEW'];
    
    if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({
            error: 'Invalid status',
            validStatuses,
            message: 'Please provide a valid application status'
        });
    }

    next();
};