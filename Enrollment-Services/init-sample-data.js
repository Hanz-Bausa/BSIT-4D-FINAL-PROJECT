const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Sample Programs
const programs = [
  {
    id: "CS101",
    name: "Computer Science",
    description: "Bachelor of Science in Computer Science",
    duration: "4 years",
    credits_required: 120,
    available_seats: 50,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "BBA202",
    name: "Business Administration",
    description: "Bachelor of Business Administration",
    duration: "3 years",
    credits_required: 90,
    available_seats: 75,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "ENG303",
    name: "Electrical Engineering",
    description: "Bachelor of Engineering in Electrical",
    duration: "4 years",
    credits_required: 130,
    available_seats: 40,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Sample Subjects
const subjects = [
  {
    id: "MATH101",
    name: "Calculus I",
    credits: 3,
    program_id: "CS101",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "PROG101",
    name: "Introduction to Programming",
    credits: 4,
    program_id: "CS101",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "BUS101",
    name: "Principles of Management",
    credits: 3,
    program_id: "BBA202",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "EE101",
    name: "Circuit Theory",
    credits: 4,
    program_id: "ENG303",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Sample Admission Cycles
const admissionCycles = [
  {
    id: "CYCLE2024-1",
    name: "Fall 2024",
    start_date: "2024-09-01",
    end_date: "2024-12-15",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "CYCLE2024-2",
    name: "Spring 2024",
    start_date: "2024-01-15",
    end_date: "2024-05-30",
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "CYCLE2025-1",
    name: "Fall 2025",
    start_date: "2025-09-01",
    end_date: "2025-12-15",
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Write to files
fs.writeFileSync(path.join(dataDir, 'programs.json'), JSON.stringify(programs, null, 2));
fs.writeFileSync(path.join(dataDir, 'subjects.json'), JSON.stringify(subjects, null, 2));
fs.writeFileSync(path.join(dataDir, 'admission_cycles.json'), JSON.stringify(admissionCycles, null, 2));
fs.writeFileSync(path.join(dataDir, 'application_subjects.json'), JSON.stringify([], null, 2));
fs.writeFileSync(path.join(dataDir, 'admission_documents.json'), JSON.stringify([], null, 2));
fs.writeFileSync(path.join(dataDir, 'applications.json'), JSON.stringify([], null, 2));

console.log('✅ Sample data created successfully!');
console.log('📁 Files created in:', dataDir);