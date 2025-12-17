import JSONStorage from '../../../infrastructure/storage/json-storage.js';

export class ApplicationRepository {
  constructor() {
    this.applicationsStorage = new JSONStorage('applications.json');
    this.subjectsStorage = new JSONStorage('application_subjects.json');
    this.documentsStorage = new JSONStorage('admission_documents.json');
  }

  async createApplication(applicationData) {
    const application = await this.applicationsStorage.create({
      ...applicationData,
      application_id: this.generateApplicationId(),
      application_status: 'UNDER_REVIEW',
      fee_status: 'AWAITING',
      applied_date: new Date().toISOString()
    });
    
    return application;
  }

  async findApplicationById(applicationId) {
    return await this.applicationsStorage.findOne({ application_id: applicationId });
  }

  async addApplicationSubject(subjectData) {
    return await this.subjectsStorage.create(subjectData);
  }

  async updateApplicationStatus(applicationId, status, remarks) {
    return await this.applicationsStorage.update(
      applicationId,
      { 
        application_status: status,
        remarks,
        approval_date: status === 'APPROVED' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      },
      'application_id'
    );
  }

  async findApplicationSubjects(applicationId) {
    return await this.subjectsStorage.find({ application_id: applicationId });
  }

  async addDocument(documentData) {
    return await this.documentsStorage.create(documentData);
  }

  async findApplicationDocuments(applicationId) {
    return await this.documentsStorage.find({ application_id: applicationId });
  }

  async findApplicationsByCandidate(candidateId) {
    return await this.applicationsStorage.find({ candidate_id: candidateId });
  }

  async findApplicationsByStatus(status) {
    return await this.applicationsStorage.find({ application_status: status });
  }

  async getApplicationStats() {
    const applications = await this.applicationsStorage.read();
    const stats = {
      total: applications.length,
      byStatus: {},
      byProgram: {}
    };

    applications.forEach(app => {
      // Count by status
      stats.byStatus[app.application_status] = 
        (stats.byStatus[app.application_status] || 0) + 1;
      
      // Count by program
      stats.byProgram[app.program_code] = 
        (stats.byProgram[app.program_code] || 0) + 1;
    });

    return stats;
  }

  generateApplicationId() {
    const prefix = 'APP';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}