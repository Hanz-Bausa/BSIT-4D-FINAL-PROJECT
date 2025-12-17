import axios from 'axios';
import { EXTERNAL_SERVICES } from '../config/service-endpoints.js';

export class IdentityVerifier {
    async validateCandidate(candidateId) {
        try {
            const response = await axios.get(
                `${EXTERNAL_SERVICES.IDENTITY_SERVICE}/candidates/${candidateId}/verify`,
                { timeout: 5000 }
            );
            
            return response.data.isValid && response.data.isActive;
        } catch (error) {
            console.warn(`Identity verification failed for ${candidateId}:`, error.message);
            return false;
        }
    }

    async fetchCandidateProfile(candidateId) {
        try {
            const response = await axios.get(
                `${EXTERNAL_SERVICES.IDENTITY_SERVICE}/candidates/${candidateId}/profile`
            );
            
            return {
                personalDetails: response.data.personal_info,
                academicBackground: response.data.academic_history,
                contactInformation: response.data.contact_details
            };
        } catch (error) {
            throw new Error(`Unable to fetch candidate profile: ${error.message}`);
        }
    }
}