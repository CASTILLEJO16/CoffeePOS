/**
 * Modelo de Detalle de Venta
 * Define la estructura y operaciones básicas para detalles de venta
 */

export class SaleDetail {
  constructor(data) {
    this.id = data.id;
    this.venta_id = data.venta_id;
    this.producto_id = data.producto_id;
    this.cantidad = data.cantidad;
    this.precio = data.precio;
    this.importe = data.importe;
  }

  /**
   * Convierte el modelo a objeto plano
   */
  toJSON() {
    return {
      id: this.id,
      venta_id: this.venta_id,
      producto_id: this.producto_id,
      cantidad: this.cantidad,
      precio: this.precio,
      importe: this.importe
    };
  }
}
