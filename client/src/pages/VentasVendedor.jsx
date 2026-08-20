import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  MoreHorizontal,
  Ticket,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  RefreshCw,
  Plus,
  Printer,
  Wallet,
  Eye,
  Download,
  Target,
  ShoppingBag,
  Filter,
  ChevronUp,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSales, getSaleById, refundSale } from '../services/saleService.js';
import { getOpenCashRegister } from '../services/cashRegisterService.js';
import { printTicket } from '../services/ticketService.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import Swal from 'sweetalert2';
import {
  formatBusinessDateTime,
  formatBusinessTime,
  toSQLDate
} from '../utils/dateTime.js';
import {
  computeSellerKpis,
  buildSalesChartSeries,
  buildPaymentBreakdown,
  buildTopProducts,
  filterAndSortSales,
  countSaleProducts,
  normalizePaymentMethod,
  PAYMENT_LABELS,
  formatPaymentMethod,
  getPeriodRanges
} from '../utils/salesAnalytics.js';
import SalesBarChart from '../components/ventas/SalesBarChart.jsx';
import SalesDonutChart from '../components/ventas/SalesDonutChart.jsx';
import Modal from '../components/common/Modal.jsx';
import './VentasVendedor.css';

const PERIOD_OPTIONS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'rango', label: 'Rango' }
];

const CHART_MODES = [
  { id: 'hoy', label: 'Por hora (Hoy)' },
  { id: 'semana', label: 'Por día (Semana)' },
  { id: 'mes', label: 'Por día (Mes)' }
];

function getPersonalizacionText(personalizaciones) {
  if (!personalizaciones) return '';
  const partes = [];
  const p = personalizaciones;
  if (p.milkType?.name) partes.push(p.milkType.name);
  if (p.toppings?.length) partes.push(p.toppings.map((t) => t.name).join(', '));
  if (p.coldFoam?.name) partes.push(p.coldFoam.name);
  if (p.syrup?.name) partes.push(p.syrup.name);
  if (p.sweetness?.name) partes.push(p.sweetness.name);
  if (p.teaOption?.name) partes.push(p.teaOption.name);
  return partes.join(' · ');
}

function GrowthBadge({ growth, label }) {
  if (growth === null || growth === undefined) {
    return <span className="growth-badge neutral"><Minus size={12} /></span>;
  }
  if (growth > 0) {
    return (
      <span className="growth-badge up">
        <TrendingUp size={12} /> +{Math.round(growth)}%
      </span>
    );
  }
  if (growth < 0) {
    return (
      <span className="growth-badge down">
        <TrendingDown size={12} /> {Math.round(growth)}%
      </span>
    );
  }
  return <span className="growth-badge neutral"><Minus size={12} /> 0%</span>;
}

function KpiCard({ icon: Icon, title, value, description, growth, label, loading }) {
  if (loading) {
    return (
      <div className="kpi-card skeleton-card">
        <div className="skeleton skeleton-icon" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
      </div>
    );
  }

  return (
    <article className="kpi-card">
      <div className="kpi-card-top">
        <span className="kpi-icon"><Icon size={18} /></span>
        <GrowthBadge growth={growth} label={label} />
      </div>
      <p className="kpi-title">{title}</p>
      <p className="kpi-value">{value}</p>
      <p className="kpi-desc">{description}</p>
    </article>
  );
}

