import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUERY_DIR = path.join(__dirname, 'queries');

export const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error', err);
});

const sqlCache = new Map();

export function loadSql(name) {
  if (sqlCache.has(name)) return sqlCache.get(name);
  const filePath = path.join(QUERY_DIR, `${name}.sql`);
  const sql = fs.readFileSync(filePath, 'utf8');
  sqlCache.set(name, sql);
  return sql;
}

export async function pingDb() {
  const { rows } = await pool.query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}
