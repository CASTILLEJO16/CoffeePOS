/**
 * Modelo de Venta
 * Define la estructura y operaciones básicas para ventas
 */

export class Sale {
  constructor(data) {
    this.id = data.id;
    this.fecha = data.fecha;
    this.subtotal = data.subtotal;
    this.impuestos = data.impuestos;
    this.total = data.total;
    this.metodo_pago = data.metodo_pago || 'efectivo';
    this.usuario_id = data.usuario_id;
  }

  /**
   * Convierte el modelo a objeto plano
   */
  toJSON() {
    return {
      id: this.id,
      fecha: this.fecha,
      subtotal: this.subtotal,
      impuestos: this.impuestos,
      total: this.total,
      metodo_pago: this.metodo_pago,
      usuario_id: this.usuario_id
    };
  }
}
