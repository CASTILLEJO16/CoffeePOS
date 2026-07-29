import { useState, useEffect } from 'react';
import { Search, Coffee, ShoppingCart, DollarSign, CreditCard, Smartphone } from 'lucide-react';
import { useAdminOrder } from '../context/AdminOrderContext.jsx';
import { getProducts } from '../services/productService.js';
import { createSale } from '../services/saleService.js';
import { printTicket } from '../services/ticketService.js';
import { DEFAULT_CATEGORIES, getCategories } from '../utils/constants.js';
import ProductCard from '../components/pos/ProductCard.jsx';
import OrderItem from '../components/pos/OrderItem.jsx';
import OrderSummary from '../components/pos/OrderSummary.jsx';
import Modal from '../components/common/Modal.jsx';
import Toast from '../components/common/Toast.jsx';
import ProductCustomizationModal from '../components/pos/ProductCustomizationModal.jsx';
import { useToast } from '../hooks/useToast.js';
import { getOpenCashRegister } from '../services/cashRegisterService.js';
import { useNavigate } from 'react-router-dom';
import './AdminPOS.css';

export default function AdminPOS() {
  const { items, subtotal, impuestos, total, addItem, removeItem, clearOrder } = useAdminOrder();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const navigate = useNavigate();
  const [cashRegister, setCashRegister] = useState(null);

  useEffect(() => {
    loadCategories();
    loadProducts();
    loadCashRegister();
  }, [searchTerm, selectedCategory]);

  async function loadCashRegister() {
    try {
      const data = await getOpenCashRegister();
      setCashRegister(data);
    } catch (e) {
      console.error('Error cargando caja:', e);
    }
  }

  async function loadCategories() {
    try {
      setLoadingCategories(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadProducts() {
    try {
      setLoading(true);
      const category = selectedCategory === 'Todas' ? '' : selectedCategory;
      const data = await getProducts(searchTerm, category);
      setProducts(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleProductClick(product) {
    setSelectedProduct(product);
    setShowCustomizationModal(true);
  }

  function handleCustomizationConfirm(customization) {
    if (selectedProduct) {
      addItem(selectedProduct, customization);
    }
  }

  function handleRemoveItem(uniqueId) {
    removeItem(uniqueId);
  }

  async function handlePayment(method) {
    try {
      if (!cashRegister) {
        showToast('Debes abrir una caja antes de vender', 'error');
        return;
      }

      setProcessing(true);
      const saleData = {
        items: items.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          personalizaciones: item.personalizaciones,
          precio_unitario: item.precio_final
        })),
        metodo_pago: method
      };
      const sale = await createSale(saleData);
      
      // Imprimir ticket
      printTicket(sale);
      
      clearOrder();
      setShowPaymentModal(false);
      showToast('¡Venta registrada con éxito!', 'success');
    } catch (error) {
      console.error('Error al procesar venta:', error);
      showToast('Error al procesar la venta', 'error');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="admin-pos">

      <div className="admin-pos-left">
        {/* 🔥 Botón cerrar caja como vendedor */}
        <div style={{ marginBottom: 10 }}>
          {cashRegister ? (
            <>
              <div style={{ fontSize: 12, marginBottom: 6 }}>
                Caja activa: <strong>{cashRegister.nombre || `#${cashRegister.id}`}</strong>
              </div>
              <button
                className="admin-cat-btn"
                onClick={() => navigate(`/admin/cierre-caja/${cashRegister.id}`)}
              >
                Cerrar Caja
              </button>
            </>
          ) : (
            <button
              className="admin-cat-btn"
              onClick={() => navigate('/admin/apertura-caja')}
            >
              Abrir Caja
            </button>
          )}
        </div>
        <div className="admin-pos-controls">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="admin-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar productos por nombre"
              role="searchbox"
              id="admin-product-search"
            />
          </div>
          <div className="admin-category-filters" role="group" aria-label="Filtros de categoría">
            {categories.map(category => (
              <button
                key={category}
                className={`admin-cat-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
                aria-pressed={selectedCategory === category}
                aria-label={`Filtrar por ${category}`}
                disabled={loadingCategories}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="admin-pos-loading">
            <div className="pos-spinner"></div>
            <p>Cargando productos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="admin-pos-empty">
            <Coffee className="empty-icon" size={48} />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <div className="admin-products-grid">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={handleProductClick}
              />
            ))}
          </div>
        )}
      </div>

      <div className="admin-pos-right">
        <div className="admin-order-panel">
          <h2 className="admin-order-title">
            <ShoppingCart size={20} className="order-title-icon" />
            <span>Orden Actual</span>
          </h2>

          {items.length === 0 ? (
            <div className="admin-order-empty">
              <Coffee className="empty-icon" size={48} />
              <p>No hay productos en la orden</p>
            </div>
          ) : (
            <>
              <div className="admin-order-items">
                {items.map(item => (
                  <OrderItem
                    key={item.unique_id}
                    item={item}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
              <OrderSummary
                subtotal={subtotal}
                impuestos={impuestos}
                total={total}
                onCheckout={() => setShowPaymentModal(true)}
                onCancel={() => { clearOrder(); showToast('Venta cancelada', 'info'); }}
                onClear={() => { clearOrder(); showToast('Orden vaciada', 'info'); }}
                disabled={processing}
              />
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Seleccionar Método de Pago"
      >
        <div className="payment-methods">
          <button className="payment-method" onClick={() => handlePayment('efectivo')} disabled={processing}>
            <DollarSign size={24} />
            <span>Efectivo</span>
          </button>
          <button className="payment-method" onClick={() => handlePayment('tarjeta')} disabled={processing}>
            <CreditCard size={24} />
            <span>Tarjeta</span>
          </button>
          <button className="payment-method" onClick={() => handlePayment('transferencia')} disabled={processing}>
            <Smartphone size={24} />
            <span>Transferencia</span>
          </button>
        </div>
      </Modal>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}

      <ProductCustomizationModal
        product={selectedProduct}
        isOpen={showCustomizationModal}
        onClose={() => {
          setShowCustomizationModal(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleCustomizationConfirm}
      />
    </div>
  );
}
