/**
 * Modelo de Producto
 * Define la estructura y operaciones básicas para productos
 */

export class Product {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.precio = data.precio;
    this.categoria = data.categoria;
    this.imagen = data.imagen;
    this.activo = data.activo !== undefined ? data.activo : 1;
    this.created_at = data.created_at;
  }

  /**
   * Convierte el modelo a objeto plano
   */
  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      precio: this.precio,
      categoria: this.categoria,
      imagen: this.imagen,
      activo: this.activo,
      created_at: this.created_at
    };
  }
}
