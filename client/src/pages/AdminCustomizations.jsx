import { useState, useEffect } from 'react';
import { Settings, Plus } from 'lucide-react';
import { getCustomizations, createCustomization, updateCustomization, deleteCustomization } from '../services/customizationService.js';
import Modal from '../components/common/Modal.jsx';
import Button from '../components/common/Button.jsx';
import './AdminCustomizations.css';

export default function AdminCustomizations() {
  const [customizations, setCustomizations] = useState([]);
  const [filteredCustomizations, setFilteredCustomizations] = useState([]);
  const [selectedTipo, setSelectedTipo] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomization, setEditingCustomization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tiposPersonalizacion, setTiposPersonalizacion] = useState([]);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    loadCustomizations();
  }, []);

  useEffect(() => {
    filterCustomizations();
  }, [customizations, selectedTipo]);

  function formatTipoNombre(tipoId) {
    const map = {
      'milk': 'Tipo de Leche',
      'topping': 'Toppings',
      'cold_foam': 'Cold Foam',
      'syrup': 'Jarabes',
      'tea_option': 'Opciones de Té',
      'sweetness': 'Nivel de Dulzura'
    };
    if (map[tipoId]) return map[tipoId];
    return tipoId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  async function loadCustomizations() {
    try {
      setLoading(true);
      const data = await getCustomizations();
      setCustomizations(data);

      const tiposUnicos = Array.from(new Set(data.map(c => c.tipo))).map(tipoId => {
         return { id: tipoId, nombre: formatTipoNombre(tipoId) };
      });
      if (tiposUnicos.length === 0) {
        tiposUnicos.push(
          { id: 'milk', nombre: 'Tipo de Leche' },
          { id: 'topping', nombre: 'Toppings' },
          { id: 'syrup', nombre: 'Jarabes' }
        );
      }
      setTiposPersonalizacion(tiposUnicos);
    } catch (error) {
      console.error('Error al cargar personalizaciones:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterCustomizations() {
    if (selectedTipo === 'all') {
      setFilteredCustomizations(customizations);
    } else {
      setFilteredCustomizations(customizations.filter(c => c.tipo === selectedTipo));
    }
  }

  function handleAdd() {
    setEditingCustomization(null);
    setShowModal(true);
  }

  function handleEdit(customization) {
    setEditingCustomization(customization);
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm('¿Estás seguro de eliminar esta personalización?')) return;
    
    try {
      await deleteCustomization(id);
      await loadCustomizations();
    } catch (error) {
      console.error('Error al eliminar personalización:', error);
      alert('Error al eliminar personalización');
    }
  }

  async function handleToggleActivo(customization) {
    try {
      setTogglingId(customization.id);
      // Reutilizamos el mismo endpoint de actualización, enviando
      // únicamente el campo activo (el backend soporta updates parciales).
      await updateCustomization(customization.id, { activo: !customization.activo });
      await loadCustomizations();
    } catch (error) {
      console.error('Error al cambiar estado de la personalización:', error);
      alert('Error al cambiar el estado de la personalización');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSubmit(formData) {
    try {
      // Si se creó un nuevo tipo, agregarlo a la lista
      if (formData.newTipoName) {
        const newTipo = {
          id: formData.tipo,
          nombre: formData.newTipoName
        };
        setTiposPersonalizacion(prev => [...prev, newTipo]);
      }

      const data = {
        tipo: formData.tipo,
        nombre: formData.nombre,
        precio_adicional: parseFloat(formData.precio_adicional) || 0
      };

      if (editingCustomization) {
        await updateCustomization(editingCustomization.id, data);
      } else {
        await createCustomization(data);
      }

      setShowModal(false);
      setEditingCustomization(null);
      await loadCustomizations();
    } catch (error) {
      console.error('Error al guardar personalización:', error);
      alert('Error al guardar personalización');
    }
  }

  return (
    <div className="admin-customizations-page">
      <div className="admin-customizations-header">
        <div className="admin-customizations-header-left">
          <div className="admin-customizations-title-wrapper">
            <Settings className="admin-customizations-title-icon" size={28} />
            <h1 className="admin-customizations-title">Gestión de Personalizaciones</h1>
          </div>
          <p className="admin-customizations-subtitle">Administra las opciones de personalización de productos</p>
        </div>
        <Button onClick={handleAdd} icon={Plus}>
          Nueva Personalización
        </Button>
      </div>

      <div className="admin-customizations-filters">
        <div className="filter-group">
          <label htmlFor="tipo-filter">Filtrar por tipo:</label>
          <select
            id="tipo-filter"
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos</option>
            {tiposPersonalizacion.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-customizations-content">
        {loading ? (
          <div className="loading">Cargando personalizaciones...</div>
        ) : filteredCustomizations.length === 0 ? (
          <div className="empty-state">
            <p>No hay personalizaciones para mostrar</p>
          </div>
        ) : (
          <div className="customizations-grid">
            {filteredCustomizations.map(customization => (
              <div key={customization.id} className="customization-card">
                <div className="customization-card-header">
                  <span className="customization-tipo-badge">
                    {tiposPersonalizacion.find(t => t.id === customization.tipo)?.nombre || customization.tipo}
                  </span>
                  <span className={`customization-status ${customization.activo ? 'active' : 'inactive'}`}>
                    {customization.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="customization-card-body">
                  <h3 className="customization-nombre">{customization.nombre}</h3>
                  <p className="customization-precio">
                    {customization.precio_adicional > 0 ? `+$${customization.precio_adicional.toFixed(2)}` : 'Sin costo adicional'}
                  </p>
                </div>
                <div className="customization-card-footer">
                  <Button
                    variant={customization.activo ? 'secondary' : 'primary'}
                    size="small"
                    onClick={() => handleToggleActivo(customization)}
                    disabled={togglingId === customization.id}
                  >
                    {togglingId === customization.id
                      ? 'Guardando...'
                      : customization.activo ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="small"
                    onClick={() => handleEdit(customization)}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="danger" 
                    size="small"
                    onClick={() => handleDelete(customization.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCustomization(null);
        }}
        title={editingCustomization ? 'Editar Personalización' : 'Nueva Personalización'}
      >
        <CustomizationForm
          customization={editingCustomization}
          tiposPersonalizacion={tiposPersonalizacion}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowModal(false);
            setEditingCustomization(null);
          }}
        />
      </Modal>
    </div>
  );
}

function CustomizationForm({ customization, tiposPersonalizacion, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    tipo: customization?.tipo || 'milk',
    nombre: customization?.nombre || '',
    precio_adicional: customization?.precio_adicional || 0
  });
  const [showNewTipoInput, setShowNewTipoInput] = useState(false);
  const [newTipoName, setNewTipoName] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function handleTipoChange(e) {
    const value = e.target.value;
    if (value === 'new') {
      setShowNewTipoInput(true);
      setFormData(prev => ({ ...prev, tipo: '' }));
    } else {
      setShowNewTipoInput(false);
      setNewTipoName('');
      setFormData(prev => ({ ...prev, tipo: value }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Si es un nuevo tipo, generar un ID basado en el nombre
    const tipoFinal = showNewTipoInput && newTipoName 
      ? newTipoName.toLowerCase().replace(/\s+/g, '_')
      : formData.tipo;
    onSubmit({
      ...formData,
      tipo: tipoFinal,
      newTipoName: showNewTipoInput ? newTipoName : null
    });
  }

  return (
    <form onSubmit={handleSubmit} className="customization-form">
      <div className="form-group">
        <label htmlFor="tipo">Tipo de Personalización *</label>
        <select
          id="tipo"
          name="tipo"
          value={showNewTipoInput ? 'new' : formData.tipo}
          onChange={handleTipoChange}
          required
        >
          {tiposPersonalizacion.map(tipo => (
            <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
          ))}
          <option value="new">+ Crear nuevo tipo...</option>
        </select>
      </div>

      {showNewTipoInput && (
        <div className="form-group">
          <label htmlFor="new-tipo">Nombre del Nuevo Tipo *</label>
          <input
            type="text"
            id="new-tipo"
            value={newTipoName}
            onChange={(e) => setNewTipoName(e.target.value)}
            required
            placeholder="Ej: Salsas, Extras, Tamaños..."
          />
          <small className="form-hint">Ingresa un nombre para el nuevo tipo de personalización</small>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="nombre">Nombre *</label>
        <input
          type="text"
          id="nombre"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          placeholder="Ej: Vainilla, Chocolate, Almendra..."
        />
      </div>

      <div className="form-group">
        <label htmlFor="precio_adicional">Precio Adicional ($)</label>
        <input
          type="number"
          id="precio_adicional"
          name="precio_adicional"
          value={formData.precio_adicional}
          onChange={handleChange}
          min="0"
          step="0.01"
          placeholder="0.00"
        />
        <small className="form-hint">Precio adicional que se sumará al producto</small>
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {customization ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}