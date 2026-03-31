import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:RqDCmwRnwLPPvNMCloTiQIUasLSiloyi@interchange.proxy.rlwy.net:56253/railway',
    ssl: {
        rejectUnauthorized: false
    }
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize DB table
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                plate TEXT NOT NULL,
                model TEXT,
                km TEXT,
                owner TEXT,
                cpf TEXT,
                chassi TEXT,
                checks JSONB,
                photos JSONB,
                score JSONB,
                inspector JSONB,
                hash TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT DEFAULT 'admin123',
                role TEXT NOT NULL,
                status TEXT DEFAULT 'ATIVO'
            )
        `);

        // Migrations for reports table
        try {
            await pool.query(`ALTER TABLE reports RENAME COLUMN timestamp TO created_at`);
        } catch (e) { /* ignore if already renamed or doesn't exist */ }

        await pool.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);

        // Convert UUID to TEXT for id if necessary (risky but needed if we want flexibility)
        try {
            await pool.query(`ALTER TABLE reports ALTER COLUMN id TYPE TEXT`);
        } catch (e) { /* ignore if already text */ }

        // One-time cleanup (remove after run)
        await pool.query(`TRUNCATE TABLE reports`);

        // Migration: ensure password column exists for existing tables
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'admin123'`);

        // Seed initial users if table is empty
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(userCount.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO users (id, name, email, password, role, status) VALUES 
                ('ADM-001', 'Alê System', 'admin@vistoria.car', 'admin123', 'ADMINISTRADOR', 'ATIVO'),
                ('VST-245', 'Carlos Perito', 'carlos@vistoria.car', 'admin123', 'VISTORIADOR', 'ATIVO')
            `);
        }

        console.log('Database initialized and migrated');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};
initDB();

// API Routes
app.get('/api/reports', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/users', async (req, res) => {
    const { id, name, email, password, role, status } = req.body;
    try {
        await pool.query(
            `INSERT INTO users (id, name, email, password, role, status) VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, name, email, password || 'admin123', role, status]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error (maybe user exists)' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;
    try {
        if (password) {
            await pool.query(
                `UPDATE users SET name = $1, email = $2, password = $3, role = $4, status = $5 WHERE id = $6`,
                [name, email, password, role, status, id]
            );
        } else {
            await pool.query(
                `UPDATE users SET name = $1, email = $2, role = $3, status = $4 WHERE id = $5`,
                [name, email, role, status, id]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/reports', async (req, res) => {
    const { id, plate, model, km, owner, cpf, chassi, checks, photos, score, inspector, hash, timestamp } = req.body;
    try {
        console.log(`Attempting to save report: ${id} for plate: ${plate}`);
        await pool.query(
            `INSERT INTO reports (id, plate, model, km, owner, cpf, chassi, checks, photos, score, inspector, hash, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [id, plate, model, km, owner, cpf, chassi, JSON.stringify(checks), JSON.stringify(photos), JSON.stringify(score), JSON.stringify(inspector), hash, timestamp || new Date().toISOString()]
        );
        console.log(`Report ${id} saved successfully`);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Error saving report:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// For any other route (SPA Fallback), serve the index.html from dist
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
