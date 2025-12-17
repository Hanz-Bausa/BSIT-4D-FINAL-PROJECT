import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { gzip } from 'zlib';

const gzipAsync = promisify(gzip);

export class BackupManager {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'src', 'data', 'backups');
    this.ensureDirectory(this.backupDir);
  }

  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  async createBackup(filePath) {
    if (!fs.existsSync(filePath)) return;

    const fileName = path.basename(filePath, '.json');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${fileName}_${timestamp}.json.gz`;
    const backupPath = path.join(this.backupDir, backupFileName);

    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const compressed = await gzipAsync(data);
      fs.writeFileSync(backupPath, compressed);
      
      console.log(`📦 Backup created: ${backupFileName}`);
      this.cleanupOldBackups(fileName);
      
      return backupPath;
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  cleanupOldBackups(fileName, maxBackups = 10) {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith(fileName) && file.endsWith('.json.gz'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups);
        toDelete.forEach(backup => {
          fs.unlinkSync(backup.path);
          console.log(`🗑️  Deleted old backup: ${backup.name}`);
        });
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
    }
  }

  async restoreBackup(backupFileName) {
    const backupPath = path.join(this.backupDir, backupFileName);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    try {
      const fileName = backupFileName.split('_')[0];
      const originalPath = path.join(process.cwd(), 'src', 'data', `${fileName}.json`);
      
      const compressedData = fs.readFileSync(backupPath);
      const data = await this.decompress(compressedData);
      
      fs.writeFileSync(originalPath, data);
      console.log(`✅ Restored backup: ${backupFileName}`);
      
      return originalPath;
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }

  async decompress(data) {
    return new Promise((resolve, reject) => {
      require('zlib').gunzip(data, (error, result) => {
        if (error) reject(error);
        else resolve(result.toString());
      });
    });
  }

  listBackups() {
    try {
      return fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.json.gz'))
        .map(file => ({
          name: file,
          size: fs.statSync(path.join(this.backupDir, file)).size,
          created: fs.statSync(path.join(this.backupDir, file)).mtime
        }));
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }
}

export default BackupManager;