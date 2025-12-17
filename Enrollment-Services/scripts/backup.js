#!/usr/bin/env node

import { getStorageManager } from '../src/infrastructure/storage/storage-manager.js';

async function runBackup() {
  console.log('🚀 Starting manual backup...');
  
  try {
    const storageManager = getStorageManager();
    const results = await storageManager.backupAllCollections();
    
    console.log('✅ Backup completed successfully');
    console.log('📊 Results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

runBackup();