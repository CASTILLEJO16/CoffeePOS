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
  
  // Si es un formato de base de datos SQL como "YYYY-MM-DD HH:MM:SS"
  // lo interpretamos como hora de Tijuana directamente
  if (!str.includes('Z') && !str.includes('T')) {
    // Interpretar como UTC (como se guarda en backend)
    const iso = str.replace(' ', 'T') + 'Z';
    const parsedUTC = new Date(iso);
    return Number.isNaN(parsedUTC.getTime()) ? new Date() : parsedUTC;
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
  const parsed = typeof date === 'string' ? parseBusinessDate(date) : date;
  return parsed.toLocaleString('es-MX', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
