import { ApplicationProcessingService } from './application.service.js';
import { ResponseHandler } from '../../../utils/response-handler.js';

export class ApplicationController {
    constructor() {
        this.service = new ApplicationProcessingService();
        this.response = new ResponseHandler();
    }

    async submitApplication(req, res) {
        try {
            const application = await this.service.initiateAdmissionApplication(req.body);
            
            this.response.created(res, {
                message: 'Application submitted successfully',
                applicationId: application.application_id,
                status: application.application_status,
                nextSteps: ['Document upload', 'Fee payment', 'Review process']
            });
        } catch (error) {
            this.response.error(res, error.message, 400);
        }
    }

    async getApplicationDetails(req, res) {
        try {
            const details = await this.service.fetchApplicationDetails(req.params.applicationId);
            
            if (!details) {
                return this.response.notFound(res, 'Application not found');
            }

            this.response.success(res, details);
        } catch (error) {
            this.response.error(res, error.message);
        }
    }

    async updateApplicationStatus(req, res) {
        try {
            const { status, remarks } = req.body;
            const updated = await this.service.updateApplicationStatus(
                req.params.applicationId, 
                status, 
                remarks
            );

            this.response.success(res, {
                message: 'Application status updated',
                applicationId: updated.application_id,
                newStatus: updated.application_status,
                updatedAt: updated.updated_at
            });
        } catch (error) {
            this.response.error(res, error.message, 400);
        }
    }

    async attachDocument(req, res) {
        try {
            const document = await this.service.attachSupportingDocument(
                req.params.applicationId,
                req.body
            );

            this.response.created(res, {
                message: 'Document attached successfully',
                documentId: document.document_id,
                verificationStatus: document.verification_status
            });
        } catch (error) {
            this.response.error(res, error.message, 400);
        }
    }

    async getCandidateApplications(req, res) {
        try {
            // Implementation for getting all applications by candidate
            const applications = []; // Replace with actual service call
            this.response.success(res, { applications });
        } catch (error) {
            this.response.error(res, error.message);
        }
    }

    async getCycleApplications(req, res) {
        try {
            // Implementation for getting applications by admission cycle
            const applications = []; // Replace with actual service call
            this.response.success(res, { applications });
        } catch (error) {
            this.response.error(res, error.message);
        }
    }
}