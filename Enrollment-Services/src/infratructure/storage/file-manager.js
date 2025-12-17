import fs from 'fs';
import path from 'path';

export class FileManager {
  constructor() {
    this.baseDir = path.join(process.cwd(), 'src', 'data');
    this.ensureDirectory(this.baseDir);
  }

  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  getCollectionPath(collectionName) {
    return path.join(this.baseDir, `${collectionName}.json`);
  }

  async readCollection(collectionName) {
    const filePath = this.getCollectionPath(collectionName);
    
    try {
      if (!fs.existsSync(filePath)) {
        return [];
      }
      
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${collectionName}:`, error);
      return [];
    }
  }

  async writeCollection(collectionName, data) {
    const filePath = this.getCollectionPath(collectionName);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${collectionName}:`, error);
      throw error;
    }
  }

  async appendToCollection(collectionName, newItem) {
    const collection = await this.readCollection(collectionName);
    collection.push(newItem);
    await this.writeCollection(collectionName, collection);
    return newItem;
  }

  async updateInCollection(collectionName, id, updates) {
    const collection = await this.readCollection(collectionName);
    const index = collection.findIndex(item => item.id === id);
    
    if (index === -1) return null;
    
    collection[index] = { ...collection[index], ...updates };
    await this.writeCollection(collectionName, collection);
    return collection[index];
  }

  async deleteFromCollection(collectionName, id) {
    const collection = await this.readCollection(collectionName);
    const filtered = collection.filter(item => item.id !== id);
    
    if (filtered.length === collection.length) return false;
    
    await this.writeCollection(collectionName, filtered);
    return true;
  }

  async findInCollection(collectionName, query) {
    const collection = await this.readCollection(collectionName);
    
    return collection.find(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
  }

  async filterCollection(collectionName, query) {
    const collection = await this.readCollection(collectionName);
    
    return collection.filter(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
  }

  async getCollectionStats(collectionName) {
    const collection = await this.readCollection(collectionName);
    return {
      count: collection.length,
      lastUpdated: new Date().toISOString(),
      fileSize: fs.statSync(this.getCollectionPath(collectionName)).size
    };
  }
}

export default FileManager;