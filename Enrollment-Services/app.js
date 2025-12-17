const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

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
        'applications.json',
        'application_subjects.json',
        'admission_documents.json',
        'programs.json',
        'subjects.json',
        'admission_cycles.json'
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

// ==================== HEALTH & TEST ====================
app.get('/health', (req, res) => {
    const dataDir = path.join(__dirname, 'data');
    let storageInfo = { initialized: false };
    
    try {
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
        storageInfo = {
            initialized: true,
            fileCount: files.length,
            files: files
        };
    } catch (error) {
        storageInfo.error = error.message;
    }
    
    res.json({
        status: 'healthy',
        service: 'university-admission-system',
        storage: storageInfo,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'API is working!',
        endpoints: {
            health: '/health',
            test: '/api/test'
        }
    });
});

// ==================== PROGRAMS ENDPOINTS ====================
app.get('/api/v1/programs', (req, res) => {
    console.log('GET /api/v1/programs called');
    try {
        const dataPath = path.join(__dirname, 'data', 'programs.json');
        console.log('Reading from:', dataPath);
        
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            console.log('Raw data:', data.substring(0, 200));
            const programs = JSON.parse(data);
            console.log(`Found ${programs.length} programs`);
            
            res.json({
                count: programs.length,
                programs: programs
            });
        } else {
            console.log('File not found, returning empty');
            res.json({
                count: 0,
                programs: [],
                message: 'No programs found'
            });
        }
    } catch (error) {
        console.error('Error in GET /api/v1/programs:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v1/programs/:id', (req, res) => {
    try {
        const programId = req.params.id;
        console.log(`GET /api/v1/programs/${programId} called`);
        
        const dataPath = path.join(__dirname, 'data', 'programs.json');
        if (!fs.existsSync(dataPath)) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        const data = fs.readFileSync(dataPath, 'utf8');
        const programs = JSON.parse(data);
        const program = programs.find(p => p.id === programId);
        
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        res.json(program);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v1/programs', (req, res) => {
    try {
        const { id, name, description, duration, credits_required, available_seats } = req.body;

        if (!id || !name) {
            return res.status(400).json({
                error: 'Missing required fields: id and name are required'
            });
        }

        const dataPath = path.join(__dirname, 'data', 'programs.json');
        let programs = [];

        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            programs = JSON.parse(data);
        }

        const existingProgram = programs.find(p => p.id === id);
        if (existingProgram) {
            return res.status(409).json({
                error: `Program with id ${id} already exists`
            });
        }

        const newProgram = {
            id,
            name,
            description: description || '',
            duration: duration || '4 years',
            credits_required: credits_required || 120,
            available_seats: available_seats || 50,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        programs.push(newProgram);
        fs.writeFileSync(dataPath, JSON.stringify(programs, null, 2));

        res.status(201).json({
            message: 'Program created successfully',
            program: newProgram
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SUBJECTS ENDPOINTS ====================
app.get('/api/v1/subjects', (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'subjects.json');
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            const subjects = JSON.parse(data);
            res.json({
                count: subjects.length,
                subjects: subjects
            });
        } else {
            res.json({
                count: 0,
                subjects: [],
                message: 'No subjects found'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v1/programs/:programId/subjects', (req, res) => {
    try {
        const programId = req.params.programId;
        const dataPath = path.join(__dirname, 'data', 'subjects.json');

        if (!fs.existsSync(dataPath)) {
            return res.json({
                count: 0,
                subjects: [],
                programId: programId
            });
        }

        const data = fs.readFileSync(dataPath, 'utf8');
        const allSubjects = JSON.parse(data);
        const subjects = allSubjects.filter(subject => subject.program_id === programId);

        res.json({
            count: subjects.length,
            programId: programId,
            subjects: subjects
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v1/subjects', (req, res) => {
    try {
        const { id, name, credits, program_id } = req.body;

        if (!id || !name || !program_id) {
            return res.status(400).json({
                error: 'Missing required fields: id, name, and program_id are required'
            });
        }

        const dataPath = path.join(__dirname, 'data', 'subjects.json');
        let subjects = [];

        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            subjects = JSON.parse(data);
        }

        const newSubject = {
            id,
            name,
            credits: credits || 3,
            program_id,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        subjects.push(newSubject);
        fs.writeFileSync(dataPath, JSON.stringify(subjects, null, 2));

        res.status(201).json({
            message: 'Subject created successfully',
            subject: newSubject
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMISSION CYCLES ENDPOINTS ====================
app.get('/api/v1/admission-cycles', (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'admission_cycles.json');
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            const cycles = JSON.parse(data);
            res.json({
                count: cycles.length,
                admission_cycles: cycles
            });
        } else {
            res.json({
                count: 0,
                admission_cycles: [],
                message: 'No admission cycles found'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v1/admission-cycles/active', (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'admission_cycles.json');
        if (!fs.existsSync(dataPath)) {
            return res.json({
                count: 0,
                admission_cycles: []
            });
        }

        const data = fs.readFileSync(dataPath, 'utf8');
        const allCycles = JSON.parse(data);
        const activeCycles = allCycles.filter(cycle => cycle.is_active === true);

        res.json({
            count: activeCycles.length,
            admission_cycles: activeCycles
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== APPLICATIONS ENDPOINTS ====================
app.get('/api/v1/admission/applications', (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'applications.json');
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            const applications = JSON.parse(data);
            res.json({
                count: applications.length,
                applications: applications
            });
        } else {
            res.json({
                count: 0,
                applications: [],
                message: 'No applications yet'
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v1/admission/applications', (req, res) => {
    try {
        const { candidateId, programCode, admissionCycle } = req.body;

        if (!candidateId || !programCode || !admissionCycle) {
            return res.status(400).json({
                error: 'Missing required fields: candidateId, programCode, admissionCycle'
            });
        }

        const dataPath = path.join(__dirname, 'data', 'applications.json');
        let applications = [];

        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            applications = JSON.parse(data);
        }

        const newApplication = {
            id: 'APP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            candidate_id: candidateId,
            program_code: programCode,
            admission_cycle: admissionCycle,
            application_status: 'SUBMITTED',
            fee_status: 'PENDING',
            applied_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        applications.push(newApplication);
        fs.writeFileSync(dataPath, JSON.stringify(applications, null, 2));

        res.status(201).json({
            message: 'Application submitted successfully',
            application: newApplication
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/v1/admission/applications/:id', (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'data', 'applications.json');
        if (!fs.existsSync(dataPath)) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const data = fs.readFileSync(dataPath, 'utf8');
        const applications = JSON.parse(data);
        const application = applications.find(app => app.id === req.params.id);

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json(application);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== APPLICATION SUBJECTS ENDPOINTS ====================
app.get('/api/v1/admission/applications/:applicationId/subjects', (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const dataPath = path.join(__dirname, 'data', 'application_subjects.json');

        if (!fs.existsSync(dataPath)) {
            return res.json({
                count: 0,
                application_id: applicationId,
                subjects: []
            });
        }

        const data = fs.readFileSync(dataPath, 'utf8');
        const allSubjects = JSON.parse(data);
        const applicationSubjects = allSubjects.filter(subject => subject.application_id === applicationId);

        res.json({
            count: applicationSubjects.length,
            application_id: applicationId,
            subjects: applicationSubjects
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v1/admission/applications/:applicationId/subjects', (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const { subject_code, preference_order } = req.body;

        if (!subject_code) {
            return res.status(400).json({
                error: 'Missing required field: subject_code'
            });
        }

        const dataPath = path.join(__dirname, 'data', 'application_subjects.json');
        let applicationSubjects = [];

        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            applicationSubjects = JSON.parse(data);
        }

        const newApplicationSubject = {
            id: 'ASUB-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            application_id: applicationId,
            subject_code: subject_code,
            preference_order: preference_order || 1,
            is_approved: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        applicationSubjects.push(newApplicationSubject);
        fs.writeFileSync(dataPath, JSON.stringify(applicationSubjects, null, 2));

        res.status(201).json({
            message: 'Subject added to application successfully',
            application_subject: newApplicationSubject
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ADMISSION DOCUMENTS ENDPOINTS ====================
app.get('/api/v1/admission/applications/:applicationId/documents', (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const dataPath = path.join(__dirname, 'data', 'admission_documents.json');

        if (!fs.existsSync(dataPath)) {
            return res.json({
                count: 0,
                application_id: applicationId,
                documents: []
            });
        }

        const data = fs.readFileSync(dataPath, 'utf8');
        const allDocuments = JSON.parse(data);
        const applicationDocuments = allDocuments.filter(doc => doc.application_id === applicationId);

        res.json({
            count: applicationDocuments.length,
            application_id: applicationId,
            documents: applicationDocuments
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/v1/admission/applications/:applicationId/documents', (req, res) => {
    try {
        const applicationId = req.params.applicationId;
        const { document_type, file_reference, verification_status } = req.body;

        if (!document_type || !file_reference) {
            return res.status(400).json({
                error: 'Missing required fields: document_type and file_reference'
            });
        }

        const dataPath = path.join(__dirname, 'data', 'admission_documents.json');
        let admissionDocuments = [];

        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            admissionDocuments = JSON.parse(data);
        }

        const newDocument = {
            id: 'DOC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            application_id: applicationId,
            document_type: document_type,
            file_reference: file_reference,
            verification_status: verification_status || 'PENDING',
            uploaded_at: new Date().toISOString(),
            verified_at: null,
            remarks: ''
        };

        admissionDocuments.push(newDocument);
        fs.writeFileSync(dataPath, JSON.stringify(admissionDocuments, null, 2));

        res.status(201).json({
            message: 'Document added successfully',
            document: newDocument
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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

        const dataPath = path.join(__dirname, 'data', 'admission_documents.json');
        if (!fs.existsSync(dataPath)) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const data = fs.readFileSync(dataPath, 'utf8');
        let documents = JSON.parse(data);

        const documentIndex = documents.findIndex(doc => doc.id === documentId);
        if (documentIndex === -1) {
            return res.status(404).json({ error: 'Document not found' });
        }

        documents[documentIndex].verification_status = verification_status;
        documents[documentIndex].remarks = remarks || '';
        documents[documentIndex].verified_at = verification_status !== 'PENDING' ? new Date().toISOString() : null;
        documents[documentIndex].updated_at = new Date().toISOString();

        fs.writeFileSync(dataPath, JSON.stringify(documents, null, 2));

        res.json({
            message: 'Document verification status updated',
            document: documents[documentIndex]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
            'GET /api/v1/programs',
            'GET /api/v1/programs/:id',
            'POST /api/v1/programs',
            'GET /api/v1/subjects',
            'GET /api/v1/programs/:programId/subjects',
            'POST /api/v1/subjects',
            'GET /api/v1/admission-cycles',
            'GET /api/v1/admission-cycles/active',
            'GET /api/v1/admission/applications',
            'POST /api/v1/admission/applications',
            'GET /api/v1/admission/applications/:id',
            'GET /api/v1/admission/applications/:applicationId/subjects',
            'POST /api/v1/admission/applications/:applicationId/subjects',
            'GET /api/v1/admission/applications/:applicationId/documents',
            'POST /api/v1/admission/applications/:applicationId/documents',
            'PUT /api/v1/admission/documents/:documentId/verify'
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