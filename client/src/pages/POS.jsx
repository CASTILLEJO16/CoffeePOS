import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatBusinessTime } from '../utils/dateTime.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { Coffee, Search, DollarSign, CreditCard, Smartphone, X, Sun, Moon, LogOut } from 'lucide-react';
import { useOrder } from '../context/OrderContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getProducts } from '../services/productService.js';
import api from '../services/api.js';
import { createSale } from '../services/saleService.js';
import { printTicket } from '../services/ticketService.js';
import { printLabels } from '../services/labelService.js';
import { getOpenCashRegister } from '../services/cashRegisterService.js';
import { getAllConfig } from '../services/configService.js';
import { DEFAULT_CATEGORIES, getCategories } from '../utils/constants.js';
import ProductCard from '../components/pos/ProductCard.jsx';
import OrderItem from '../components/pos/OrderItem.jsx';
import OrderSummary from '../components/pos/OrderSummary.jsx';
import Modal from '../components/common/Modal.jsx';
import Toast from '../components/common/Toast.jsx';
import ProductCustomizationModal from '../components/pos/ProductCustomizationModal.jsx';
import CashPaymentModal from '../components/pos/CashPaymentModal.jsx';
import DollarPaymentModal from '../components/pos/DollarPaymentModal.jsx';
import MixedPaymentModal from '../components/pos/MixedPaymentModal.jsx';
import { useToast } from '../hooks/useToast.js';
import Swal from 'sweetalert2';
import './POS.css';

