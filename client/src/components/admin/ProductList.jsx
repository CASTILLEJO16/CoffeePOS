import { useState, useEffect } from 'react';
import { Package, Edit, Power, PowerOff, Trash2, AlertTriangle, Coffee } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.js';
import { getAllProducts, activateProduct, deactivateProduct, deleteProduct } from '../../services/productService.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
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
        <table className="data-table">
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const imgSrc = getImageSrc(product.imagen);
              return (
                <tr key={product.id} className={!product.activo ? 'row-inactive' : ''}>
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
    </>
  );
}
