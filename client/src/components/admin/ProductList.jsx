import { useState, useEffect } from 'react';
import { Package, Edit, Power, PowerOff, Trash2, AlertTriangle, Coffee, Percent, CheckSquare, Square } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { getAllProducts, activateProduct, deactivateProduct, deleteProduct, applyProductDiscount } from '../../services/productService.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Input from '../common/Input.jsx';
import './ProductList.css';

const SERVER_URL = 'http://localhost:3000';

function getImageSrc(imagen) {
  if (!imagen) return null;
  if (imagen.startsWith('http')) return imagen;
  const imgPath = imagen.startsWith('/') ? imagen : `/uploads/${imagen}`;
  return `${SERVER_URL}${imgPath}`;
}

export default function ProductList({ onEdit, onRefresh }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState('');

  useEffect(() => {
    loadProducts();
  }, [onRefresh]);

  async function loadProducts() {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(product) {
    try {
      if (product.activo) {
        await deactivateProduct(product.id);
      } else {
        await activateProduct(product.id);
      }
      loadProducts();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    }
  }

  function handleDeleteClick(product) {
    setProductToDelete(product);
    setShowDeleteModal(true);
  }

  async function handleDeleteConfirm() {
    try {
      await deleteProduct(productToDelete.id);
      setShowDeleteModal(false);
      setProductToDelete(null);
      loadProducts();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  }

  function handleSelectProduct(productId) {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }

  function handleSelectAll() {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  }

  function openDiscountModal() {
    if (selectedProducts.size === 0) return;
    setDiscountPercent('');
    setShowDiscountModal(true);
  }

  async function handleApplyDiscount() {
    try {
      const percent = parseFloat(discountPercent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        alert('Por favor ingresa un porcentaje válido entre 0 y 100');
        return;
      }

      for (const productId of selectedProducts) {
        await applyProductDiscount(productId, percent);
      }

      setShowDiscountModal(false);
      setSelectedProducts(new Set());
      loadProducts();
    } catch (error) {
      console.error('Error al aplicar descuento:', error);
      alert('Error al aplicar descuento');
    }
  }

  if (loading) {
    return (
      <div className="product-list-loading">
        <div className="list-spinner"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="product-list-empty">
        <Package className="empty-icon" size={48} />
        <p>No hay productos registrados</p>
      </div>
    );
  }

  return (
    <>
      <div className="product-list">
        {selectedProducts.size > 0 && (
          <div className="bulk-actions">
            <span>{selectedProducts.size} producto(s) seleccionado(s)</span>
            <Button
              variant="primary"
              icon={Percent}
              onClick={openDiscountModal}
            >
              Aplicar Descuento
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectedProducts(new Set())}
            >
              Cancelar Selección
            </Button>
          </div>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <button
                  className="select-all-btn"
                  onClick={handleSelectAll}
                  title="Seleccionar todos"
                >
                  {selectedProducts.size === products.length && products.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
              </th>
              <th>Imagen</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Descuento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const imgSrc = getImageSrc(product.imagen);
              const isSelected = selectedProducts.has(product.id);
              return (
                <tr key={product.id} className={!product.activo ? 'row-inactive' : ''} style={{ backgroundColor: isSelected ? 'var(--color-primary-light)' : '' }}>
                  <td>
                    <button
                      className="select-btn"
                      onClick={() => handleSelectProduct(product.id)}
                    >
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="product-img-cell">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={product.nombre}
                        className="product-thumbnail"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div className="product-thumbnail-placeholder" style={{ display: imgSrc ? 'none' : 'flex' }}>
                      <Coffee size={24} />
                    </div>
                  </td>
                  <td className="product-name-cell">
                    <span className="product-name">{product.nombre}</span>
                    <span className="product-id">#{product.id}</span>
                  </td>
                  <td>
                    <span className="category-tag">{product.categoria}</span>
                  </td>
                  <td className="price-cell">{formatCurrency(product.precio)}</td>
                  <td className="discount-cell">
                    {product.descuento > 0 ? (
                      <span className="discount-badge">{product.descuento}%</span>
                    ) : (
                      <span className="no-discount">-</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${product.activo ? 'active' : 'inactive'}`}>
                      {product.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <Button size="small" icon={Edit} onClick={() => onEdit(product)}>
                      Editar
                    </Button>
                    <Button
                      size="small"
                      variant={product.activo ? 'secondary' : 'success'}
                      icon={product.activo ? PowerOff : Power}
                      onClick={() => handleToggleActive(product)}
                    >
                      {product.activo ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      size="small"
                      variant="danger"
                      icon={Trash2}
                      onClick={() => handleDeleteClick(product)}
                    >
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Producto"
      >
        <div className="delete-confirmation">
          <p>¿Estás seguro de eliminar el producto <strong>{productToDelete?.nombre}</strong>?</p>
          <p className="warning-text"><AlertTriangle size={16} className="warning-icon" /> Esta acción no se puede deshacer.</p>
          <div className="modal-actions">
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Sí, eliminar
            </Button>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        title="Aplicar Descuento"
      >
        <div className="discount-modal">
          <p>Aplicar descuento a <strong>{selectedProducts.size}</strong> producto(s)</p>
          <div className="form-group">
            <label>Porcentaje de Descuento (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Ej: 10"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <Button variant="primary" onClick={handleApplyDiscount}>
              Aplicar
            </Button>
            <Button variant="secondary" onClick={() => setShowDiscountModal(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
