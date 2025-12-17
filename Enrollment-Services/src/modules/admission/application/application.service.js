import { ApplicationRepository } from './application.repository.js';
import { IdentityVerifier } from '../../../infrastructure/external/identity-verifier.js';
import { CurriculumService } from '../../../infrastructure/external/curriculum-service.js';

export class ApplicationProcessingService {
    constructor() {
        this.repository = new ApplicationRepository();
        this.identityVerifier = new IdentityVerifier();
        this.curriculumService = new CurriculumService();
    }

    async initiateAdmissionApplication(applicationData) {
        const { candidateId, programCode, selectedSubjects, admissionCycle } = applicationData;
        
        // Verify candidate exists
        const candidateValid = await this.identityVerifier.validateCandidate(candidateId);
        if (!candidateValid) {
            throw new Error('Candidate identity verification failed');
        }

        // Verify program exists
        const programValid = await this.curriculumService.validateProgram(programCode);
        if (!programValid) {
            throw new Error('Invalid academic program');
        }

        const transaction = await this.repository.beginTransaction();
        
        try {
            // Create main application
            const application = await this.repository.createApplication({
                candidate_id: candidateId,
                program_code: programCode,
                admission_cycle: admissionCycle,
                application_status: 'UNDER_REVIEW'
            });

            // Add selected subjects
            for (const [index, subject] of selectedSubjects.entries()) {
                await this.repository.addApplicationSubject({
                    application_id: application.application_id,
                    subject_code: subject,
                    preference_order: index + 1
                });
            }

            await this.repository.commitTransaction(transaction);
            return application;
            
        } catch (error) {
            await this.repository.rollbackTransaction(transaction);
            throw error;
        }
    }

    async fetchApplicationDetails(applicationId) {
        const application = await this.repository.findApplicationById(applicationId);
        if (!application) return null;

        const subjects = await this.repository.findApplicationSubjects(applicationId);
        const documents = await this.repository.findApplicationDocuments(applicationId);

        return {
            application_summary: application,
            academic_selections: subjects,
            supporting_documents: documents
        };
    }

    async updateApplicationStatus(applicationId, status, remarks = '') {
        const validStatuses = ['APPROVED', 'REJECTED', 'CONDITIONAL', 'DEFERRED'];
        
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid application status');
        }

        const updated = await this.repository.updateApplicationStatus(
            applicationId, 
            status, 
            remarks
        );

        return updated;
    }

    async attachSupportingDocument(applicationId, documentData) {
        const document = await this.repository.addDocument({
            application_id: applicationId,
            document_type: documentData.type,
            file_reference: documentData.reference,
            verification_status: 'SUBMITTED'
        });

        return document;
    }
}