const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== UTILITY FUNCTIONS ====================
const readJSONFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return [];
    }
};

const writeJSONFile = (filePath, data) => {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing to ${filePath}:`, error);
        return false;
    }
};

const generateStudentId = () => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `STU-${year}-${random}`;
};

const generateApplicationId = () => {
    return `APP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
};

const generateApplicationSubjectId = () => {
    return `ASUB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
};

const generateDocumentId = () => {
    return `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
};

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

const validatePhone = (phone) => {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone);
};

const validatePassword = (password) => {
    return password && password.length >= 6;
};

// ==================== INITIALIZE DATA ====================
function initializeDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    const backupsDir = path.join(dataDir, 'backups');

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`📁 Created data directory: ${dataDir}`);
    }

    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
        console.log(`📁 Created backups directory: ${backupsDir}`);
    }

    const essentialFiles = [
        'students.json',
        'applications.json',
        'application_subjects.json',
        'admission_documents.json',
        'programs.json',
        'subjects.json',
        'admission_cycles.json',
        'users.json'
    ];

    essentialFiles.forEach(file => {
        const filePath = path.join(dataDir, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]');
            console.log(`📄 Created: ${file}`);
        }
    });
}

initializeDataDirectory();

// ==================== MIDDLEWARE - VALIDATION ====================
const validateStudentRegistration = (req, res, next) => {
    const {
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        password
    } = req.body;

    const errors = [];

    if (!first_name || first_name.trim().length < 2) {
        errors.push('First name is required and must be at least 2 characters');
    }

    if (!last_name || last_name.trim().length < 2) {
        errors.push('Last name is required and must be at least 2 characters');
    }

    if (!email || !validateEmail(email)) {
        errors.push('Valid email is required');
    }

    if (!phone || !validatePhone(phone)) {
        errors.push('Valid phone number is required');
    }

    if (!date_of_birth) {
        errors.push('Date of birth is required');
    } else {
        const dob = new Date(date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 16) {
            errors.push('Student must be at least 16 years old');
        }
    }

    if (!gender || !['male', 'female', 'other'].includes(gender.toLowerCase())) {
        errors.push('Gender is required and must be male, female, or other');
    }

    if (!validatePassword(password)) {
        errors.push('Password is required and must be at least 6 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

const validateStudentUpdate = (req, res, next) => {
    const updates = req.body;
    const errors = [];

    if (updates.email && !validateEmail(updates.email)) {
        errors.push('Valid email is required');
    }

    if (updates.phone && !validatePhone(updates.phone)) {
        errors.push('Valid phone number is required');
    }

    if (updates.password && !validatePassword(updates.password)) {
        errors.push('Password must be at least 6 characters');
    }

    if (updates.date_of_birth) {
        const dob = new Date(updates.date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 16) {
            errors.push('Student must be at least 16 years old');
        }
    }

    if (updates.gender && !['male', 'female', 'other'].includes(updates.gender.toLowerCase())) {
        errors.push('Gender must be male, female, or other');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

const validateApplication = (req, res, next) => {
    const { student_id, program_code, admission_cycle } = req.body;
    const errors = [];

    if (!student_id) {
        errors.push('Student ID is required');
    }

    if (!program_code) {
        errors.push('Program code is required');
    }

    if (!admission_cycle) {
        errors.push('Admission cycle is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

const validateApplicationSubject = (req, res, next) => {
    const { subject_code } = req.body;
    const errors = [];

    if (!subject_code) {
        errors.push('Subject code is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

const validateDocument = (req, res, next) => {
    const { document_type, file_reference } = req.body;
    const errors = [];

    if (!document_type) {
        errors.push('Document type is required');
    }

    if (!file_reference) {
        errors.push('File reference is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    next();
};

// ==================== HEALTH & TEST ====================
app.get('/health', (req, res) => {
    const dataDir = path.join(__dirname, 'data');
    let storageInfo = { initialized: false };

    try {
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
        const fileStats = files.map(file => {
            const filePath = path.join(dataDir, file);
            const data = readJSONFile(filePath);
            return {
                file,
                records: data.length,
                size: fs.statSync(filePath).size
            };
        });

        storageInfo = {
            initialized: true,
            fileCount: files.length,
            files: fileStats
        };
    } catch (error) {
        storageInfo.error = error.message;
    }

    res.json({
        status: 'healthy',
        service: 'University Admission System',
        version: '2.0.0',
        storage: storageInfo,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working!',
        version: '2.0.0',
        endpoints: {
            health: 'GET /health',
            auth: 'POST /api/v1/auth/register, POST /api/v1/auth/login',
            students: 'GET /api/v1/students, GET /api/v1/students/:id, PUT /api/v1/students/:id',
            applications: 'GET /api/v1/admission/applications, POST /api/v1/admission/applications',
            programs: 'GET /api/v1/programs',
            subjects: 'GET /api/v1/subjects'
        }
    });
});

// ==================== AUTHENTICATION ENDPOINTS ====================
app.post('/api/v1/auth/register', validateStudentRegistration, async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            phone,
            date_of_birth,
            gender,
            password,
            address,
            city,
            state,
            country,
            zip_code,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relationship
        } = req.body;

        const studentsPath = path.join(__dirname, 'data', 'students.json');
        const students = readJSONFile(studentsPath);

        const existingStudent = students.find(s => s.email === email.toLowerCase());
        if (existingStudent) {
            return res.status(409).json({
                error: 'Email already registered'
            });
        }

        const student_id = generateStudentId();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newStudent = {
            id: uuidv4(),
            student_id,
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            full_name: `${first_name.trim()} ${last_name.trim()}`,
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            date_of_birth,
            gender: gender.toLowerCase(),
            address: address || '',
            city: city || '',
            state: state || '',
            country: country || '',
            zip_code: zip_code || '',
            emergency_contact: {
                name: emergency_contact_name || '',
                phone: emergency_contact_phone || '',
                relationship: emergency_contact_relationship || ''
            },
            academic_info: {
                highest_qualification: '',
                institution: '',
                graduation_year: '',
                gpa: ''
            },
            password: hashedPassword,
            status: 'active',
            registration_date: new Date().toISOString(),
            last_login: null,
            email_verified: false,
            phone_verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        students.push(newStudent);

        if (writeJSONFile(studentsPath, students)) {
            const { password: _, ...studentWithoutPassword } = newStudent;

            res.status(201).json({
                message: 'Student registered successfully',
                student: studentWithoutPassword,
                login_credentials: {
                    student_id,
                    email: newStudent.email
                }
            });
        } else {
            throw new Error('Failed to save student data');
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

app.post('/api/v1/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        const studentsPath = path.join(__dirname, 'data', 'students.json');
        const students = readJSONFile(studentsPath);

        const student = students.find(s => s.email === email.toLowerCase());
        if (!student) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        const validPassword = await bcrypt.compare(password, student.password);
        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid credentials'
            });
        }

        student.last_login = new Date().toISOString();
        writeJSONFile(studentsPath, students);

        const { password: _, ...studentWithoutPassword } = student;

        res.json({
            message: 'Login successful',
            student: studentWithoutPassword,
            token: `student-${student.student_id}-${Date.now()}`
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ==================== STUDENTS ENDPOINTS ====================
app.get('/api/v1/students', (req, res) => {
    try {
        const studentsPath = path.join(__dirname, 'data', 'students.json');
        let students = readJSONFile(studentsPath);
        students = students.map(({ password, ...student }) => student);
        res.json({
            count: students.length,
            students: students
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

app.get('/api/v1/students/:id', (req, res) => {
    try {
        const studentId = req.params.id;
        const studentsPath = path.join(__dirname, 'data', 'students.json');
        const students = readJSONFile(studentsPath);

        const student = students.find(s => s.student_id === studentId || s.id === studentId);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const { password, ...studentWithoutPassword } = student;
        res.json(studentWithoutPassword);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({ error: 'Failed to fetch student' });
    }
});

app.put('/api/v1/students/:id', validateStudentUpdate, async (req, res) => {
    try {
        const studentId = req.params.id;
        const updates = req.body;
        const studentsPath = path.join(__dirname, 'data', 'students.json');
        const students = readJSONFile(studentsPath);

        const studentIndex = students.findIndex(s => s.student_id === studentId || s.id === studentId);
        if (studentIndex === -1) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const currentStudent = students[studentIndex];

        if (updates.email && updates.email.toLowerCase() !== currentStudent.email) {
            const emailExists = students.some(s =>
                s.email === updates.email.toLowerCase() &&
                s.student_id !== studentId
            );
            if (emailExists) {
                return res.status(409).json({
                    error: 'Email already registered by another student'
                });
            }
            updates.email = updates.email.toLowerCase();
            updates.email_verified = false;
        }

        const restrictedFields = ['student_id', 'registration_date', 'created_at'];
        restrictedFields.forEach(field => {
            delete updates[field];
        });

        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        }

        if (updates.first_name || updates.last_name) {
            const firstName = updates.first_name || currentStudent.first_name;
            const lastName = updates.last_name || currentStudent.last_name;
            updates.full_name = `${firstName} ${lastName}`;
        }

        if (updates.emergency_contact_name || updates.emergency_contact_phone || updates.emergency_contact_relationship) {
            updates.emergency_contact = {
                name: updates.emergency_contact_name || currentStudent.emergency_contact.name,
                phone: updates.emergency_contact_phone || currentStudent.emergency_contact.phone,
                relationship: updates.emergency_contact_relationship || currentStudent.emergency_contact.relationship
            };
            delete updates.emergency_contact_name;
            delete updates.emergency_contact_phone;
            delete updates.emergency_contact_relationship;
        }

        if (updates.highest_qualification || updates.institution || updates.graduation_year || updates.gpa) {
            updates.academic_info = {
                highest_qualification: updates.highest_qualification || currentStudent.academic_info.highest_qualification,
                institution: updates.institution || currentStudent.academic_info.institution,
                graduation_year: updates.graduation_year || currentStudent.academic_info.graduation_year,
                gpa: updates.gpa || currentStudent.academic_info.gpa
            };
            delete updates.highest_qualification;
            delete updates.institution;
            delete updates.graduation_year;
            delete updates.gpa;
        }

        students[studentIndex] = {
            ...currentStudent,
            ...updates,
            updated_at: new Date().toISOString()
        };

        if (writeJSONFile(studentsPath, students)) {
            const { password, ...studentWithoutPassword } = students[studentIndex];
            res.json({
                message: 'Student updated successfully',
                student: studentWithoutPassword
            });
        } else {
            throw new Error('Failed to save student data');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Failed to update student' });
    }
});

app.delete('/api/v1/students/:id', (req, res) => {
    try {
        const studentId = req.params.id;
        const studentsPath = path.join(__dirname, 'data', 'students.json');
        let students = readJSONFile(studentsPath);

        const initialLength = students.length;
        students = students.filter(s => s.student_id !== studentId && s.id !== studentId);

        if (students.length === initialLength) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (writeJSONFile(studentsPath, students)) {
            res.json({
                message: 'Student deleted successfully',
                student_id: studentId
            });
        } else {
            throw new Error('Failed to delete student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Failed to delete student' });
    }
});

app.get('/api/v1/students/search', (req, res) => {
    try {
        const { query } = req.query;
        const studentsPath = path.join(__dirname, 'data', 'students.json');
        let students = readJSONFile(studentsPath);

        if (!query) {
            students = students.map(({ password, ...student }) => student);
            return res.json({
                count: students.length,
                students: students
            });
        }

        const searchTerm = query.toLowerCase();
        const filteredStudents = students.filter(student =>
            student.student_id.toLowerCase().includes(searchTerm) ||
            student.first_name.toLowerCase().includes(searchTerm) ||
            student.last_name.toLowerCase().includes(searchTerm) ||
            student.full_name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm) ||
            student.phone.includes(searchTerm)
        );

        const sanitizedStudents = filteredStudents.map(({ password, ...student }) => student);

        res.json({
            count: filteredStudents.length,
            students: sanitizedStudents
        });
    } catch (error) {
        console.error('Error searching students:', error);
        res.status(500).json({ error: 'Failed to search students' });
    }
});

// ==================== PROGRAMS ENDPOINTS ====================
app.get('/api/v1/programs', (req, res) => {
    try {
        const programsPath = path.join(__dirname, 'data', 'programs.json');
        const programs = readJSONFile(programs.json);
        res.json({
            count: programs.length,
            programs: programs
        });
    } catch (error) {
        console.error('Error fetching programs:', error);
        res.status(500).json({ error: 'Failed to fetch programs' });
    }
});

app.get('/api/v1/programs/:id', (req, res) => {
    try {
        const programId = req.params.id;
        const programsPath = path.join(__dirname, 'data', 'programs.json');
        const programs = readJSONFile(programsPath);

        const program = programs.find(p => p.id === programId);
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        res.json(program);
    } catch (error) {
        console.error('Error fetching program:', error);
        res.status(500).json({ error: 'Failed to fetch program' });
    }
});

// ==================== APPLICATIONS ENDPOINTS ====================
app.get('/api/v1/admission/applications', (req, res) => {
    try {
        const applicationsPath = path.join(__dirname, 'data', 'applications.json');
        const applications = readJSONFile(applicationsPath);
        const studentsPath = path.join(__dirname, 'data', 'students.json');
        const students = readJSONFile(studentsPath);

        const enrichedApplications = applications.map(app => {
            const student = students.find(s => s.student_id === app.student_id);
            return {
                ...app,
                student_name: student ? student.full_name : 'Unknown',
                student_email: student ? student.email : 'Unknown'
            };
        });

        res.json({
            count: applications.length,
            applications: enrichedApplications
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

app.post('/api/v1/admission/applications', validateApplication, (req, res) => {
    try {
        const { student_id, program_code, admission_cycle, remarks } = req.body;

        const applicationsPath = path.join(__dirname, 'data', 'applications.json');
        const applications = readJSONFile(applicationsPath);
        const studentsPath = path.join(__dirname, 'data', 'students.json');
        const students = readJSONFile(studentsPath);

        const student = students.find(s => s.student_id === student_id);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const existingApplication = applications.find(app =>
            app.student_id === student_id &&
            app.program_code === program_code &&
            app.admission_cycle === admission_cycle
        );

        if (existingApplication) {
            return res.status(409).json({
                error: 'Student already has an application for this program in the selected admission cycle'
            });
        }

        const newApplication = {
            id: generateApplicationId(),
            student_id,
            program_code,
            admission_cycle,
            remarks: remarks || '',
            application_status: 'PENDING',
            payment_status: 'UNPAID',
            submission_date: new Date().toISOString(),
            review_date: null,
            decision_date: null,
            reviewed_by: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        applications.push(newApplication);

        if (writeJSONFile(applicationsPath, applications)) {
            res.status(201).json({
                message: 'Application submitted successfully',
                application: newApplication,
                student_info: {
                    name: student.full_name,
                    email: student.email
                }
            });
        } else {
            throw new Error('Failed to save application');
        }
    } catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

app.get('/api/v1/admission/applications/:id', (req, res) => {
    try {
        const applicationId = req.params.id;
        const applicationsPath = path.join(__dirname, 'data', 'applications.json');
        const applications = readJSONFile(applicationsPath);

        const application = applications.find(app => app.id === applicationId);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const studentsPath = path.join(__dirname, 'data', 'students.json');
        const students = readJSONFile(studentsPath);
        const student = students.find(s => s.student_id === application.student_id);

        const programsPath = path.join(__dirname, 'data', 'programs.json');
        const programs = readJSONFile(programsPath);
        const program = programs.find(p => p.id === application.program_code);

        const subjectsPath = path.join(__dirname, 'data', 'application_subjects.json');
        const allSubjects = readJSONFile(subjectsPath);
        const applicationSubjects = allSubjects.filter(subject => subject.application_id === applicationId);

        const documentsPath = path.join(__dirname, 'data', 'admission_documents.json');
        const allDocuments = readJSONFile(documentsPath);
        const applicationDocuments = allDocuments.filter(doc => doc.application_id === applicationId);

        const enrichedApplication = {
            ...application,
            student_info: student ? {
                student_id: student.student_id,
                name: student.full_name,
                email: student.email,
                phone: student.phone
            } : null,
            program_info: program ? {
                name: program.name,
                description: program.description,
                duration: program.duration
            } : null,
            subjects: applicationSubjects,
            documents: applicationDocuments
        };

        res.json(enrichedApplication);
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: 'Failed to fetch application' });
    }
});

app.get('/api/v1/students/:student_id/applications', (req, res) => {
    try {
        const studentId = req.params.student_id;
        const applicationsPath = path.join(__dirname, 'data', 'applications.json');
        const applications = readJSONFile(applicationsPath);

        const studentApplications = applications.filter(app => app.student_id === studentId);
        const programsPath = path.join(__dirname, 'data', 'programs.json');
        const programs = readJSONFile(programsPath);

        const enrichedApplications = studentApplications.map(app => {
            const program = programs.find(p => p.id === app.program_code);
            return {
                ...app,
                program_name: program ? program.name : 'Unknown Program'
            };
        });

        res.json({
            count: studentApplications.length,
            applications: enrichedApplications
        });
    } catch (error) {
        console.error('Error fetching student applications:', error);
        res.status(500).json({ error: 'Failed to fetch student applications' });
    }
});

// ==================== APPLICATION SUBJECTS ENDPOINTS ====================
app.get('/api/v1/admission/applications/:applicationId/subjects', (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const subjectsPath = path.join(__dirname, 'data', 'application_subjects.json');
        const allSubjects = readJSONFile(subjectsPath);
        const applicationSubjects = allSubjects.filter(subject => subject.application_id === applicationId);

        res.json({
            count: applicationSubjects.length,
            application_id: applicationId,
            subjects: applicationSubjects
        });
    } catch (error) {
        console.error('Error fetching application subjects:', error);
        res.status(500).json({ error: 'Failed to fetch application subjects' });
    }
});

app.post('/api/v1/admission/applications/:applicationId/subjects', validateApplicationSubject, (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const { subject_code, preference_order } = req.body;

        const applicationsPath = path.join(__dirname, 'data', 'applications.json');
        const applications = readJSONFile(applicationsPath);

        const application = applications.find(app => app.id === applicationId);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const subjectsPath = path.join(__dirname, 'data', 'application_subjects.json');
        let applicationSubjects = readJSONFile(subjectsPath);

        const newApplicationSubject = {
            id: generateApplicationSubjectId(),
            application_id: applicationId,
            subject_code: subject_code,
            preference_order: preference_order || 1,
            is_approved: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        applicationSubjects.push(newApplicationSubject);

        if (writeJSONFile(subjectsPath, applicationSubjects)) {
            res.status(201).json({
                message: 'Subject added to application successfully',
                application_subject: newApplicationSubject
            });
        } else {
            throw new Error('Failed to save application subject');
        }
    } catch (error) {
        console.error('Error adding subject to application:', error);
        res.status(500).json({ error: 'Failed to add subject to application' });
    }
});

app.put('/api/v1/admission/application-subjects/:id/approve', (req, res) => {
    try {
        const subjectId = req.params.id;
        const { is_approved } = req.body;

        if (is_approved === undefined) {
            return res.status(400).json({
                error: 'is_approved field is required (true/false)'
            });
        }

        const subjectsPath = path.join(__dirname, 'data', 'application_subjects.json');
        let subjects = readJSONFile(subjectsPath);

        const subjectIndex = subjects.findIndex(s => s.id === subjectId);
        if (subjectIndex === -1) {
            return res.status(404).json({ error: 'Application subject not found' });
        }

        subjects[subjectIndex].is_approved = is_approved;
        subjects[subjectIndex].updated_at = new Date().toISOString();

        if (writeJSONFile(subjectsPath, subjects)) {
            res.json({
                message: 'Application subject approval status updated',
                application_subject: subjects[subjectIndex]
            });
        } else {
            throw new Error('Failed to update application subject');
        }
    } catch (error) {
        console.error('Error updating application subject:', error);
        res.status(500).json({ error: 'Failed to update application subject' });
    }
});

// ==================== ADMISSION DOCUMENTS ENDPOINTS ====================
app.get('/api/v1/admission/applications/:applicationId/documents', (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const documentsPath = path.join(__dirname, 'data', 'admission_documents.json');
        const allDocuments = readJSONFile(documentsPath);
        const applicationDocuments = allDocuments.filter(doc => doc.application_id === applicationId);

        res.json({
            count: applicationDocuments.length,
            application_id: applicationId,
            documents: applicationDocuments
        });
    } catch (error) {
        console.error('Error fetching application documents:', error);
        res.status(500).json({ error: 'Failed to fetch application documents' });
    }
});

app.post('/api/v1/admission/applications/:applicationId/documents', validateDocument, (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const { document_type, file_reference, verification_status } = req.body;

        const applicationsPath = path.join(__dirname, 'data', 'applications.json');
        const applications = readJSONFile(applicationsPath);

        const application = applications.find(app => app.id === applicationId);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const documentsPath = path.join(__dirname, 'data', 'admission_documents.json');
        let admissionDocuments = readJSONFile(documentsPath);

        const newDocument = {
            id: generateDocumentId(),
            application_id: applicationId,
            document_type: document_type,
            file_reference: file_reference,
            verification_status: verification_status || 'PENDING',
            uploaded_at: new Date().toISOString(),
            verified_at: null,
            remarks: ''
        };

        admissionDocuments.push(newDocument);

        if (writeJSONFile(documentsPath, admissionDocuments)) {
            res.status(201).json({
                message: 'Document added successfully',
                document: newDocument
            });
        } else {
            throw new Error('Failed to save document');
        }
    } catch (error) {
        console.error('Error adding document:', error);
        res.status(500).json({ error: 'Failed to add document' });
    }
});

app.put('/api/v1/admission/documents/:documentId/verify', (req, res) => {
    try {
        const documentId = req.params.documentId;
        const { verification_status, remarks } = req.body;

        if (!verification_status) {
            return res.status(400).json({
                error: 'Missing required field: verification_status'
            });
        }

        const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED'];
        if (!validStatuses.includes(verification_status)) {
            return res.status(400).json({
                error: 'Invalid status. Must be: PENDING, VERIFIED, or REJECTED'
            });
        }

        const documentsPath = path.join(__dirname, 'data', 'admission_documents.json');
        let documents = readJSONFile(documentsPath);

        const documentIndex = documents.findIndex(doc => doc.id === documentId);
        if (documentIndex === -1) {
            return res.status(404).json({ error: 'Document not found' });
        }

        documents[documentIndex].verification_status = verification_status;
        documents[documentIndex].remarks = remarks || '';
        documents[documentIndex].verified_at = verification_status !== 'PENDING' ? new Date().toISOString() : null;
        documents[documentIndex].updated_at = new Date().toISOString();

        if (writeJSONFile(documentsPath, documents)) {
            res.json({
                message: 'Document verification status updated',
                document: documents[documentIndex]
            });
        } else {
            throw new Error('Failed to update document');
        }
    } catch (error) {
        console.error('Error verifying document:', error);
        res.status(500).json({ error: 'Failed to verify document' });
    }
});

// ==================== SUBJECTS ENDPOINTS ====================
app.get('/api/v1/subjects', (req, res) => {
    try {
        const subjectsPath = path.join(__dirname, 'data', 'subjects.json');
        const subjects = readJSONFile(subjectsPath);

        res.json({
            count: subjects.length,
            subjects: subjects
        });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

app.get('/api/v1/programs/:programId/subjects', (req, res) => {
    try {
        const programId = req.params.programId;
        const subjectsPath = path.join(__dirname, 'data', 'subjects.json');
        const subjects = readJSONFile(subjectsPath);

        const programSubjects = subjects.filter(subject => subject.program_id === programId);

        res.json({
            count: programSubjects.length,
            program_id: programId,
            subjects: programSubjects
        });
    } catch (error) {
        console.error('Error fetching program subjects:', error);
        res.status(500).json({ error: 'Failed to fetch program subjects' });
    }
});

// ==================== ADMISSION CYCLES ENDPOINTS ====================
app.get('/api/v1/admission-cycles', (req, res) => {
    try {
        const cyclesPath = path.join(__dirname, 'data', 'admission_cycles.json');
        const cycles = readJSONFile(cyclesPath);

        res.json({
            count: cycles.length,
            admission_cycles: cycles
        });
    } catch (error) {
        console.error('Error fetching admission cycles:', error);
        res.status(500).json({ error: 'Failed to fetch admission cycles' });
    }
});

app.get('/api/v1/admission-cycles/active', (req, res) => {
    try {
        const cyclesPath = path.join(__dirname, 'data', 'admission_cycles.json');
        const cycles = readJSONFile(cyclesPath);

        const activeCycles = cycles.filter(cycle => cycle.is_active === true);

        res.json({
            count: activeCycles.length,
            admission_cycles: activeCycles
        });
    } catch (error) {
        console.error('Error fetching active admission cycles:', error);
        res.status(500).json({ error: 'Failed to fetch active admission cycles' });
    }
});

// ==================== DASHBOARD & STATISTICS ====================
app.get('/api/v1/dashboard/stats', (req, res) => {
    try {
        const stats = {
            total_students: 0,
            total_applications: 0,
            total_programs: 0,
            applications_by_status: {},
            applications_by_program: {}
        };

        const studentsPath = path.join(__dirname, 'data', 'students.json');
        const students = readJSONFile(studentsPath);
        stats.total_students = students.length;

        const applicationsPath = path.join(__dirname, 'data', 'applications.json');
        const applications = readJSONFile(applicationsPath);
        stats.total_applications = applications.length;

        applications.forEach(app => {
            stats.applications_by_status[app.application_status] =
                (stats.applications_by_status[app.application_status] || 0) + 1;
            stats.applications_by_program[app.program_code] =
                (stats.applications_by_program[app.program_code] || 0) + 1;
        });

        const programsPath = path.join(__dirname, 'data', 'programs.json');
        const programs = readJSONFile(programsPath);
        stats.total_programs = programs.length;

        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// ==================== 404 HANDLER ====================
app.use('*', (req, res) => {
    console.log(`404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: [
            'GET /health',
            'GET /api/test',
            'POST /api/v1/auth/register',
            'POST /api/v1/auth/login',
            'GET /api/v1/students',
            'GET /api/v1/students/:id',
            'PUT /api/v1/students/:id',
            'DELETE /api/v1/students/:id',
            'GET /api/v1/students/search',
            'GET /api/v1/students/:student_id/applications',
            'GET /api/v1/programs',
            'GET /api/v1/programs/:id',
            'GET /api/v1/subjects',
            'GET /api/v1/programs/:programId/subjects',
            'GET /api/v1/admission-cycles',
            'GET /api/v1/admission-cycles/active',
            'GET /api/v1/admission/applications',
            'POST /api/v1/admission/applications',
            'GET /api/v1/admission/applications/:id',
            'GET /api/v1/admission/applications/:applicationId/subjects',
            'POST /api/v1/admission/applications/:applicationId/subjects',
            'PUT /api/v1/admission/application-subjects/:id/approve',
            'GET /api/v1/admission/applications/:applicationId/documents',
            'POST /api/v1/admission/applications/:applicationId/documents',
            'PUT /api/v1/admission/documents/:documentId/verify',
            'GET /api/v1/dashboard/stats'
        ]
    });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;