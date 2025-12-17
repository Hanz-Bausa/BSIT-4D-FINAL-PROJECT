#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import JSONStorage from '../src/infrastructure/storage/json-storage.js';

async function importFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('❌ Import file not found:', filePath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  for (const [collectionName, collectionData] of Object.entries(data)) {
    console.log(`📥 Importing ${collectionName}...`);
    
    const storage = new JSONStorage(`${collectionName}.json`);
    await storage.write(collectionData);
    
    console.log(`✅ Imported ${Array.isArray(collectionData) ? collectionData.length : Object.keys(collectionData).length} records`);
  }
}

// Command line usage: node scripts/import-data.js ./path/to/export.json
const importFilePath = process.argv[2];
if (importFilePath) {
  importFromFile(path.resolve(importFilePath));
} else {
  console.log('Usage: node scripts/import-data.js <export-file-path>');
}