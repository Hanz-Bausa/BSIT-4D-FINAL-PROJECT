import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JSONStorage {
    constructor(fileName) {
        // Go up from infrastructure/storage to src/data
        this.dataDir = path.join(__dirname, '..', '..', '..', 'data');
        this.filePath = path.join(this.dataDir, fileName);
        this.ensureDataDirectory();
        this.ensureFileExists();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
            console.log(`📁 Created data directory: ${this.dataDir}`);
        }
    }

    ensureFileExists() {
        if (!fs.existsSync(this.filePath)) {
            const isObjectFile = fileName =>
                fileName.includes('backup') ||
                fileName.includes('config') ||
                fileName === 'stats.json';

            const initialData = isObjectFile(this.filePath) ? {} : [];
            fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2));
            console.log(`📄 Created data file: ${path.basename(this.filePath)}`);
        }
    }

    async read() {
        try {
            if (!fs.existsSync(this.filePath)) {
                this.ensureFileExists();
            }

            const data = fs.readFileSync(this.filePath, 'utf8');

            if (!data || data.trim() === '') {
                return this.filePath.includes('backup') ? {} : [];
            }

            return JSON.parse(data);
        } catch (error) {
            console.error(`❌ Error reading ${path.basename(this.filePath)}:`, error.message);
            return this.filePath.includes('backup') ? {} : [];
        }
    }

    async write(data) {
        try {
            // Create backup before writing
            await this.createBackup();

            fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
            console.log(`💾 Successfully wrote to ${path.basename(this.filePath)}`);
            return true;
        } catch (error) {
            console.error(`❌ Error writing to ${path.basename(this.filePath)}:`, error.message);
            throw error;
        }
    }

    async createBackup() {
        try {
            if (!fs.existsSync(this.filePath)) return;

            const backupDir = path.join(this.dataDir, 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = path.basename(this.filePath, '.json');
            const backupPath = path.join(backupDir, `${fileName}_${timestamp}.json`);

            const data = fs.readFileSync(this.filePath, 'utf8');
            fs.writeFileSync(backupPath, data);

            return backupPath;
        } catch (error) {
            console.error('Error creating backup:', error);
        }
    }

    async findById(id) {
        const data = await this.read();
        if (Array.isArray(data)) {
            return data.find(item =>
                item.id === id ||
                item.application_id === id ||
                item.document_id === id ||
                item.subject_id === id
            );
        }
        return data[id];
    }

    async findOne(query) {
        const data = await this.read();
        if (!Array.isArray(data)) return null;

        return data.find(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });
    }

    async find(query = {}) {
        const data = await this.read();
        if (!Array.isArray(data)) return [];

        if (Object.keys(query).length === 0) {
            return data;
        }

        return data.filter(item => {
            return Object.keys(query).every(key => item[key] === query[key]);
        });
    }

    async create(newItem) {
        const data = await this.read();

        if (Array.isArray(data)) {
            const itemWithId = {
                id: this.generateId(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...newItem
            };
            data.push(itemWithId);
            await this.write(data);
            return itemWithId;
        } else {
            // For object-based storage
            const id = this.generateId();
            data[id] = {
                id,
                created_at: new Date().toISOString(),
                ...newItem
            };
            await this.write(data);
            return data[id];
        }
    }

    async update(id, updates, idField = 'id') {
        const data = await this.read();

        if (Array.isArray(data)) {
            const index = data.findIndex(item =>
                item[idField] === id ||
                item.id === id
            );

            if (index === -1) return null;

            data[index] = {
                ...data[index],
                ...updates,
                updated_at: new Date().toISOString()
            };

            await this.write(data);
            return data[index];
        } else {
            if (!data[id]) return null;

            data[id] = {
                ...data[id],
                ...updates,
                updated_at: new Date().toISOString()
            };

            await this.write(data);
            return data[id];
        }
    }

    async delete(id, idField = 'id') {
        const data = await this.read();

        if (Array.isArray(data)) {
            const initialLength = data.length;
            const filteredData = data.filter(item =>
                !(item[idField] === id || item.id === id)
            );

            if (filteredData.length === initialLength) return false;

            await this.write(filteredData);
            return true;
        } else {
            if (!data[id]) return false;

            delete data[id];
            await this.write(data);
            return true;
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    }

    async count() {
        const data = await this.read();
        return Array.isArray(data) ? data.length : Object.keys(data).length;
    }

    async clear() {
        const initialData = this.filePath.includes('backup') ? {} : [];
        await this.write(initialData);
    }

    async search(query, fields = []) {
        const data = await this.read();
        if (!Array.isArray(data)) return [];

        const lowerQuery = query.toLowerCase();

        return data.filter(item => {
            if (fields.length > 0) {
                return fields.some(field =>
                    item[field] &&
                    item[field].toString().toLowerCase().includes(lowerQuery)
                );
            }

            return Object.values(item).some(value =>
                value &&
                value.toString().toLowerCase().includes(lowerQuery)
            );
        });
    }
}

export default JSONStorage;