const RAW_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
const BASE_URL = RAW_BASE.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path, params) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${clean}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiGet(path, { params, signal } = {}) {
  const url = buildUrl(path, params);
  let res;
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(`Network error contacting ${url}`, { status: 0 });
  }

  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && (body.error || body.message)) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, { status: res.status, body });
  }

  return body;
}

export const apiBaseUrl = BASE_URL;
