require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), quiet: true });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 8000,
});

// Un cliente inactivo también puede perder la conexión.
pool.on('error', (err) => console.error('Conexión PostgreSQL interrumpida:', err.code || 'UNKNOWN'));

module.exports = pool;
