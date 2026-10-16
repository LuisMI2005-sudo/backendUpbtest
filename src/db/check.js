const pool = require('../config/db');

async function check() {
    try {
        if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en .env o en las variables del servicio.');
        const { rows } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'productos'");
        const columns = new Set(rows.map(row => row.column_name));
        const missing = ['id', 'nombre', 'precio', 'stock', 'created_at'].filter(name => !columns.has(name));
        if (missing.length) throw new Error(`Faltan tabla o columnas: ${missing.join(', ')}. Revisa src/db/schema.sql y ejecuta npm run db:init si la tabla no existe.`);
        await pool.query('SELECT id, nombre, precio, stock, created_at FROM productos LIMIT 0');
        console.log('PostgreSQL accesible; tabla productos y permiso de lectura verificados.');
    } catch (err) {
        console.error('Diagnóstico de PostgreSQL:', err.code || 'CONFIG_SCHEMA_ERROR');
        if (err.code === 'ENOTFOUND') console.error('El host no se resuelve. Para conectar desde tu PC a Render, usa la External Database URL del panel de la base.');
        else if (err.code === '28P01') console.error('Credenciales de PostgreSQL incorrectas.');
        else if (err.code === 'ECONNREFUSED') console.error('El servidor rechaza la conexión. Revisa host, puerto y disponibilidad.');
        else if (!process.env.DATABASE_URL || !err.code) console.error(err.message);
        else console.error('Revisa la disponibilidad, SSL, permisos y configuración de la base.');
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

check();
