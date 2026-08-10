import { format, formatInTimeZone, toDate } from 'date-fns-tz';

const TIJUANA_TZ = 'America/Tijuana';

/**
 * Formats a UTC or ISO date string to Tijuana local time.
 */
export function formatToTijuana(dateString, formatStr = 'dd/MM/yyyy HH:mm:ss') {
  if (!dateString) return '';
  
  try {
    // Si la fecha viene de SQLite ("YYYY-MM-DD HH:mm:ss") ya está en Tijuana.
    // NO convertir a UTC (evita desfase). Interpretar como local.
    let dateObj = new Date(dateString);
    if (typeof dateString === 'string' && !dateString.includes('Z') && !dateString.includes('T')) {
      dateObj = new Date(dateString.replace(' ', 'T'));
    }
    
    return formatInTimeZone(dateObj, TIJUANA_TZ, formatStr);
  } catch (e) {
    console.error('Error formatting date', e);
    return String(dateString);
  }
}

/**
 * Gets current date in Tijuana timezone.
 */
export function getTijuanaNow() {
  const now = new Date();
  return toDate(now, { timeZone: TIJUANA_TZ });
}
