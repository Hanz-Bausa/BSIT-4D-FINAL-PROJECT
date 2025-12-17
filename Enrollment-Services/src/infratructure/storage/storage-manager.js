import JSONStorage from './json-storage.js';
import { BackupManager } from './backup-manager.js';

export class StorageManager {
  constructor() {
    this.collections = new Map();
    this.backupManager = new BackupManager();
    this.initializeCollections();
  }

  initializeCollections() {
    const collectionNames = [
      'applications',
      'application_subjects',
      'admission_documents',
      'programs',
      'subjects',
      'departments',
      'faculty',
      'students',
      'admission_cycles'
    ];

    collectionNames.forEach(name => {
      this.collections.set(name, new JSONStorage(`${name}.json`));
    });
  }

  getCollection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new JSONStorage(`${name}.json`));
    }
    return this.collections.get(name);
  }

  async backupAllCollections() {
    console.log('🔄 Starting full backup of all collections...');
    
    const collections = Array.from(this.collections.keys());
    const backupResults = [];

    for (const collectionName of collections) {
      try {
        const collection = this.getCollection(collectionName);
        const filePath = collection.filePath;
        const backupPath = await this.backupManager.createBackup(filePath);
        
        backupResults.push({
          collection: collectionName,
          status: 'success',
          backupPath
        });
      } catch (error) {
        backupResults.push({
          collection: collectionName,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('✅ Backup completed');
    return backupResults;
  }

  async getStorageStats() {
    const stats = {
      totalCollections: this.collections.size,
      collections: [],
      totalRecords: 0,
      totalSize: 0
    };

    for (const [name, storage] of this.collections) {
      const data = await storage.read();
      const recordCount = Array.isArray(data) ? data.length : Object.keys(data).length;
      
      stats.collections.push({
        name,
        recordCount,
        filePath: storage.filePath
      });
      
      stats.totalRecords += recordCount;
    }

    return stats;
  }

  async compactStorage() {
    console.log('🧹 Compacting storage...');
    
    for (const [name, storage] of this.collections) {
      const data = await storage.read();
      
      // Remove null/undefined values
      if (Array.isArray(data)) {
        const cleaned = data.map(item => {
          const cleanedItem = {};
          Object.keys(item).forEach(key => {
            if (item[key] !== null && item[key] !== undefined) {
              cleanedItem[key] = item[key];
            }
          });
          return cleanedItem;
        });
        
        await storage.write(cleaned);
      }
    }
    
    console.log('✅ Storage compacted');
  }

  async exportToJson(directory) {
    const fs = require('fs');
    const path = require('path');
    
    const exportDir = directory || path.join(process.cwd(), 'exports');
    
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = path.join(exportDir, `export_${timestamp}.json`);
    
    const exportData = {};

    for (const [name, storage] of this.collections) {
      exportData[name] = await storage.read();
    }

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`📤 Exported data to: ${exportPath}`);
    
    return exportPath;
  }
}

// Singleton instance
let storageManagerInstance = null;

export function getStorageManager() {
  if (!storageManagerInstance) {
    storageManagerInstance = new StorageManager();
  }
  return storageManagerInstance;
}