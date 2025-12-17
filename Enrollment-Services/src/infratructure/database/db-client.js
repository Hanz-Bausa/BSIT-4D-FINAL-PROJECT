import pg from 'pg';
const { Pool } = pg;

export class DatabaseClient {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.ADMISSION_DB_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }

    async query(text, params = []) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            console.log(`Executed query in ${duration}ms: ${text.substring(0, 100)}...`);
            return result;
        } catch (error) {
            console.error('Database query error:', error);
            throw new Error(`Database operation failed: ${error.message}`);
        }
    }

    async getClient() {
        const client = await this.pool.connect();
        return client;
    }

    async healthCheck() {
        try {
            await this.pool.query('SELECT 1');
            return { healthy: true, timestamp: new Date().toISOString() };
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }
}