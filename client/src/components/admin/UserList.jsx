import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, Power, PowerOff } from 'lucide-react';
import { getUsers, activateUser, deactivateUser } from '../../services/authService.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import './UserList.css';

export default function UserList({ onEdit, onRefresh }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, [onRefresh]);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(user) {
    try {
      if (user.activo) {
        await deactivateUser(user.id);
      } else {
        await activateUser(user.id);
      }
      loadUsers();
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      alert('Error al cambiar estado del usuario: ' + (error.response?.data?.error || error.message));
    }
  }

  if (loading) {
    return <div className="loading">Cargando usuarios...</div>;
  }

  return (
    <div className="user-list">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="user-name-cell">
                <button
                  className="user-name-link"
                  onClick={() => navigate(`/admin/usuarios/${user.id}`)}
                >
                  {user.nombre}
                </button>
              </td>
              <td>{user.usuario}</td>
              <td>
                <span className={`role-badge ${user.rol}`}>
                  {user.rol === 'admin' ? 'Administrador' : 'Vendedor'}
                </span>
              </td>
              <td>
                <span className={`status-badge ${user.activo ? 'active' : 'inactive'}`}>
                  {user.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="actions-cell">
                <Button size="small" icon={Edit} onClick={() => onEdit(user)}>
                  Editar
                </Button>
                <Button
                  size="small"
                  variant={user.activo ? 'secondary' : 'success'}
                  icon={user.activo ? PowerOff : Power}
                  onClick={() => handleToggleActive(user)}
                >
                  {user.activo ? 'Desactivar' : 'Activar'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
