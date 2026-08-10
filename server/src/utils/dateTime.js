import { formatInTimeZone } from 'date-fns-tz';

/** Zona horaria operativa del negocio (Tijuana, B.C.) */
export const BUSINESS_TIMEZONE = 'America/Tijuana';

/**
 * Fecha/hora actual como string SQL en formato: YYYY-MM-DD HH:mm:ss
 * Se guarda en la zona horaria de Tijuana para consistencia en los reportes
 */
export function nowInTijuanaSQL() {
  const now = new Date();
  // Formato: "YYYY-MM-DD HH:MM:SS" en zona horaria de Tijuana
  return formatInTimeZone(now, 'America/Tijuana', 'yyyy-MM-dd HH:mm:ss');
}