export default function VentasVendedor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const historialRef = useRef(null);

  const [allSales, setAllSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cashRegister, setCashRegister] = useState(null);

  const [period, setPeriod] = useState('hoy');
  const [chartMode, setChartMode] = useState('hoy');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  const [filters, setFilters] = useState({
    search: '',
    metodo: 'todos',
    estado: 'todos',
    cliente: '',
    folio: ''
  });
  const [sort, setSort] = useState({ field: 'fecha', direction: 'desc' });

  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Estado para modal de devolución
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundPassword, setRefundPassword] = useState('');
  const [refundMotivo, setRefundMotivo] = useState('');
  const [refundError, setRefundError] = useState('');

  const goalKey = `seller_daily_goal_${user?.id || user?.userId || 'default'}`;
  const [dailyGoal, setDailyGoal] = useState(() => {
    const saved = localStorage.getItem(goalKey);
    return saved ? Number(saved) : 2000;
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const ranges = getPeriodRanges();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Usar fecha de hoy extendida para incluir ventas del servidor
      const today = new Date();
      today.setDate(today.getDate() + 1); // Agregar 1 día para incluir ventas de hoy del servidor
      const extendedEnd = toSQLDate(today);

      const data = await getSales({
        startDate: toSQLDate(sixMonthsAgo) < ranges.prevMonth.start
          ? toSQLDate(sixMonthsAgo)
          : ranges.prevMonth.start,
        endDate: extendedEnd
      });
      setAllSales(Array.isArray(data) ? data : []);

      try {
        const caja = await getOpenCashRegister();
        setCashRegister(caja && caja.estado === 'abierta' ? caja : null);
      } catch {
        setCashRegister(null);
      }
    } catch (err) {
      console.error('Error al cargar ventas:', err);
      setError(err.response?.data?.error || 'No se pudieron cargar tus ventas');
      setAllSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh only when page is visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadData]);

  // Instant update when a sale is created anywhere in the app
  useEffect(() => {
    const handler = (e) => {
      const nueva = e.detail;
      if (!nueva) return loadData();

      // Optimistic update: prepend new sale immediately
      setAllSales((prev) => {
        const exists = prev.some((s) => s.id === nueva.id);
        if (exists) return prev;
        return [nueva, ...prev];
      });
    };

    window.addEventListener('sale:created', handler);
    return () => window.removeEventListener('sale:created', handler);
  }, [loadData]);

  // Cross-tab communication using localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'sale:last_updated') {
        loadData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  useEffect(() => {
    localStorage.setItem(goalKey, String(dailyGoal || 0));
  }, [dailyGoal, goalKey]);

  const kpis = useMemo(() => computeSellerKpis(allSales), [allSales]);

  // Obtener la fecha más reciente de las ventas para usar como referencia
  const serverToday = useMemo(() => {
    if (allSales.length === 0) return toSQLDate();
    const latestSale = allSales[0];
    const saleDate = String(latestSale.fecha || '').slice(0, 10);
    return saleDate;
  }, [allSales]);

  const periodSales = useMemo(() => {
    if (period === 'hoy') {
      // Filtrar por fecha del servidor
      return allSales.filter((s) => {
        const key = String(s.fecha || '').slice(0, 10);
        return key === serverToday;
      });
    }
    if (period === 'ayer') {
      // Calcular ayer basado en la fecha del servidor
      const serverDate = new Date(serverToday);
      serverDate.setDate(serverDate.getDate() - 1);
      const yesterdayKey = serverDate.toISOString().slice(0, 10);
      return allSales.filter((s) => {
        const key = String(s.fecha || '').slice(0, 10);
        return key === yesterdayKey;
      });
    }
    if (period === 'semana') {
      // Últimos 7 días desde la fecha del servidor
      const serverDate = new Date(serverToday);
      const weekAgo = new Date(serverDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return allSales.filter((s) => {
        const key = String(s.fecha || '').slice(0, 10);
        return key >= weekAgo.toISOString().slice(0, 10) && key <= serverToday;
      });
    }
    if (period === 'mes') {
      // Últimos 30 días desde la fecha del servidor
      const serverDate = new Date(serverToday);
      const monthAgo = new Date(serverDate);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return allSales.filter((s) => {
        const key = String(s.fecha || '').slice(0, 10);
        return key >= monthAgo.toISOString().slice(0, 10) && key <= serverToday;
      });
    }
    if (period === 'rango' && customRange.start && customRange.end) {
      return allSales.filter((s) => {
        const key = String(s.fecha || '').slice(0, 10);
        return key >= customRange.start && key <= customRange.end;
      });
    }
    // Default: hoy
    return allSales.filter((s) => {
      const key = String(s.fecha || '').slice(0, 10);
      return key === serverToday;
    });
  }, [allSales, period, customRange, serverToday]);

  const chartSales = useMemo(() => {
    if (chartMode === 'hoy') return kpis.todaySales;
    if (chartMode === 'semana') return kpis.weekSales;
    return kpis.monthSales;
  }, [chartMode, kpis]);

  const chartSeries = useMemo(
    () => buildSalesChartSeries(chartSales, chartMode),
    [chartSales, chartMode]
  );

  const paymentBreakdown = useMemo(
    () => buildPaymentBreakdown(periodSales),
    [periodSales]
  );

  const topProducts = useMemo(
    () => buildTopProducts(periodSales, 5),
    [periodSales]
  );

  const filteredSales = useMemo(
    () => filterAndSortSales(periodSales, filters, sort),
    [periodSales, filters, sort]
  );

  const lastSale = useMemo(() => {
    if (!kpis.todaySales.length && !allSales.length) return null;
    return [...allSales].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0] || null;
  }, [allSales, kpis.todaySales.length]);

  const goalProgress = dailyGoal > 0 ? Math.min(100, (kpis.ventasHoy.value / dailyGoal) * 100) : 0;
  const goalRemaining = Math.max(0, dailyGoal - kpis.ventasHoy.value);

  function toggleSort(field) {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'desc' }
    );
  }

  function SortIcon({ field }) {
    if (sort.field !== field) return null;
    return sort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  }

  async function handleViewDetail(venta) {
    try {
      setActionLoading(true);
      const full = await getSaleById(venta.id);
      setVentaSeleccionada(full || venta);
    } catch {
      setVentaSeleccionada(venta);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReprint(venta) {
    try {
      setActionLoading(true);
      const full = await getSaleById(venta.id);
      printTicket(full || venta);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo reimprimir el ticket');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownload(venta) {
    // Usa el ticket imprimible; el usuario puede guardar como PDF desde el navegador
    await handleReprint(venta);
  }

  function handleOpenRefundModal(venta) {
    setVentaSeleccionada(venta);
    setRefundModalOpen(true);
    setRefundPassword('');
    setRefundMotivo('');
    setRefundError('');
  }

  function handleCloseRefundModal() {
    setRefundModalOpen(false);
    setRefundPassword('');
    setRefundMotivo('');
    setRefundError('');
    setVentaSeleccionada(null);
  }

  async function handleRefund() {
    if (!ventaSeleccionada) return;

    const result = await Swal.fire({
      title: '¿Confirmar devolución?',
      text: `¿Estás seguro de devolver la venta #${ventaSeleccionada.id} por ${formatCurrency(ventaSeleccionada.total)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, devolver',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    setRefundError('');

    try {
      await refundSale(ventaSeleccionada.id, refundPassword, refundMotivo);
      handleCloseRefundModal();
      loadData(); // Recargar ventas

      await Swal.fire({
        title: '¡Devolución Exitosa!',
        text: 'La venta ha sido devuelta correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      setRefundError(err.response?.data?.error || 'Error al procesar la devolución');
      await Swal.fire({
        title: 'Error',
        text: err.response?.data?.error || 'Error al procesar la devolución',
        icon: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  }

  function handleSaveGoal() {
    const value = Number(goalDraft);
    if (!Number.isNaN(value) && value >= 0) {
      setDailyGoal(value);
    }
    setEditingGoal(false);
  }

  function scrollToHistorial() {
    historialRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleCorteCaja() {
    if (cashRegister?.id) {
      navigate(`/cierre-caja/${cashRegister.id}`);
    } else {
      navigate('/apertura-caja');
    }
  }

  const kpiItems = [
    {
      icon: Calendar,
      title: 'Ventas de hoy',
      value: formatCurrency(kpis.ventasHoy.value),
      description: 'Total generado hoy',
      growth: kpis.ventasHoy.growth,
      label: kpis.ventasHoy.label
    },
    {
      icon: BarChart3,
      title: 'Ventas de la semana',
      value: formatCurrency(kpis.ventasSemana.value),
      description: 'Acumulado semanal',
      growth: kpis.ventasSemana.growth,
      label: kpis.ventasSemana.label
    },
    {
      icon: TrendingUp,
      title: 'Ventas del mes',
      value: formatCurrency(kpis.ventasMes.value),
      description: 'Acumulado mensual',
      growth: kpis.ventasMes.growth,
      label: kpis.ventasMes.label
    },
    {
      icon: Ticket,
      title: 'Tickets hoy',
      value: String(kpis.ticketsHoy.value),
      description: 'Tickets generados',
      growth: kpis.ticketsHoy.growth,
      label: kpis.ticketsHoy.label
    },
    {
      icon: Package,
      title: 'Productos vendidos',
      value: String(kpis.productosHoy.value),
      description: 'Unidades vendidas hoy',
      growth: kpis.productosHoy.growth,
      label: kpis.productosHoy.label
    },
    {
      icon: ShoppingBag,
      title: 'Promedio por venta',
      value: formatCurrency(kpis.promedioVenta.value),
      description: 'Ticket promedio hoy',
      growth: null,
      label: 'hoy'
    },
    {
      icon: Banknote,
      title: 'Efectivo',
      value: formatCurrency(kpis.efectivo.value),
      description: 'Ventas en efectivo hoy',
      growth: null,
      label: 'hoy'
    },
    {
      icon: CreditCard,
      title: 'Tarjeta',
      value: formatCurrency(kpis.tarjeta.value),
      description: 'Ventas con tarjeta hoy',
      growth: null,
      label: 'hoy'
    },
    {
      icon: ArrowLeftRight,
      title: 'Transferencia',
      value: formatCurrency(kpis.transferencia.value),
      description: 'Ventas por transferencia',
      growth: null,
      label: 'hoy'
    },
    {
      icon: MoreHorizontal,
      title: 'Otros métodos',
      value: formatCurrency(kpis.otros.value),
      description: 'Otros pagos hoy',
      growth: null,
      label: 'hoy'
    }
  ];

  return (
    <div className="admin-page mis-ventas-page">
      <header className="mv-header">
        <div>
          <div className="mv-title-row">
            <BarChart3 className="mv-title-icon" size={28} />
            <h1 className="mv-title">Mis Ventas</h1>
          </div>
          <p className="mv-subtitle">
            Tu desempeño personal · Solo tus tickets y estadísticas
          </p>
        </div>

        <div className="mv-quick-actions">
          <button type="button" className="mv-action-btn primary" onClick={() => navigate('/')}>
            <Plus size={16} /> Nueva venta
          </button>
          <button
            type="button"
            className="mv-action-btn"
            onClick={() => lastSale && handleReprint(lastSale)}
            disabled={!lastSale || actionLoading}
          >
            <Printer size={16} /> Reimprimir
          </button>
          <button type="button" className="mv-action-btn" onClick={handleCorteCaja}>
            <Wallet size={16} /> {cashRegister ? 'Corte de caja' : 'Abrir caja'}
          </button>
          <button type="button" className="mv-action-btn" onClick={scrollToHistorial}>
            <Ticket size={16} /> Historial
          </button>
          <button type="button" className="mv-action-btn" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="mv-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')}>Cerrar</button>
        </div>
      )}

      <section className="kpi-grid" aria-label="Indicadores de desempeño">
        {kpiItems.map((item) => (
          <KpiCard key={item.title} {...item} loading={loading} />
        ))}
      </section>

      <section className="mv-mid-grid">
        <article className="mv-card chart-card">
          <div className="mv-card-header">
            <div>
              <h2>Gráfica de ventas</h2>
              <p>Visualiza tu ritmo de ventas</p>
            </div>
            <div className="chart-mode-tabs">
              {CHART_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={chartMode === mode.id ? 'active' : ''}
                  onClick={() => setChartMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <SalesBarChart data={chartSeries} formatValue={formatCurrency} />
          )}
        </article>

        <article className="mv-card">
          <div className="mv-card-header">
            <div>
              <h2>Métodos de pago</h2>
              <p>Distribución del período seleccionado</p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton skeleton-chart" />
          ) : (
            <SalesDonutChart data={paymentBreakdown} formatValue={formatCurrency} />
          )}
        </article>
      </section>

      <section className="mv-mid-grid secondary">
        <article className="mv-card">
          <div className="mv-card-header">
            <div>
              <h2>Productos más vendidos</h2>
              <p>Top 5 de tu período</p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton-list">
              {[1, 2, 3].map((n) => <div key={n} className="skeleton skeleton-line" />)}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="mv-empty compact">
              <Package size={28} />
              <p>Aún no hay productos vendidos en este período</p>
            </div>
          ) : (
            <ul className="top-products-list">
              {topProducts.map((product, index) => (
                <li key={product.id}>
                  <span className="top-rank">{index + 1}</span>
                  <div className="top-info">
                    <strong>{product.name}</strong>
                    <span>{product.quantity} uds · {formatCurrency(product.income)}</span>
                    <div className="top-bar">
                      <div style={{ width: `${Math.max(product.percent, 4)}%` }} />
                    </div>
                  </div>
                  <span className="top-percent">{product.percent.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="mv-card">
          <div className="mv-card-header">
            <div>
              <h2>Meta personal</h2>
              <p>Objetivo diario configurable</p>
            </div>
            {!editingGoal ? (
              <button
                type="button"
                className="mv-link-btn"
                onClick={() => {
                  setGoalDraft(String(dailyGoal));
                  setEditingGoal(true);
                }}
              >
                Editar
              </button>
            ) : null}
          </div>

          {editingGoal ? (
            <div className="goal-edit">
              <label htmlFor="daily-goal">Meta diaria (MXN)</label>
              <div className="goal-edit-row">
                <input
                  id="daily-goal"
                  type="number"
                  min="0"
                  step="50"
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                />
                <button type="button" className="mv-action-btn primary" onClick={handleSaveGoal}>
                  Guardar
                </button>
                <button type="button" className="mv-action-btn" onClick={() => setEditingGoal(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="goal-panel">
              <div className="goal-icon"><Target size={22} /></div>
              <div className="goal-stats">
                <div className="goal-row">
                  <span>Meta diaria</span>
                  <strong>{formatCurrency(dailyGoal)}</strong>
                </div>
                <div className="goal-row">
                  <span>Vendido hoy</span>
                  <strong>{formatCurrency(kpis.ventasHoy.value)}</strong>
                </div>
                <div className="goal-progress-track">
                  <div className="goal-progress-fill" style={{ width: `${goalProgress}%` }} />
                </div>
                <div className="goal-row muted">
                  <span>{goalProgress.toFixed(0)}% de avance</span>
                  <span>Restan {formatCurrency(goalRemaining)}</span>
                </div>
              </div>
            </div>
          )}
        </article>

        <article className="mv-card last-sale-card">
          <div className="mv-card-header">
            <div>
              <h2>Última venta</h2>
              <p>Tu ticket más reciente</p>
            </div>
          </div>
          {loading ? (
            <div className="skeleton skeleton-chart" />
          ) : !lastSale ? (
            <div className="mv-empty compact">
              <Ticket size={28} />
              <p>Todavía no registras ventas</p>
            </div>
          ) : (
            <div className="last-sale">
              <div className="last-sale-main">
                <span className="last-sale-folio">#{lastSale.id}</span>
                <span className={`payment-chip ${normalizePaymentMethod(lastSale.metodo_pago)}`}>
                  {formatPaymentMethod(lastSale.metodo_pago, lastSale.tipo_tarjeta)}
                </span>
              </div>
              <div className="last-sale-grid">
                <div>
                  <span className="meta-label">Fecha</span>
                  <strong>{formatBusinessDateTime(lastSale.fecha).split(',')[0]}</strong>
                </div>
                <div>
                  <span className="meta-label">Hora</span>
                  <strong>{formatBusinessTime(lastSale.fecha, false)}</strong>
                </div>
                <div>
                  <span className="meta-label">Cliente</span>
                  <strong>{lastSale.cliente || 'Cliente general'}</strong>
                </div>
                <div>
                  <span className="meta-label">Productos</span>
                  <strong>{countSaleProducts(lastSale)}</strong>
                </div>
              </div>
              <p className="last-sale-products">
                {(lastSale.detalles || [])
                  .slice(0, 3)
                  .map((d) => `${d.cantidad}x ${d.producto_nombre}`)
                  .join(' · ') || 'Sin detalle de productos'}
                {(lastSale.detalles || []).length > 3 ? '…' : ''}
              </p>
              <div className="last-sale-footer">
                <strong>{formatCurrency(lastSale.total)}</strong>
                <button
                  type="button"
                  className="mv-action-btn primary"
                  onClick={() => handleViewDetail(lastSale)}
                >
                  <Eye size={16} /> Ver detalle
                </button>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="mv-card historial-card" ref={historialRef}>
        <div className="mv-card-header">
          <div>
            <h2>Historial de ventas</h2>
            <p>{filteredSales.length} ticket(s) en el período</p>
          </div>
        </div>

        <div className="historial-filters">
            <div className="period-tabs">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={period === opt.id ? 'active' : ''}
                onClick={() => {
                  setPeriod(opt.id);
                  if (opt.id === 'rango' && !customRange.start) {
                    const ranges = getPeriodRanges();
                    setCustomRange({ start: ranges.week.start, end: ranges.today.end });
                  }
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {period === 'rango' && (
            <div className="range-inputs">
              <label>
                Desde
                <input
                  type="date"
                  value={customRange.start || toSQLDate()}
                  onChange={(e) => setCustomRange((p) => ({ ...p, start: e.target.value }))}
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  value={customRange.end || toSQLDate()}
                  onChange={(e) => setCustomRange((p) => ({ ...p, end: e.target.value }))}
                />
              </label>
            </div>
          )}

          <div className="filter-grid">
            <div className="search-field">
              <Search size={16} />
              <input
                type="search"
                placeholder="Buscar folio, cliente o producto…"
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              />
            </div>
            <select
              value={filters.metodo}
              onChange={(e) => setFilters((p) => ({ ...p, metodo: e.target.value }))}
              aria-label="Método de pago"
            >
              <option value="todos">Todos los métodos</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="otros">Otros</option>
            </select>
            <select
              value={filters.estado}
              onChange={(e) => setFilters((p) => ({ ...p, estado: e.target.value }))}
              aria-label="Estado"
            >
              <option value="todos">Todos los estados</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
            <input
              type="text"
              placeholder="Folio"
              value={filters.folio}
              onChange={(e) => setFilters((p) => ({ ...p, folio: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Cliente"
              value={filters.cliente}
              onChange={(e) => setFilters((p) => ({ ...p, cliente: e.target.value }))}
            />
          </div>
        </div>

        {loading ? (
          <div className="skeleton-table">
            {[1, 2, 3, 4, 5].map((n) => <div key={n} className="skeleton skeleton-line" />)}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="mv-empty">
            <Filter size={32} />
            <h3>Sin resultados</h3>
            <p>No hay ventas con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="mv-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => toggleSort('fecha')}>
                      Fecha <SortIcon field="fecha" />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => toggleSort('hora')}>
                      Hora <SortIcon field="hora" />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => toggleSort('cliente')}>
                      Cliente <SortIcon field="cliente" />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => toggleSort('productos')}>
                      Productos <SortIcon field="productos" />
                    </button>
                  </th>
                  <th>Método</th>
                  <th>
                    <button type="button" className="th-sort" onClick={() => toggleSort('total')}>
                      Total <SortIcon field="total" />
                    </button>
                  </th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((venta) => (
                  <tr key={venta.id}>
                    <td data-label="Folio">#{venta.id}</td>
                    <td data-label="Fecha">
                      {formatBusinessDateTime(venta.fecha).split(',')[0]}
                    </td>
                    <td data-label="Hora">{formatBusinessTime(venta.fecha, false)}</td>
                    <td data-label="Cliente">{venta.cliente || 'Cliente general'}</td>
                    <td data-label="Productos">{countSaleProducts(venta)}</td>
                    <td data-label="Método">
                      <span className={`payment-chip ${normalizePaymentMethod(venta.metodo_pago)}`}>
                        {formatPaymentMethod(venta.metodo_pago, venta.tipo_tarjeta)}
                      </span>
                    </td>
                    <td data-label="Total" className="total-cell">{formatCurrency(venta.total)}</td>
                    <td data-label="Estado">
                      <span className={`status-chip ${venta.cancelada ? 'cancelled' : 'completed'}`}>
                        {venta.cancelada ? 'Cancelada' : 'Completada'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="row-actions">
                        <button
                          type="button"
                          title="Ver detalle"
                          onClick={() => handleViewDetail(venta)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          title="Reimprimir"
                          onClick={() => handleReprint(venta)}
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          type="button"
                          title="Descargar / Guardar PDF"
                          onClick={() => handleDownload(venta)}
                        >
                          <Download size={16} />
                        </button>
                        {!venta.cancelada && (
                          <button
                            type="button"
                            title="Devolver venta"
                            onClick={() => handleOpenRefundModal(venta)}
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Devolución */}
      <Modal
        isOpen={refundModalOpen}
        onClose={handleCloseRefundModal}
        title="Devolver Venta"
        size="medium"
        footer={
          <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCloseRefundModal}
              disabled={actionLoading}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '2px solid var(--color-border)',
                background: 'var(--color-surface)',
                cursor: actionLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRefund}
              disabled={actionLoading || !refundPassword}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--color-danger)',
                color: 'white',
                cursor: actionLoading || !refundPassword ? 'not-allowed' : 'pointer',
                opacity: actionLoading || !refundPassword ? 0.5 : 1
              }}
            >
              {actionLoading ? 'Procesando...' : 'Devolver'}
            </button>
          </div>
        }
      >
        {ventaSeleccionada && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: 'var(--color-surface-muted)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                Venta #{ventaSeleccionada.id}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                Total: {formatCurrency(ventaSeleccionada.total)}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.8 }}>
                Cliente: {ventaSeleccionada.cliente || 'Cliente general'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Contraseña de autorización
              </label>
              <input
                type="password"
                value={refundPassword}
                onChange={(e) => setRefundPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid var(--color-border)',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Motivo de la devolución (opcional)
              </label>
              <textarea
                value={refundMotivo}
                onChange={(e) => setRefundMotivo(e.target.value)}
                placeholder="Describe el motivo de la devolución..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid var(--color-border)',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            {refundError && (
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                fontSize: '14px'
              }}>
                {refundError}
              </div>
            )}

            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--color-warning-light)',
              color: 'var(--color-warning)',
              fontSize: '13px'
            }}>
              ⚠️ Esta acción cancelará la venta y descontará el monto de la caja. Esta acción no se puede deshacer.
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!ventaSeleccionada && !refundModalOpen}
        onClose={() => setVentaSeleccionada(null)}
        title={ventaSeleccionada ? `Ticket #${ventaSeleccionada.id}` : 'Detalle'}
        size="large"
      >
        {ventaSeleccionada && (
          <div className="sale-detail-modal">
            <div className="sale-detail-meta">
              <div>
                <span className="meta-label">Fecha y hora</span>
                <strong>{formatBusinessDateTime(ventaSeleccionada.fecha)}</strong>
              </div>
              <div>
                <span className="meta-label">Cliente</span>
                <strong>{ventaSeleccionada.cliente || 'Cliente general'}</strong>
              </div>
              <div>
                <span className="meta-label">Método</span>
                <strong>
                  {PAYMENT_LABELS[normalizePaymentMethod(ventaSeleccionada.metodo_pago)]}
                </strong>
              </div>
              <div>
                <span className="meta-label">Total</span>
                <strong>{formatCurrency(ventaSeleccionada.total)}</strong>
              </div>
            </div>

            <h3>Productos</h3>
            <div className="sale-detail-items">
              {(ventaSeleccionada.detalles || []).map((detalle, index) => (
                <div key={index} className="sale-detail-item">
                  <div className="sale-detail-item-main">
                    <span>{detalle.cantidad}x {detalle.producto_nombre}</span>
                    <strong>{formatCurrency(detalle.importe)}</strong>
                  </div>
                  {detalle.personalizaciones && (
                    <p className="sale-detail-custom">
                      {getPersonalizacionText(detalle.personalizaciones)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="sale-detail-actions">
              <button
                type="button"
                className="mv-action-btn"
                onClick={() => handleReprint(ventaSeleccionada)}
              >
                <Printer size={16} /> Reimprimir
              </button>
              <button
                type="button"
                className="mv-action-btn primary"
                onClick={() => handleDownload(ventaSeleccionada)}
              >
                <Download size={16} /> Guardar PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
