import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatBusinessTime } from '../utils/dateTime.js';
import { Search, Coffee, ShoppingCart, DollarSign, CreditCard, Smartphone, Sun, Moon, LogOut } from 'lucide-react';
import BranchSelector from '../components/common/BranchSelector.jsx';
import { useAdminOrder } from '../context/AdminOrderContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
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
import CashPaymentModal from '../components/pos/CashPaymentModal.jsx';
import { useToast } from '../hooks/useToast.js';
import { getOpenCashRegister } from '../services/cashRegisterService.js';
import Swal from 'sweetalert2';
import './AdminPOS.css';

export default function AdminPOS() {
  const { items, subtotal, impuestos, total, addItem, removeItem, updateQuantity, clearOrder, recalcTotals } = useAdminOrder();
  const { theme, toggleTheme } = useTheme();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showCardTypeModal, setShowCardTypeModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [cashRegister, setCashRegister] = useState(null);
  const [tipoCambio, setTipoCambio] = useState(18);
  const [ivaRate, setIvaRate] = useState(0.16);
  const { toast, showToast, hideToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
    loadProducts();
    loadCashRegister();
    loadTipoCambio();
    loadIVA();
  }, [searchTerm, selectedCategory]);

  // Atajos de teclado (modo POS rápido)
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Enter') {
        if (!showPaymentModal) {
          handleCheckout();
        }
      }
      if (e.key === 'Escape') {
        if (showPaymentModal) {
          setShowPaymentModal(false);
        } else {
          handleCancelSale();
        }
      }
      if (showPaymentModal) {
        if (e.key === '1') handlePayment('efectivo');
        if (e.key === '2') handlePayment('tarjeta');
        if (e.key === '3') handlePayment('usd');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showPaymentModal, items, processing]);

  // Escuchar cambios de IVA en vivo
  useEffect(() => {
    function handleIVAUpdate() {
      loadIVA();
      recalcTotals();
    }
    window.addEventListener('ivaUpdated', handleIVAUpdate);
    return () => window.removeEventListener('ivaUpdated', handleIVAUpdate);
  }, []);

  async function loadTipoCambio() {
    try {
      const res = await fetch('/api/configuracion');
      const json = await res.json();
      const tc = json?.data?.tipo_cambio;
      if (tc) setTipoCambio(parseFloat(tc));
    } catch {}
  }

  async function loadIVA() {
    try {
      const local = localStorage.getItem('iva_rate');
      const parsed = local ? parseFloat(local) : 0.16;
      if (!Number.isNaN(parsed)) {
        setIvaRate(parsed);
        recalcTotals();
      }
    } catch (e) {
      console.error('Error cargando IVA', e);
    }
  }

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

  function handleCheckout() {
    if (!items || items.length === 0) {
      showToast('Agrega productos antes de cobrar', 'info');
      return;
    }
    setShowPaymentModal(true);
  }

  async function handlePayment(method) {
    try {
      console.log('[AdminPOS] handlePayment called with method:', method);
      if (processing) return;

      if (method === 'efectivo') {
        console.log('[AdminPOS] Opening CashPaymentModal');
        setShowPaymentModal(false);
        setShowCashModal(true);
        return;
      }

      if (method === 'tarjeta') {
        setShowPaymentModal(false);
        setShowCardTypeModal(true);
        return;
      }

      if (!cashRegister) {
        showToast('Debes abrir una caja antes de vender', 'error');
        return;
      }

      if (!items || items.length === 0) {
        showToast('No hay productos en la orden', 'error');
        return;
      }
      setProcessing(true);
      
      let totalUSD = null;
      if (method === 'usd') {
        totalUSD = Number((total / tipoCambio).toFixed(2));
      }

      const saleData = {
        items: items.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          personalizaciones: item.personalizaciones,
          precio_final: item.precio_final
        })),
        metodo_pago: method,
        total_usd: totalUSD,
        iva_rate: localStorage.getItem('iva_rate')
      };

      const sale = await createSale(saleData);
      window.dispatchEvent(new Event('saleCreated'));
      printTicket(sale);
      clearOrder();
      setShowPaymentModal(false);

      Swal.fire({
        title: '¡Venta Exitosa!',
        text: 'La venta se ha procesado correctamente.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('Error al procesar venta:', error);
      showToast(error.message || 'Error al procesar la venta', 'error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCashConfirm({ recibido, cambio }) {
    try {
      console.log('[AdminPOS] handleCashConfirm', { recibido, cambio });
      if (processing) return;
      setProcessing(true);

      const saleData = {
        items: items.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          personalizaciones: item.personalizaciones,
          precio_final: item.precio_final
        })),
        metodo_pago: 'efectivo',
        monto_recibido: recibido,
        cambio,
        iva_rate: localStorage.getItem('iva_rate')
      };

      const sale = await createSale(saleData);
      window.dispatchEvent(new Event('saleCreated'));
      printTicket(sale);
      clearOrder();
      setShowCashModal(false);

      Swal.fire({
        title: '¡Venta Exitosa!',
        text: 'La venta se ha procesado correctamente.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('Error al procesar venta:', error);
      showToast(error.message || 'Error al procesar la venta', 'error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCardPayment(cardType) {
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
          precio_final: item.precio_final
        })),
        metodo_pago: 'tarjeta',
        tipo_tarjeta: cardType,
        iva_rate: localStorage.getItem('iva_rate')
      };
      const sale = await createSale(saleData);
      window.dispatchEvent(new Event('saleCreated'));
      printTicket(sale);
      clearOrder();
      setShowCardTypeModal(false);

      Swal.fire({
        title: '¡Venta Exitosa!',
        text: 'La venta se ha procesado correctamente.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        timer: 3000,
        timerProgressBar: true
      });
    } catch (error) {
      console.error('Error al procesar venta:', error);
      showToast('Error al procesar la venta', 'error');
    } finally {
      setProcessing(false);
    }
  }

  function handleCancelSale() {
    Swal.fire({
      title: '¿Cancelar venta?',
      text: 'Se perderán los productos agregados',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        clearOrder();
        showToast('Venta cancelada', 'info');
      }
    });
  }

  function handleClearOrder() {
    clearOrder();
    showToast('Orden vaciada', 'info');
  }

  function handleCloseCashRegister() {
    if (cashRegister) {
      navigate(`/cierre-caja/${cashRegister.id}`);
    }
  }

  return (
    <div className="admin-pos">
      <div className="admin-pos-left">
        <div className="pos-header">
          <div className="pos-header-left">
            <Coffee className="pos-logo" size={28} />
            <h1 className="pos-title">Coffee POS - Admin</h1>
            {cashRegister && (
              <div className="cash-register-info">
                <span className="cash-register-label">{cashRegister.nombre_caja || `Caja #${cashRegister.id}`}</span>
                <span className="cash-register-time">
                  {formatBusinessTime(cashRegister.fecha_apertura, false)}
                </span>
              </div>
            )}
          </div>
          <div className="pos-header-right">
            <BranchSelector />
            <div aria-live="polite" style={{ fontSize: 12, opacity: 0.8 }}>
              {cashRegister ? 'Caja abierta' : 'Sin caja abierta'}
            </div>
            {cashRegister && (
              <button
                className="close-cash-register-btn"
                onClick={handleCloseCashRegister}
                title="Cerrar Caja"
              >
                <LogOut size={20} />
                <span>Cerrar Caja</span>
              </button>
            )}
            <button
              className="theme-toggle-btn pos-theme-toggle"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
        
        <div className="pos-controls">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Buscar productos..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar productos por nombre"
              role="searchbox"
              id="admin-product-search"
              autoFocus
            />
          </div>
          
          <div className="category-filters" role="group" aria-label="Filtros de categoría">
            {categories.map(category => (
              <button
                key={category}
                className={`category-filter ${selectedCategory === category ? 'active' : ''}`}
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
          <div className="loading">Cargando productos...</div>
        ) : (
          <div className="products-grid">
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
        <div className="order-panel">
          <h2 className="order-title">Orden Actual</h2>
          
          {items.length === 0 ? (
            <div className="order-empty">
              <p>No hay productos en la orden</p>
            </div>
          ) : (
            <>
              <div className="order-items">
                {items.map(item => (
                  <OrderItem
                    key={item.uniqueId}
                    item={item}
                    onRemove={handleRemoveItem}
                    onUpdateQuantity={(id, qty) => updateQuantity(id, qty)}
                  />
                ))}
              </div>
              
              <OrderSummary
                subtotal={subtotal}
                impuestos={impuestos}
                total={total}
                onCheckout={handleCheckout}
                onCancel={handleCancelSale}
                onClear={handleClearOrder}
                disabled={processing}
              />
              {/* Atajos de teclado accesibles */}
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
                Enter = Cobrar | Esc = Cancelar
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Seleccionar Método de Pago">
        <div className="payment-methods">
          <button
            className="payment-method"
            onClick={() => handlePayment('efectivo')}
            disabled={processing}
          >
            <DollarSign size={24} />
            <span>Efectivo</span>
          </button>
          <button
            className="payment-method"
            onClick={() => handlePayment('tarjeta')}
            disabled={processing}
          >
            <CreditCard size={24} />
            <span>Tarjeta</span>
          </button>
          <button
            className="payment-method"
            onClick={() => handlePayment('usd')}
            disabled={processing}
            aria-label="Pagar en dólares"
          >
            <DollarSign size={24} />
            <span>USD</span>
          </button>
        </div>
      </Modal>

      <CashPaymentModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        total={total}
        onConfirm={handleCashConfirm}
      />

      <Modal
        isOpen={showCardTypeModal}
        onClose={() => setShowCardTypeModal(false)}
        title="Seleccionar Tipo de Tarjeta"
      >
        <div className="payment-methods">
          <button className="payment-method" onClick={() => handleCardPayment('credito')} disabled={processing}>
            <CreditCard size={24} />
            <span>Tarjeta de Crédito</span>
          </button>
          <button className="payment-method" onClick={() => handleCardPayment('debito')} disabled={processing}>
            <CreditCard size={24} />
            <span>Tarjeta de Débito</span>
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
