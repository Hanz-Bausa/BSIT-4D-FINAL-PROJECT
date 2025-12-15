const axios = require('axios');

class ExternalServices {
    constructor() {
        this.services = {
            auth: axios.create({
                baseURL: process.env.AUTH_SERVICE_URL,
                timeout: 5000
            }),
            enrollment: axios.create({
                baseURL: process.env.ENROLLMENT_SERVICE_URL,
                timeout: 5000
            }),
            grade: axios.create({
                baseURL: process.env.GRADE_SERVICE_URL,
                timeout: 5000
            }),
            student: axios.create({
                baseURL: process.env.STUDENT_SERVICE_URL,
                timeout: 5000
            })
        };
    }

    async verifyToken(token) {
        try {
            const response = await this.services.auth.post('/auth/verify', { token });
            return response.data;
        } catch (error) {
            console.error('Token verification failed:', error.message);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const response = await this.services.auth.get(`/auth/users/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch user:', error.message);
            throw error;
        }
    }

    async getStudentById(studentId) {
        try {
            const response = await this.services.student.get(`/students/${studentId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch student:', error.message);
            throw error;
        }
    }

    async getEnrollmentById(enrollmentId) {
        try {
            const response = await this.services.enrollment.get(`/enrollments/${enrollmentId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch enrollment:', error.message);
            throw error;
        }
    }

    async getGradeById(gradeId) {
        try {
            const response = await this.services.grade.get(`/grades/${gradeId}`);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch grade:', error.message);
            throw error;
        }
    }
}

module.exports = new ExternalServices();