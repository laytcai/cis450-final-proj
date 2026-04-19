import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (v === undefined || String(v).trim() === '') {
    throw new Error(
      `Missing required env var: ${name}. Copy server/.env.example to server/.env and fill in values.`
    );
  }
  return v;
}

function parseSsl(raw) {
  if (raw === 'disable' || raw === 'false' || raw === '0') return false;
  return { rejectUnauthorized: false };
}

export const config = {
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  db: {
    host: required('PGHOST'),
    port: Number(process.env.PGPORT) || 5432,
    user: required('PGUSER'),
    password: required('PGPASSWORD'),
    database: required('PGDATABASE'),
    ssl: parseSsl(process.env.PGSSL),
  },
};
