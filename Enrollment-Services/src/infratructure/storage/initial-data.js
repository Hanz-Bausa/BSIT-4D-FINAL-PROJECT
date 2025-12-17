import JSONStorage from './json-storage.js';

export async function initializeSampleData() {
    console.log('📊 Initializing sample data...');

    const programsStorage = new JSONStorage('programs.json');

    // Sample academic programs
    const samplePrograms = [
        {
            id: 'CS101',
            name: 'Computer Science',
            description: 'Bachelor of Science in Computer Science',
            duration: '4 years',
            credits_required: 120,
            available_seats: 50,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 'BBA202',
            name: 'Business Administration',
            description: 'Bachelor of Business Administration',
            duration: '3 years',
            credits_required: 90,
            available_seats: 75,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 'ENG303',
            name: 'Electrical Engineering',
            description: 'Bachelor of Engineering in Electrical',
            duration: '4 years',
            credits_required: 130,
            available_seats: 40,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];

    try {
        // Check if programs already exist
        const existingPrograms = await programsStorage.read();
        if (existingPrograms.length === 0) {
            console.log('Creating sample programs...');
            for (const program of samplePrograms) {
                await programsStorage.create(program);
            }
            console.log('✅ Sample programs created');
        } else {
            console.log(`✅ Programs already exist (${existingPrograms.length} programs)`);
        }

        // Create reference data files if they don't exist
        const referenceFiles = [
            {
                name: 'subjects.json', data: [
                    { id: 'MATH101', name: 'Calculus I', credits: 3, program_id: 'CS101' },
                    { id: 'PROG101', name: 'Introduction to Programming', credits: 4, program_id: 'CS101' },
                    { id: 'BUS101', name: 'Principles of Management', credits: 3, program_id: 'BBA202' },
                    { id: 'EE101', name: 'Circuit Theory', credits: 4, program_id: 'ENG303' }
                ]
            },
            {
                name: 'departments.json', data: [
                    { id: 'DEPT001', name: 'Computer Science Department', head: 'Dr. Smith' },
                    { id: 'DEPT002', name: 'Business Department', head: 'Prof. Johnson' },
                    { id: 'DEPT003', name: 'Engineering Department', head: 'Dr. Williams' }
                ]
            },
            {
                name: 'faculty.json', data: [
                    { id: 'FAC001', name: 'Dr. Alice Brown', department: 'DEPT001', specialization: 'AI' },
                    { id: 'FAC002', name: 'Prof. Bob Davis', department: 'DEPT002', specialization: 'Finance' },
                    { id: 'FAC003', name: 'Dr. Carol Evans', department: 'DEPT003', specialization: 'Electronics' }
                ]
            },
            {
                name: 'admission_cycles.json', data: [
                    { id: 'CYCLE2024-1', name: 'Fall 2024', start_date: '2024-09-01', end_date: '2024-12-15', is_active: true },
                    { id: 'CYCLE2024-2', name: 'Spring 2024', start_date: '2024-01-15', end_date: '2024-05-30', is_active: false },
                    { id: 'CYCLE2025-1', name: 'Fall 2025', start_date: '2025-09-01', end_date: '2025-12-15', is_active: false }
                ]
            }
        ];

        for (const file of referenceFiles) {
            const storage = new JSONStorage(file.name);
            const existing = await storage.read();
            if (existing.length === 0) {
                console.log(`Creating ${file.name}...`);
                for (const item of file.data) {
                    await storage.create(item);
                }
                console.log(`✅ ${file.name} created`);
            }
        }

        console.log('✅ Sample data initialization complete');
        return { success: true, message: 'Sample data initialized' };
    } catch (error) {
        console.error('❌ Error initializing sample data:', error);
        return { success: false, error: error.message };
    }
}

// Run if this file is executed directly
if (process.argv[1] && process.argv[1].includes('initial-data.js')) {
    initializeSampleData().then(result => {
        console.log(result);
        process.exit(result.success ? 0 : 1);
    });
}