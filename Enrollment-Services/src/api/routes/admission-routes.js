import { Router } from 'express';
import { ApplicationController } from '../../modules/admission/application/application.controller.js';
import { validateApplication } from '../../middleware/validation.js';

const router = Router();
const controller = new ApplicationController();

// Application routes
router.post('/applications/submit', validateApplication, controller.submitApplication.bind(controller));
router.get('/applications/:applicationId', controller.getApplicationDetails.bind(controller));
router.patch('/applications/:applicationId/status', controller.updateApplicationStatus.bind(controller));

// Document management
router.post('/applications/:applicationId/documents', controller.attachDocument.bind(controller));

// Student applications
router.get('/candidates/:candidateId/applications', controller.getCandidateApplications.bind(controller));

// Administrative routes
router.get('/admission-cycle/:cycle/applications', controller.getCycleApplications.bind(controller));

export default router;