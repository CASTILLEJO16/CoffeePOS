import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { createProduct, updateProduct } from '../services/productService.js';
import ProductList from '../components/admin/ProductList.jsx';
import ProductForm from '../components/admin/ProductForm.jsx';
import Modal from '../components/common/Modal.jsx';
import Button from '../components/common/Button.jsx';
import './Admin.css';

export default function Admin() {
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleAddProduct() {
    setEditingProduct(null);
    setShowProductModal(true);
  }

  function handleEditProduct(product) {
    setEditingProduct(product);
    setShowProductModal(true);
  }

  async function handleProductSubmit(productData) {
    try {
      // Construir FormData para incluir la imagen si existe
      const formData = new FormData();
      formData.append('nombre', productData.nombre);
      formData.append('precio', productData.precio);
      formData.append('categoria', productData.categoria);
      
      // Solo enviar la imagen si se seleccionó una nueva
      if (productData.imageFile) {
        formData.append('imagen', productData.imageFile);
      }
      // Si estamos editando y no hay nueva imagen, NO enviar el campo imagen
      // para que el backend mantenga la imagen existente

      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await createProduct(formData);
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar producto: ' + (error.response?.data?.error || error.message));
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-title-wrapper">
            <Package className="admin-title-icon" size={28} />
            <h1 className="admin-title">Gestión de Productos</h1>
          </div>
          <p className="admin-subtitle">Administra el catálogo de productos del sistema</p>
        </div>
        <Button onClick={handleAddProduct} icon={Plus}>
          Nuevo Producto
        </Button>
      </div>

      <div className="admin-content">
        <ProductList
          onEdit={handleEditProduct}
          onRefresh={refreshKey}
        />
      </div>

      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <ProductForm
          product={editingProduct}
          onSubmit={handleProductSubmit}
          onCancel={() => {
            setShowProductModal(false);
            setEditingProduct(null);
          }}
        />
      </Modal>
    </div>
  );
}
