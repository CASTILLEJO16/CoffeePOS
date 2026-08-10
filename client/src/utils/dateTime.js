/** Zona horaria operativa del negocio */
export const BUSINESS_TIMEZONE = 'America/Tijuana';

/**
 * Convierte un valor de base de datos a un objeto Date asumiendo que está en Tijuana.
 */
export function parseBusinessDate(value) {
  if (!value) return null;
  
  if (value instanceof Date) {
    return value;
  }
  
  let str = String(value).trim();
  
  // Si es formato SQL "YYYY-MM-DD HH:MM:SS"
  // NO convertir a UTC. Mantener como hora local (ya viene en Tijuana)
  if (!str.includes('Z') && !str.includes('T')) {
    const isoLocal = str.replace(' ', 'T');
    const parsedLocal = new Date(isoLocal);
    return Number.isNaN(parsedLocal.getTime()) ? new Date() : parsedLocal;
  }
  
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Fecha YYYY-MM-DD (Usa la fecha actual)
 */
export function toSQLDate(date = new Date()) {
  const parsed = typeof date === 'string' ? parseBusinessDate(date) : date;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(parsed);
  
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
}

/**
 * Fecha/hora actual como string SQL en UTC (SQLite usa UTC para CURRENT_TIMESTAMP)
 */
export function nowInTijuanaSQL() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const get = (type) => parts.find(p => p.type === type).value;

  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

/**
 * Fecha larga en vivo (Tijuana)
 */
export function formatBusinessDate(date = new Date()) {
  const parsed = typeof date === 'string' ? parseBusinessDate(date) : date;
  return parsed.toLocaleDateString('es-MX', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Hora en vivo (Tijuana)
 */
export function formatBusinessTime(date = new Date(), withSeconds = true) {
  const parsed = typeof date === 'string' ? parseBusinessDate(date) : date;
  const formatted = parsed.toLocaleTimeString('es-MX', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: true
  });
  return formatted;
}

/**
 * Fecha y hora en vivo (Tijuana)
 */
export function formatBusinessDateTime(date = new Date()) {
  // ✅ Si viene como string SQL, NO convertir ni aplicar timezone
  if (typeof date === 'string' && date.includes(' ')) {
    const [d, t] = date.split(' ');
    const [y, m, day] = d.split('-');
    return `${day} ${new Date(`${y}-${m}-01`).toLocaleString('es-MX', { month: 'short' })} ${y}, ${t.slice(0,5)}`;
  }

  const parsed = typeof date === 'string' ? parseBusinessDate(date) : date;
  return parsed.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
