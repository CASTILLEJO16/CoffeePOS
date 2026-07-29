import { format, formatInTimeZone, toDate } from 'date-fns-tz';

const TIJUANA_TZ = 'America/Tijuana';

/**
 * Formats a UTC or ISO date string to Tijuana local time.
 */
export function formatToTijuana(dateString, formatStr = 'dd/MM/yyyy HH:mm:ss') {
  if (!dateString) return '';
  
  try {
    // Si la fecha viene de SQLite (ej. "2023-10-25 15:30:00") y no tiene Z, la tratamos como UTC
    let dateObj = new Date(dateString);
    if (typeof dateString === 'string' && !dateString.includes('Z') && !dateString.includes('T')) {
      dateObj = new Date(dateString + 'Z');
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
