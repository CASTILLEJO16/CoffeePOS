/**
 * Modelo de Usuario
 * Define la estructura y operaciones básicas para usuarios
 */

export class User {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.usuario = data.usuario;
    this.contraseña_hash = data.contraseña_hash;
    this.rol = data.rol || 'cajero';
    this.activo = data.activo !== undefined ? data.activo : 1;
    this.created_at = data.created_at;
  }

  /**
   * Convierte el modelo a objeto plano (sin contraseña)
   */
  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      usuario: this.usuario,
      rol: this.rol,
      activo: this.activo,
      created_at: this.created_at
    };
  }

  /**
   * Verifica si la contraseña es correcta
   */
  verifyPassword(password, bcrypt) {
    return bcrypt.compareSync(password, this.contraseña_hash);
  }
}
