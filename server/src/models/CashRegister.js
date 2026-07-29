/**
 * Modelo de Caja
 * Define la estructura y operaciones básicas para cajas
 */

export class CashRegister {
  constructor(data) {
    this.id = data.id;
    this.usuario_id = data.usuario_id;
    this.nombre_caja = data.nombre_caja;
    this.fondo_inicial = data.fondo_inicial || 0;
    this.fecha_apertura = data.fecha_apertura;
    this.fecha_cierre = data.fecha_cierre;
    this.ventas_efectivo = data.ventas_efectivo || 0;
    this.ventas_tarjeta = data.ventas_tarjeta || 0;
    this.ventas_transferencia = data.ventas_transferencia || 0;
    this.ventas_otros = data.ventas_otros || 0;
    this.total_descuentos = data.total_descuentos || 0;
    this.total_devoluciones = data.total_devoluciones || 0;
    this.total_esperado = data.total_esperado || 0;
    this.total_contado = data.total_contado || 0;
    this.diferencia = data.diferencia || 0;
    this.observaciones = data.observaciones;
    this.estado = data.estado || 'abierta';
  }

  /**
   * Convierte el modelo a objeto plano
   */
  toJSON() {
    return {
      id: this.id,
      usuario_id: this.usuario_id,
      nombre_caja: this.nombre_caja,
      fondo_inicial: this.fondo_inicial,
      fecha_apertura: this.fecha_apertura,
      fecha_cierre: this.fecha_cierre,
      ventas_efectivo: this.ventas_efectivo,
      ventas_tarjeta: this.ventas_tarjeta,
      ventas_transferencia: this.ventas_transferencia,
      ventas_otros: this.ventas_otros,
      total_descuentos: this.total_descuentos,
      total_devoluciones: this.total_devoluciones,
      total_esperado: this.total_esperado,
      total_contado: this.total_contado,
      diferencia: this.diferencia,
      observaciones: this.observaciones,
      estado: this.estado
    };
  }

  /**
   * Verifica si la caja está abierta
   */
  isOpen() {
    return this.estado === 'abierta';
  }

  /**
   * Calcula el total de ventas
   */
  getTotalVentas() {
    return this.ventas_efectivo + this.ventas_tarjeta + this.ventas_transferencia + this.ventas_otros;
  }

  /**
   * Calcula el total esperado en caja
   */
  calcularTotalEsperado() {
    return this.fondo_inicial + this.ventas_efectivo - this.total_devoluciones;
  }
}