export default function POS() {
  const { items, subtotal, impuestos, total, addItem, removeItem, updateQuantity, clearOrder, recalcTotals, customerName, setCustomerName, updateItem } = useOrder();
  console.log('[POS] Estado de la orden - Items:', items.length, 'Subtotal:', subtotal, 'Impuestos:', impuestos, 'Total:', total);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showDollarModal, setShowDollarModal] = useState(false);
  const [showCardTypeModal, setShowCardTypeModal] = useState(false);
  const [showMixedPaymentModal, setShowMixedPaymentModal] = useState(false);
  const [currentTipoCambio, setCurrentTipoCambio] = useState(20.00); // Valor específico para el modal actual
  const [processing, setProcessing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Para edición de items existentes
  const [cashRegister, setCashRegister] = useState(null);
  const [tipoCambio, setTipoCambio] = useState(20.00);
  const [ivaRate, setIvaRate] = useState(0.16);
  const [imprimirEtiquetas, setImprimirEtiquetas] = useState(true);
  const { toast, showToast, hideToast } = useToast();

  // Log inicial para depurar
  console.log('[POS] Componente montado - tipoCambio inicial:', 20.00);
  
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

  useEffect(() => {
    loadProducts();
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    loadCategories();
    loadCashRegister();
    loadTipoCambio();
    loadIVA();
    loadLabelConfig();
  }, []);

  // Escuchar cambios de IVA en vivo
  useEffect(() => {
    function handleIVAUpdate() {
      loadIVA();
      recalcTotals();
    }
    window.addEventListener('ivaUpdated', handleIVAUpdate);
    return () => window.removeEventListener('ivaUpdated', handleIVAUpdate);
  }, []);

  // Escuchar cambios de configuración (tipo de cambio) usando localStorage (funciona entre pestañas)
  useEffect(() => {
    function handleConfigUpdate() {
      console.log('[POS] Evento configUpdated recibido, recargando tipo de cambio...');
      loadTipoCambio();
      loadLabelConfig();
    }
    
    function handleStorageChange(e) {
      if (e.key === 'config_updated_at') {
        console.log('[POS] Cambio en localStorage detectado, recargando tipo de cambio...');
        loadTipoCambio();
        loadLabelConfig();
      }
    }
    
    window.addEventListener('configUpdated', handleConfigUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('configUpdated', handleConfigUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  async function loadTipoCambio() {
    try {
      console.log('[POS] loadTipoCambio - Iniciando carga de tipo de cambio...');
      const config = await getAllConfig();
      console.log('[POS] loadTipoCambio - Respuesta completa:', config);
      const tc = config?.tipo_cambio_dolar;
      console.log('[POS] loadTipoCambio - Tipo de cambio extraído:', tc);
      if (tc) {
        const parsed = parseFloat(tc);
        console.log('[POS] loadTipoCambio - Tipo de cambio parseado:', parsed);
        setTipoCambio(parsed);
        console.log('[POS] loadTipoCambio - Estado tipoCambio actualizado a:', parsed);
      } else {
        console.warn('[POS] loadTipoCambio - No se encontró tipo_cambio_dolar en la respuesta');
      }
    } catch (error) {
      console.error('[POS] Error cargando tipo de cambio:', error);
    }
  }

  async function loadIVA() {
    try {
      // ✅ Usar SIEMPRE el IVA del frontend (evita que backend lo sobrescriba)
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

  async function loadLabelConfig() {
    try {
      const config = await getAllConfig();
      const imprimirEtiquetasConfig = config?.imprimir_etiquetas;
      setImprimirEtiquetas(imprimirEtiquetasConfig === '1' || imprimirEtiquetasConfig === 'true');
    } catch (error) {
      console.error('Error cargando configuración de etiquetas:', error);
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

  async function loadCashRegister() {
    try {
      const data = await getOpenCashRegister();
      setCashRegister(data);
    } catch (error) {
      console.error('Error al cargar caja:', error);
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
    if (editingItem) {
      // Estamos editando un item existente
      updateItem(editingItem.uniqueId, customization);
      setEditingItem(null);
    } else if (selectedProduct) {
      // Estamos agregando un nuevo producto
      addItem(selectedProduct, customization);
    }
    setShowCustomizationModal(false);
    setSelectedProduct(null);
  }

  function handleEditItem(item) {
    setEditingItem(item);
    setSelectedProduct({
      id: item.producto_id,
      nombre: item.producto_nombre,
      precio: item.precio_base,
      categoria: '', // Podríamos guardar esto en el item si es necesario
      descuento: item.descuento
    });
    setShowCustomizationModal(true);
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
      console.log('[POS] handlePayment called with method:', method);
      if (processing) return;

      if (method === 'efectivo') {
        console.log('[POS] Opening CashPaymentModal');
        setShowPaymentModal(false);
        setShowCashModal(true);
        return;
      }

      if (method === 'usd') {
        console.log('[POS] Opening DollarPaymentModal - Recargando tipo de cambio antes de abrir modal');
        console.log('[POS] Estado actual de la orden - Subtotal:', subtotal, 'Impuestos:', impuestos, 'Total:', total);
        await loadTipoCambio(); // Recargar tipo de cambio antes de abrir el modal
        const config = await getAllConfig();
        const tc = config?.tipo_cambio_dolar;
        const parsedTc = tc ? parseFloat(tc) : 20.00;
        console.log('[POS] DollarPaymentModal - Tipo de cambio cargado:', parsedTc);
        setCurrentTipoCambio(parsedTc); // Actualizar el valor específico para este modal
        console.log('[POS] Valor que se pasará al modal - Total:', total);
        setShowPaymentModal(false);
        setShowDollarModal(true);
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
          // ✅ enviar precio final (incluye extras)
          precio_final: item.precio_final
        })),
        metodo_pago: method,
        total_usd: totalUSD,
        // ✅ Enviar IVA actual al backend (tiempo real)
        iva_rate: localStorage.getItem('iva_rate')
      };

      const sale = await createSale(saleData);

      // 🔥 Notificar a otras pantallas (ej: Ventas) que hay nueva venta
      window.dispatchEvent(new Event('saleCreated'));
      
      // Imprimir ticket
      printTicket(sale, customerName);
      
      // Imprimir etiquetas automáticamente si está activado
      if (imprimirEtiquetas) {
        printLabels(sale, customerName);
      }
      
      clearOrder();
      setCustomerName('');
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

  async function handleDollarConfirm({ dolar_recibido, cambio_pesos, tipo_cambio, monto_dolar }) {
    try {
      console.log('[POS] handleDollarConfirm', { dolar_recibido, cambio_pesos, tipo_cambio, monto_dolar });
      if (processing) return;
      setProcessing(true);

      const saleData = {
        items: items.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          personalizaciones: item.personalizaciones,
          precio_final: item.precio_final
        })),
        metodo_pago: 'dolar',
        tipo_cambio,
        dolar_recibido,
        iva_rate: localStorage.getItem('iva_rate')
      };

      const sale = await createSale(saleData);
      window.dispatchEvent(new Event('saleCreated'));
      printTicket(sale, customerName);
      if (imprimirEtiquetas) {
        printLabels(sale, customerName);
      }
      clearOrder();
      setCustomerName('');
      setShowDollarModal(false);

      Swal.fire({
        title: '¡Venta Exitosa!',
        text: `Venta procesada: ${formatCurrency(total)} MXN = $${monto_dolar.toFixed(2)} USD`,
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
      printTicket(sale, customerName);
      if (imprimirEtiquetas) {
        printLabels(sale, customerName);
      }
      clearOrder();
      setCustomerName('');
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

  async function handleMixedPayment(paymentData) {
    try {
      console.log('[POS] handleMixedPayment', paymentData);
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
        metodo_pago: 'mixto',
        ...paymentData,
        iva_rate: localStorage.getItem('iva_rate')
      };

      const sale = await createSale(saleData);
      window.dispatchEvent(new Event('saleCreated'));
      printTicket(sale, customerName);
      if (imprimirEtiquetas) {
        printLabels(sale, customerName);
      }
      clearOrder();
      setCustomerName('');
      setShowMixedPaymentModal(false);

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
      console.log('[POS] handleCashConfirm', { recibido, cambio });
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
      printTicket(sale, customerName);
      if (imprimirEtiquetas) {
        printLabels(sale, customerName);
      }
      clearOrder();
      setCustomerName('');
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

  const filteredProducts = products;

  return (
    <div className="pos">
      <div className="pos-left">
        <div className="pos-header">
          <div className="pos-header-left">
            <Coffee className="pos-logo" size={28} />
            <h1 className="pos-title">Coffee POS</h1>
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
            {/* Indicador accesible de estado */}
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
              id="product-search"
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
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={handleProductClick}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pos-right">
        <div className="order-panel">
          <h2 className="order-title">Orden Actual</h2>
          
          <div className="customer-name-input" style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="Nombre del cliente (para etiqueta)"
              className="form-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '14px' }}
            />
          </div>
          
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
                    onEdit={handleEditItem}
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
        <div className="payment-selection-modal">
          <button
            className="payment-option-btn cash"
            onClick={() => handlePayment('efectivo')}
            disabled={processing}
          >
            <DollarSign size={32} className="payment-option-icon" />
            <span className="payment-option-label">Efectivo</span>
          </button>
          <button
            className="payment-option-btn card"
            onClick={() => handlePayment('tarjeta')}
            disabled={processing}
          >
            <CreditCard size={32} className="payment-option-icon" />
            <span className="payment-option-label">Tarjeta</span>
          </button>
          <button
            className="payment-option-btn usd"
            onClick={() => handlePayment('usd')}
            disabled={processing}
            aria-label="Pagar en dólares"
          >
            <DollarSign size={32} className="payment-option-icon" />
            <span className="payment-option-label">USD</span>
          </button>
          <button
            className="payment-option-btn mixed"
            onClick={() => {
              setShowPaymentModal(false);
              setShowMixedPaymentModal(true);
            }}
            disabled={processing}
          >
            <Smartphone size={32} className="payment-option-icon" />
            <span className="payment-option-label">Pago Mixto</span>
          </button>
        </div>
      </Modal>

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

      <MixedPaymentModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        total={total}
        onConfirm={handleCashConfirm}
      />

      <CashPaymentModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        total={total}
        onConfirm={handleCashConfirm}
      />

      <DollarPaymentModal
        isOpen={showDollarModal}
        onClose={() => setShowDollarModal(false)}
        total={total}
        tipoCambio={currentTipoCambio}
        onConfirm={handleDollarConfirm}
      />

      <MixedPaymentModal
        isOpen={showMixedPaymentModal}
        onClose={() => setShowMixedPaymentModal(false)}
        total={total}
        tipoCambio={currentTipoCambio}
        onConfirm={handleMixedPayment}
      />

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
          setEditingItem(null);
        }}
        onConfirm={handleCustomizationConfirm}
        existingCustomization={editingItem?.personalizaciones}
        isEdit={!!editingItem}
      />
    </div>
  );
}
