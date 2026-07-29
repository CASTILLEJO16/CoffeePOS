import { useState, useEffect } from 'react';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import './UserForm.css';

export default function UserForm({ user, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    nombre: '',
    usuario: '',
    contraseña: '',
    rol: 'cajero',
    activo: true
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nombre: user.nombre || '',
        usuario: user.usuario || '',
        contraseña: '',
        rol: user.rol || 'cajero',
        activo: user.activo !== undefined ? user.activo : true
      });
    }
  }, [user]);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(formData);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <Input
        label="Nombre completo"
        name="nombre"
        value={formData.nombre}
        onChange={handleChange}
        placeholder="Ej: Juan Pérez"
        required
      />
      
      <Input
        label="Usuario"
        name="usuario"
        value={formData.usuario}
        onChange={handleChange}
        placeholder="Ej: juanperez"
        required
      />
      
      <Input
        label={user ? "Nueva contraseña (dejar vacío para mantener)" : "Contraseña"}
        name="contraseña"
        type="password"
        value={formData.contraseña}
        onChange={handleChange}
        placeholder={user ? "••••••••" : "••••••••"}
        required={!user}
      />
      
      <div className="form-group">
        <label className="form-label">Rol</label>
        <select
          name="rol"
          value={formData.rol}
          onChange={handleChange}
          className="form-select"
          required
        >
          <option value="cajero">Vendedor</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      
      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="activo"
            checked={formData.activo}
            onChange={handleChange}
          />
          <span>Usuario activo</span>
        </label>
      </div>
      
      <div className="form-actions">
        <Button type="submit" variant="primary">
          {user ? 'Actualizar' : 'Crear'} Usuario
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
