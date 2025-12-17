import axios from 'axios';
import { EXTERNAL_SERVICES } from '../config/service-endpoints.js';

export class CurriculumService {
    async validateProgram(programCode) {
        try {
            const response = await axios.get(
                `${EXTERNAL_SERVICES.CURRICULUM_SERVICE}/programs/${programCode}/validate`
            );
            
            return response.data.isActive && !response.data.isFull;
        } catch (error) {
            console.error(`Program validation error:`, error.message);
            return false;
        }
    }

    async getProgramDetails(programCode) {
        try {
            const response = await axios.get(
                `${EXTERNAL_SERVICES.CURRICULUM_SERVICE}/programs/${programCode}`
            );
            
            return {
                programName: response.data.name,
                duration: response.data.duration,
                creditRequirements: response.data.credits,
                availableSeats: response.data.available_seats
            };
        } catch (error) {
            throw new Error(`Unable to fetch program details: ${error.message}`);
        }
    }

    async validateSubjects(subjectCodes) {
        try {
            const response = await axios.post(
                `${EXTERNAL_SERVICES.CURRICULUM_SERVICE}/subjects/validate`,
                { subjects: subjectCodes }
            );
            
            return response.data.validSubjects;
        } catch (error) {
            console.warn('Subject validation failed:', error.message);
            return [];
        }
    }
}