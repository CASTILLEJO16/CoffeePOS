import { useState } from 'react';
import { createUser, updateUser } from '../services/authService.js';
import UserList from '../components/admin/UserList.jsx';
import UserForm from '../components/admin/UserForm.jsx';
import Modal from '../components/common/Modal.jsx';
import Button from '../components/common/Button.jsx';
import Swal from 'sweetalert2';
import './Usuarios.css';

export default function Usuarios() {
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleAddUser() {
    setEditingUser(null);
    setShowUserModal(true);
  }

  function handleEditUser(user) {
    setEditingUser(user);
    setShowUserModal(true);
  }

  async function handleUserSubmit(userData) {
    const result = await Swal.fire({
      title: editingUser ? '¿Guardar cambios?' : '¿Crear usuario?',
      text: editingUser
        ? `¿Estás seguro de actualizar el usuario "${userData.nombre}"?`
        : `¿Estás seguro de crear el usuario "${userData.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData);
      } else {
        await createUser(userData);
      }
      setShowUserModal(false);
      setEditingUser(null);
      setRefreshKey(prev => prev + 1);

      await Swal.fire({
        title: '¡Guardado!',
        text: editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      Swal.fire('Error', 'Error al guardar usuario', 'error');
    }
  }

  return (
    <div className="admin-page usuarios-page">
      <div className="usuarios-header">
        <h1 className="usuarios-title">Gestión de Usuarios</h1>
        <Button onClick={handleAddUser}>
          + Nuevo Usuario
        </Button>
      </div>

      <div className="usuarios-content">
        <UserList 
          onEdit={handleEditUser}
          onRefresh={refreshKey}
        />
      </div>

      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <UserForm
          user={editingUser}
          onSubmit={handleUserSubmit}
          onCancel={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
        />
      </Modal>
    </div>
  );
}
