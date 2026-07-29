/** Zona horaria operativa del negocio (Tijuana, B.C.) */
export const BUSINESS_TIMEZONE = 'America/Tijuana';

/**
 * Fecha/hora actual como string SQL en formato ISO UTC: YYYY-MM-DD HH:mm:ss
 * Se guarda en UTC, igual que SQLite CURRENT_TIMESTAMP.
 * El frontend convierte a la zona horaria de Tijuana al mostrar.
 */
export function nowInTijuanaSQL() {
  const now = new Date();
  // Formato: "YYYY-MM-DD HH:MM:SS" en UTC (compatible con SQLite)
  const iso = now.toISOString(); // e.g. "2025-10-25T22:30:00.000Z"
  return iso.replace('T', ' ').replace(/\.\d+Z$/, '');
}
