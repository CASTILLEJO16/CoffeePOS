/**
 * Modelo de Log
 * Define la estructura y operaciones básicas para logs de auditoría
 */

export class Log {
  constructor(data) {
    this.id = data.id;
    this.usuario_id = data.usuario_id;
    this.accion = data.accion;
    this.detalles = data.detalles;
    this.fecha = data.fecha;
  }

  /**
   * Convierte el modelo a objeto plano
   */
  toJSON() {
    return {
      id: this.id,
      usuario_id: this.usuario_id,
      accion: this.accion,
      detalles: this.detalles,
      fecha: this.fecha
    };
  }
}
