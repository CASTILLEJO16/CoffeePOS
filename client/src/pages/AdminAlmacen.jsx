import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Settings } from 'lucide-react';
import { getIngredientes, createIngrediente, updateIngrediente, deleteIngrediente, ajustarStock, getRecetaProducto, saveRecetaProducto, getRecetaPersonalizacion, saveRecetaPersonalizacion } from '../services/almacenService.js';
import { getProducts } from '../services/productService.js';
import { getCustomizations } from '../services/customizationService.js';
import Swal from 'sweetalert2';
import Modal from '../components/common/Modal.jsx';
import './AdminAlmacen.css';

export default function AdminAlmacen() {
  const [activeTab, setActiveTab] = useState('ingredientes');
  const [loading, setLoading] = useState(true);
  
  // Data
  const [ingredientes, setIngredientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [personalizaciones, setPersonalizaciones] = useState([]);
  
  // Modales
  const [showIngredienteModal, setShowIngredienteModal] = useState(false);
  const [showAjusteModal, setShowAjusteModal] = useState(false);
  const [showRecetaModal, setShowRecetaModal] = useState(false);
  
  const [currentIngrediente, setCurrentIngrediente] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', unidad_medida: '', stock_minimo: 0, categoria_reemplazo: '' });
  const [ajusteData, setAjusteData] = useState({ cantidad: 0, tipo: 'agregar' });
  const [recetaData, setRecetaData] = useState([]); // [{ ingrediente_id, cantidad, nombre, unidad_medida }]
  const [currentRecetaTarget, setCurrentRecetaTarget] = useState(null); // { type: 'producto'|'personalizacion', id, nombre }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [ingRes, prodRes, custRes] = await Promise.all([
        getIngredientes(),
        getProducts(),
        getCustomizations()
      ]);
      setIngredientes(ingRes || []);
      setProductos(prodRes || []);
      // getCustomizations devuelve un array plano
      setPersonalizaciones(Array.isArray(custRes) ? custRes : []);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Error al cargar datos del almacén', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ---- Ingredientes ----
  function openIngredienteModal(ing = null) {
    setCurrentIngrediente(ing);
    if (ing) {
      setFormData({ 
        nombre: ing.nombre, 
        unidad_medida: ing.unidad_medida, 
        stock_minimo: ing.stock_minimo,
        categoria_reemplazo: ing.categoria_reemplazo || ''
      });
    } else {
      setFormData({ nombre: '', unidad_medida: '', stock_minimo: 0, categoria_reemplazo: '' });
    }
    setShowIngredienteModal(true);
  }

  async function handleSaveIngrediente(e) {
    e.preventDefault();
    try {
      if (currentIngrediente) {
        await updateIngrediente(currentIngrediente.id, formData);
        Swal.fire('Guardado', 'Ingrediente actualizado', 'success');
      } else {
        await createIngrediente(formData);
        Swal.fire('Guardado', 'Ingrediente creado', 'success');
      }
      setShowIngredienteModal(false);
      loadData();
    } catch (error) {
      Swal.fire('Error', 'Error al guardar ingrediente', 'error');
    }
  }

  async function handleDeleteIngrediente(id) {
    const result = await Swal.fire({
      title: '¿Eliminar ingrediente?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
      try {
        await deleteIngrediente(id);
        Swal.fire('Eliminado', 'Ingrediente eliminado', 'success');
        loadData();
      } catch (error) {
        Swal.fire('Error', 'Error al eliminar', 'error');
      }
    }
  }

  // ---- Ajustes de Stock ----
  function openAjusteModal(ing) {
    setCurrentIngrediente(ing);
    setAjusteData({ cantidad: 0, tipo: 'agregar' });
    setShowAjusteModal(true);
  }

  async function handleAjusteStock(e) {
    e.preventDefault();
    try {
      await ajustarStock(currentIngrediente.id, ajusteData.cantidad, ajusteData.tipo);
      Swal.fire('Actualizado', 'Stock actualizado correctamente', 'success');
      setShowAjusteModal(false);
      loadData();
    } catch (error) {
      Swal.fire('Error', 'Error al actualizar stock', 'error');
    }
  }

  // ---- Recetas ----
  async function openRecetaModal(type, item) {
    setCurrentRecetaTarget({ type, id: item.id, nombre: item.nombre });
    setRecetaData([]);
    setShowRecetaModal(true);
    
    try {
      let receta = [];
      if (type === 'producto') {
        receta = await getRecetaProducto(item.id);
      } else {
        receta = await getRecetaPersonalizacion(item.id);
      }
      setRecetaData(receta || []);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo cargar la receta', 'error');
    }
  }

  function handleAddIngredienteToReceta(ingId) {
    if (!ingId) return;
    const ing = ingredientes.find(i => i.id === Number(ingId));
    if (ing && !recetaData.find(r => r.ingrediente_id === ing.id)) {
      setRecetaData([...recetaData, { ingrediente_id: ing.id, nombre: ing.nombre, unidad_medida: ing.unidad_medida, cantidad: 0 }]);
    }
  }

  function handleUpdateRecetaCantidad(ingId, cantidad) {
    setRecetaData(recetaData.map(r => r.ingrediente_id === ingId ? { ...r, cantidad: Number(cantidad) } : r));
  }

  function handleRemoveIngredienteFromReceta(ingId) {
    setRecetaData(recetaData.filter(r => r.ingrediente_id !== ingId));
  }

  async function handleSaveReceta() {
    try {
      const payload = recetaData.map(r => ({ ingrediente_id: r.ingrediente_id, cantidad: r.cantidad }));
      if (currentRecetaTarget.type === 'producto') {
        await saveRecetaProducto(currentRecetaTarget.id, payload);
      } else {
        await saveRecetaPersonalizacion(currentRecetaTarget.id, payload);
      }
      Swal.fire('Guardado', 'Receta actualizada', 'success');
      setShowRecetaModal(false);
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar la receta', 'error');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Almacén e Inventario</h1>
          <p className="admin-subtitle">Gestión de ingredientes y recetas</p>
        </div>
      </div>

      <div className="almacen-tabs">
        <button 
          className={`almacen-tab ${activeTab === 'ingredientes' ? 'active' : ''}`}
          onClick={() => setActiveTab('ingredientes')}
        >
          Ingredientes
        </button>
        <button 
          className={`almacen-tab ${activeTab === 'productos' ? 'active' : ''}`}
          onClick={() => setActiveTab('productos')}
        >
          Recetas Productos
        </button>
        <button 
          className={`almacen-tab ${activeTab === 'personalizaciones' ? 'active' : ''}`}
          onClick={() => setActiveTab('personalizaciones')}
        >
          Recetas Extras
        </button>
      </div>

      {loading ? (
        <div className="loading">Cargando almacén...</div>
      ) : (
        <div className="almacen-content">
          {activeTab === 'ingredientes' && (
            <div className="tab-section">
              <div className="section-header">
                <h2>Lista de Ingredientes</h2>
                <button className="primary-btn" onClick={() => openIngredienteModal()}>
                  <Plus size={18} /> Nuevo Ingrediente
                </button>
              </div>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Unidad</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientes.map(ing => {
                    const isBajo = ing.stock_actual <= ing.stock_minimo;
                    return (
                      <tr key={ing.id} className={isBajo ? 'stock-bajo' : ''}>
                        <td><strong>{ing.nombre}</strong></td>
                        <td>{ing.unidad_medida}</td>
                        <td className="fw-bold">{ing.stock_actual} {ing.unidad_medida}</td>
                        <td style={{color: 'var(--color-text-secondary)'}}>{ing.stock_minimo} {ing.unidad_medida}</td>
                        <td>
                          {isBajo
                            ? <span className="badge-bajo">⚠️ Stock bajo</span>
                            : <span className="badge-ok">✓ Suficiente</span>
                          }
                        </td>
                        <td className="actions-cell">
                          <button className="icon-btn" title="Ajustar Stock" onClick={() => openAjusteModal(ing)}>
                            <Package size={18} />
                          </button>
                          <button className="icon-btn" title="Editar" onClick={() => openIngredienteModal(ing)}>
                            <Edit2 size={18} />
                          </button>
                          <button className="icon-btn text-danger" title="Eliminar" onClick={() => handleDeleteIngrediente(ing.id)}>
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {ingredientes.length === 0 && (
                    <tr><td colSpan="6" className="text-center">No hay ingredientes registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'productos' && (
            <div className="tab-section">
              <div className="section-header">
                <h2>Recetas de Productos</h2>
              </div>
              <div className="recetas-grid">
                {productos.map(prod => (
                  <div key={prod.id} className="receta-card">
                    <div className="receta-info">
                      <h3>{prod.nombre}</h3>
                      <p>{prod.categoria}</p>
                    </div>
                    <button className="secondary-btn" onClick={() => openRecetaModal('producto', prod)}>
                      <Settings size={18} /> Configurar Receta
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'personalizaciones' && (
            <div className="tab-section">
              <div className="section-header">
                <h2>Recetas de Extras / Personalizaciones</h2>
              </div>
              <div className="recetas-grid">
                {personalizaciones.map(pers => (
                  <div key={pers.id} className="receta-card">
                    <div className="receta-info">
                      <h3>{pers.nombre}</h3>
                      <p>{pers.tipo}</p>
                    </div>
                    <button className="secondary-btn" onClick={() => openRecetaModal('personalizacion', pers)}>
                      <Settings size={18} /> Configurar Receta
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Ingrediente */}
      <Modal isOpen={showIngredienteModal} onClose={() => setShowIngredienteModal(false)} title={currentIngrediente ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}>
        <form onSubmit={handleSaveIngrediente} className="almacen-form">
          <div className="form-group">
            <label>Nombre del Ingrediente</label>
            <input type="text" className="form-input" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Leche Entera" />
          </div>
          <div className="form-group">
            <label>Unidad de Medida</label>
            <input type="text" className="form-input" required value={formData.unidad_medida} onChange={e => setFormData({...formData, unidad_medida: e.target.value})} placeholder="Ej: ml, gr, pza" />
          </div>
          <div className="form-group">
            <label>Stock Mínimo (Alerta)</label>
            <input type="number" className="form-input" min="0" step="0.1" value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Categoría de Reemplazo (Opcional)</label>
            <select className="form-input" value={formData.categoria_reemplazo || ''} onChange={e => setFormData({...formData, categoria_reemplazo: e.target.value})}>
              <option value="">Ninguna</option>
              <option value="milk">Tipos de Leche</option>
              <option value="sweetness">Dulzura / Azúcar</option>
              <option value="syrup">Jarabes</option>
              <option value="topping">Toppings</option>
              <option value="cold_foam">Cold Foam</option>
              <option value="tea_option">Opciones de Té</option>
            </select>
            <small style={{color: 'var(--color-text-secondary)', fontSize: '0.8rem'}}>Si un cliente elige una personalización de esta categoría, este ingrediente se omitirá de la receta base.</small>
          </div>
          <div className="form-actions">
            <button type="submit" className="primary-btn">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste Stock */}
      <Modal isOpen={showAjusteModal} onClose={() => setShowAjusteModal(false)} title="Ajustar Stock">
        {currentIngrediente && (
          <form onSubmit={handleAjusteStock} className="almacen-form">
            <p><strong>Ingrediente:</strong> {currentIngrediente.nombre}</p>
            <p><strong>Stock Actual:</strong> {currentIngrediente.stock_actual} {currentIngrediente.unidad_medida}</p>
            
            <div className="form-group mt-4">
              <label>Tipo de Ajuste</label>
              <select className="form-input" value={ajusteData.tipo} onChange={e => setAjusteData({...ajusteData, tipo: e.target.value})}>
                <option value="agregar">Agregar / Restar cantidad</option>
                <option value="establecer">Establecer nuevo total</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Cantidad ({currentIngrediente.unidad_medida})</label>
              <input type="number" className="form-input" required step="0.01" value={ajusteData.cantidad} onChange={e => setAjusteData({...ajusteData, cantidad: e.target.value})} />
              <small className="help-text">{ajusteData.tipo === 'agregar' ? 'Usa números negativos para restar stock.' : 'El stock actual será reemplazado por esta cantidad.'}</small>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="primary-btn">Actualizar Stock</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Receta */}
      <Modal isOpen={showRecetaModal} onClose={() => setShowRecetaModal(false)} title={`Receta: ${currentRecetaTarget?.nombre}`}>
        <div className="receta-modal-content">
          <div className="form-group">
            <label>Añadir Ingrediente</label>
            <div style={{display: 'flex', gap: '10px'}}>
              <select id="select-ingrediente" className="form-input" defaultValue="">
                <option value="" disabled>Seleccione un ingrediente...</option>
                {ingredientes.filter(i => !recetaData.find(r => r.ingrediente_id === i.id)).map(ing => (
                  <option key={ing.id} value={ing.id}>{ing.nombre} ({ing.unidad_medida})</option>
                ))}
              </select>
              <button type="button" className="secondary-btn" onClick={() => {
                const sel = document.getElementById('select-ingrediente');
                handleAddIngredienteToReceta(sel.value);
                sel.value = "";
              }}>
                <Plus size={18} /> Añadir
              </button>
            </div>
          </div>

          <div className="receta-items">
            {recetaData.length === 0 ? (
              <p className="empty-text">No hay ingredientes asignados. Este producto no descontará stock.</p>
            ) : (
              <table className="admin-table mt-3">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recetaData.map(item => (
                    <tr key={item.ingrediente_id}>
                      <td>{item.nombre}</td>
                      <td>
                        <input 
                          type="number" 
                          className="form-input small-input" 
                          value={item.cantidad} 
                          min="0"
                          step="0.01"
                          onChange={e => handleUpdateRecetaCantidad(item.ingrediente_id, e.target.value)} 
                        />
                      </td>
                      <td>{item.unidad_medida}</td>
                      <td>
                        <button className="icon-btn text-danger" onClick={() => handleRemoveIngredienteFromReceta(item.ingrediente_id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="form-actions mt-4">
            <button className="secondary-btn" onClick={() => setShowRecetaModal(false)}>Cancelar</button>
            <button className="primary-btn" onClick={handleSaveReceta}>Guardar Receta</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
