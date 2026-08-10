import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, DollarSign, ShoppingCart, Calendar, Download, Filter, BarChart3, PieChart as PieIcon, Award, Clock, FileText, FileSpreadsheet } from 'lucide-react';
import { getSalesKPIs } from '../services/saleService.js';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import { formatPaymentMethod } from '../utils/salesAnalytics.js';
import './AdminKPIs.css';

const VIBRANT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316'];

// Componente de Tooltip Flotante Estilizado en Modo Oscuro
const CustomTooltip = ({ active, payload, label, currency = true, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="kpi-custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((entry, index) => {
          const formattedVal = currency 
            ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(entry.value)
            : `${new Intl.NumberFormat('es-MX').format(entry.value)} ${unit}`;
          return (
            <p key={`item-${index}`} className="tooltip-item" style={{ color: entry.color || '#38bdf8' }}>
              <span className="tooltip-dot" style={{ backgroundColor: entry.color || '#38bdf8' }}></span>
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-val">{formattedVal}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export default function AdminKPIs() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('day');
  const [selectedYear, setSelectedYear] = useState('');
  const [customRange, setCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadKPIs();
  }, [period, startDate, endDate, selectedYear]);

  // Realtime refresh when a sale is created
  useEffect(() => {
    function handleSaleUpdate() {
      loadKPIs();
    }
    window.addEventListener('sale:created', handleSaleUpdate);
    window.addEventListener('storage', handleSaleUpdate);
    return () => {
      window.removeEventListener('sale:created', handleSaleUpdate);
      window.removeEventListener('storage', handleSaleUpdate);
    };
  }, []);

  async function loadKPIs() {
    try {
      setLoading(true);
      const data = await getSalesKPIs(
        customRange ? null : period,
        customRange ? startDate : null,
        customRange ? endDate : null,
        selectedYear || null
      );
      setKpis(data);
    } catch (error) {
      console.error('Error al cargar KPIs:', error);
    } finally {
      setLoading(false);
    }
  }

  function handlePeriodChange(newPeriod) {
    if (newPeriod === 'custom') {
      setCustomRange(true);
      setPeriod(newPeriod);
    } else {
      setCustomRange(false);
      setPeriod(newPeriod);
      setStartDate('');
      setEndDate('');
    }
  }

  // Generar Reporte de DATOS en PDF (sin capturar imágenes de gráficas)
  function handleExportPDF() {
    const element = document.getElementById('kpi-pdf-data-report');
    if (!element) return;

    element.style.display = 'block';

    const opt = {
      margin: [10, 12, 10, 12],
      filename: `reporte-datos-ventas-${selectedYear || period}-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        element.style.display = 'none';
      })
      .catch((err) => {
        console.error('Error al generar reporte PDF de datos:', err);
        element.style.display = 'none';
      });
  }

  // Generar Reporte de DATOS en Excel
  function handleExportExcel() {
    try {
      const workbook = XLSX.utils.book_new();

      // Hoja 1: Resumen General
      const summaryData = [
        ['MÉTRICA', 'VALOR'],
        ['Ventas Totales', kpis?.general?.total || 0],
        ['Número de Ventas', kpis?.general?.total_ventas || 0],
        ['Ticket Promedio', kpis?.general?.ticket_promedio || 0],
        ['Subtotal', kpis?.general?.subtotal || 0],
        ['Impuestos', kpis?.general?.impuestos || 0]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen General');

      // Hoja 2: Métodos de Pago
      const totalGeneral = kpis?.general?.total || 1;
      const paymentData = kpis?.por_metodo_pago?.map(p => ({
        'Método de Pago': formatPaymentMethod(p.metodo_pago, p.tipo_tarjeta),
        'Transacciones': p.cantidad,
        'Monto Total': p.total,
        'Participación (%)': ((p.total / totalGeneral) * 100).toFixed(1)
      })) || [];
      const paymentSheet = XLSX.utils.json_to_sheet(paymentData);
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Métodos de Pago');

      // Hoja 3: Ventas por Hora
      const hourlyData = kpis?.por_hora?.map(h => ({
        'Hora': `${h.hora}:00`,
        'Cantidad de Ventas': h.cantidad_ventas,
        'Total Ventas': h.total_ventas
      })) || [];
      const hourlySheet = XLSX.utils.json_to_sheet(hourlyData);
      XLSX.utils.book_append_sheet(workbook, hourlySheet, 'Ventas por Hora');

      // Hoja 4: Ventas por Día
      const dailyData = kpis?.por_dia?.map(d => ({
        'Fecha': d.fecha,
        'Cantidad de Ventas': d.cantidad_ventas,
        'Total Ventas': d.total_ventas
      })) || [];
      const dailySheet = XLSX.utils.json_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Ventas por Día');

      // Hoja 5: Rendimiento Mensual (si hay datos)
      if (monthlyData.length > 0) {
        const monthlySheetData = monthlyData.map(m => ({
          'Mes': m.mes,
          'Transacciones Realizadas': m.ventas,
          'Monto Acumulado': m.total
        }));
        const monthlySheet = XLSX.utils.json_to_sheet(monthlySheetData);
        XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Rendimiento Mensual');
      }

      // Hoja 6: Top Productos con número de ranking
      const topProductsData = kpis?.productos_top?.map(p => ({
        'Nombre del Producto': p.producto_nombre,
        'Unidades Vendidas': p.cantidad_vendida,
        'Ingresos Totales': p.total_ingresos
      })) || [];
      const topProductsWithRank = topProductsData.map((prod, idx) => ({
        '#': idx + 1,
        'Nombre del Producto': prod['Nombre del Producto'],
        'Unidades Vendidas': prod['Unidades Vendidas'],
        'Ingresos Totales': prod['Ingresos Totales']
      }));
      const productsSheet = XLSX.utils.json_to_sheet(topProductsWithRank);
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Productos');

      // Descargar archivo
      XLSX.writeFile(workbook, `reporte-ventas-${selectedYear || period}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error al generar reporte Excel:', error);
      alert('Error al generar reporte Excel: ' + error.message);
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(value);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('es-MX').format(value);
  }

  // Preparar datos para gráficos y tablas
  const hourlyData = kpis?.por_hora?.map(h => ({
    hora: `${h.hora}:00`,
    ventas: h.cantidad_ventas,
    total: h.total_ventas
  })) || [];

  const dailyData = kpis?.por_dia?.map(d => ({
    fecha: d.fecha,
    ventas: d.cantidad_ventas,
    total: d.total_ventas
  })) || [];

  const monthlyData = kpis?.por_mes?.map(m => ({
    mes: m.mes,
    ventas: m.ventas,
    total: m.total
  })) || [];

  const paymentData = kpis?.por_metodo_pago?.map(p => ({
    name: formatPaymentMethod(p.metodo_pago, p.tipo_tarjeta),
    value: Number(p.total || 0),
    cantidad: Number(p.cantidad || 0)
  })) || [];

  const topProductsData = kpis?.productos_top?.map(p => ({
    nombre: p.producto_nombre,
    cantidad: Number(p.cantidad_vendida || 0),
    ingresos: Number(p.total_ingresos || 0)
  })) || [];

  if (loading) {
    return (
      <div className="admin-page">
        <div className="kpi-loading">
          <div className="pos-spinner"></div>
          <p>Cargando métricas de ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-left">
          <div className="admin-title-wrapper">
            <BarChart3 className="admin-title-icon" size={28} />
            <h1 className="admin-title">KPIs de Ventas</h1>
          </div>
          <p className="admin-subtitle">Análisis visual de rendimiento y métricas clave del negocio</p>
        </div>
        <div className="export-buttons">
          <button className="export-btn" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} />
            Exportar Excel
          </button>
          <button className="export-btn" onClick={handleExportPDF}>
            <FileText size={18} />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="kpi-filters">
        <div className="filter-group">
          <Filter size={18} className="filter-icon" />
          <span className="filter-label">Filtrar por:</span>
          <div className="period-buttons">
            <button
              className={`period-btn ${period === 'day' && !customRange && !selectedYear ? 'active' : ''}`}
              onClick={() => { setSelectedYear(''); handlePeriodChange('day'); }}
            >
              Hoy
            </button>
            <button
              className={`period-btn ${period === 'week' && !customRange && !selectedYear ? 'active' : ''}`}
              onClick={() => { setSelectedYear(''); handlePeriodChange('week'); }}
            >
              Esta Semana
            </button>
            <button
              className={`period-btn ${period === 'month' && !customRange && !selectedYear ? 'active' : ''}`}
              onClick={() => { setSelectedYear(''); handlePeriodChange('month'); }}
            >
              Este Mes
            </button>
            <button
              className={`period-btn ${period === 'year' && !customRange ? 'active' : ''}`}
              onClick={() => handlePeriodChange('year')}
            >
              Este Año
            </button>
            <button
              className={`period-btn ${customRange ? 'active' : ''}`}
              onClick={() => { setSelectedYear(''); handlePeriodChange('custom'); }}
            >
              Personalizado
            </button>
          </div>
        </div>

        {/* Filtro por Año Específico */}
        <div className="filter-group year-filter-group">
          <Calendar size={18} className="filter-icon" />
          <span className="filter-label">Año:</span>
          <select
            value={selectedYear}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedYear(val);
              if (val) {
                setPeriod('year');
                setCustomRange(false);
              }
            }}
            className="year-select-dropdown"
          >
            <option value="">Todos / Período</option>
            {kpis?.anios_disponibles?.map(y => (
              <option key={y} value={y}>Año {y}</option>
            ))}
          </select>
        </div>

        {customRange && (
          <div className="custom-range-filters">
            <div className="date-input">
              <Calendar size={16} />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-picker"
              />
            </div>
            <span className="date-separator">-</span>
            <div className="date-input">
              <Calendar size={16} />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-picker"
              />
            </div>
          </div>
        )}
      </div>

      <div id="kpi-report" className="kpi-report">
        {/* KPI Cards */}
        <div className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-card-icon kpi-card-icon-blue">
              <DollarSign size={24} />
            </div>
            <div className="kpi-card-content">
              <p className="kpi-card-label">Total Ventas</p>
              <p className="kpi-card-value">{formatCurrency(kpis?.general?.total || 0)}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon kpi-card-icon-green">
              <ShoppingCart size={24} />
            </div>
            <div className="kpi-card-content">
              <p className="kpi-card-label">Número de Ventas</p>
              <p className="kpi-card-value">{formatNumber(kpis?.general?.total_ventas || 0)}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon kpi-card-icon-purple">
              <TrendingUp size={24} />
            </div>
            <div className="kpi-card-content">
              <p className="kpi-card-label">Ticket Promedio</p>
              <p className="kpi-card-value">{formatCurrency(kpis?.general?.ticket_promedio || 0)}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-icon kpi-card-icon-orange">
              <DollarSign size={24} />
            </div>
            <div className="kpi-card-content">
              <p className="kpi-card-label">Subtotal</p>
              <p className="kpi-card-value">{formatCurrency(kpis?.general?.subtotal || 0)}</p>
            </div>
          </div>
        </div>

        {/* Definición de Gradientes para Recharts */}
        <svg style={{ width: 0, height: 0, position: 'absolute' }}>
          <defs>
            <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.45} />
            </linearGradient>
            <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="productsGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#059669" stopOpacity={1} />
            </linearGradient>
          </defs>
        </svg>

        {/* Gráfico Destacado: Ventas por Mes (Enero - Diciembre) */}
        <div className="kpi-chart-card kpi-chart-card-full">
          <div className="chart-header-row">
            <Calendar size={22} className="chart-icon text-purple" />
            <h3 className="kpi-chart-title">
              Ventas por Mes (Rendimiento Mensual) {selectedYear ? `- Año ${selectedYear}` : ''}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mes" tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip currency={true} />} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="total" fill="url(#monthlyGradient)" radius={[8, 8, 0, 0]} name="Ventas Mensuales ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grid de Gráficos Secundarios */}
        <div className="kpi-charts-grid">
          
          {/* Gráfico 1: Ventas por Hora */}
          <div className="kpi-chart-card">
            <div className="chart-header-row">
              <Clock size={20} className="chart-icon text-indigo" />
              <h3 className="kpi-chart-title">Ventas por Hora (Picos de Venta)</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="hora" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip currency={true} />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="total" fill="url(#hourlyGradient)" radius={[8, 8, 0, 0]} name="Ventas ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 2: Tendencia Diaria de Ventas */}
          <div className="kpi-chart-card">
            <div className="chart-header-row">
              <TrendingUp size={20} className="chart-icon text-emerald" />
              <h3 className="kpi-chart-title">Tendencia de Ventas por Día</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="fecha" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip currency={true} />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fill="url(#dailyGradient)" 
                  name="Ventas ($)"
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 3: Métodos de Pago en Donut */}
          <div className="kpi-chart-card">
            <div className="chart-header-row">
              <PieIcon size={20} className="chart-icon text-purple" />
              <h3 className="kpi-chart-title">Ventas por Método de Pago</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={5}
                  cornerRadius={4}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip currency={true} />} />
                <Legend iconType="circle" verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 4: Productos Más Vendidos */}
          <div className="kpi-chart-card">
            <div className="chart-header-row">
              <Award size={20} className="chart-icon text-orange" />
              <h3 className="kpi-chart-title">Productos Más Vendidos</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProductsData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="nombre" type="category" width={110} tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip currency={false} unit="uds" />} />
                <Legend iconType="circle" />
                <Bar dataKey="cantidad" fill="url(#productsGradient)" radius={[0, 6, 6, 0]} name="Vendidos (unidades)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tablas Detalladas en Interfaz */}
        <div className="kpi-tables">
          <div className="kpi-table-card">
            <h3 className="kpi-table-title">Detalle por Método de Pago</h3>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>Método de Pago</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {paymentData.map((item, index) => (
                  <tr key={index}>
                    <td className="font-semibold">{item.name}</td>
                    <td>{formatNumber(item.cantidad)}</td>
                    <td className="text-emerald font-bold">{formatCurrency(item.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="kpi-table-card">
            <h3 className="kpi-table-title">Top 10 Productos</h3>
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad Vendida</th>
                  <th>Ingresos</th>
                </tr>
              </thead>
              <tbody>
                {topProductsData.map((item, index) => (
                  <tr key={index}>
                    <td className="font-semibold">{item.nombre}</td>
                    <td>{formatNumber(item.cantidad)}</td>
                    <td className="text-indigo font-bold">{formatCurrency(item.ingresos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PLANTILLA EXCLUSIVA PARA REPORTE DE DATOS PDF (SIN IMÁGENES DE GRÁFICAS) */}
      <div id="kpi-pdf-data-report" className="pdf-data-report-template" style={{ display: 'none' }}>
        <div className="pdf-header">
          <div className="pdf-header-title">
            <h2 className="pdf-company-name">COFFEE POS</h2>
            <p className="pdf-report-title">REPORTE EJECUTIVO DE DATOS Y VENTAS</p>
          </div>
          <div className="pdf-header-meta">
            <p><strong>Filtro:</strong> {selectedYear ? `Año ${selectedYear}` : period.toUpperCase()}</p>
            <p><strong>Fecha Emisión:</strong> {new Date().toLocaleDateString('es-MX')}</p>
          </div>
        </div>

        {/* 1. Resumen de Métricas Clave */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">1. Resumen General de Métricas</h3>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Métrica Comercial</th>
                <th className="text-right">Valor Registrado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ventas Totales ($)</td>
                <td className="text-right font-bold text-primary">{formatCurrency(kpis?.general?.total || 0)}</td>
              </tr>
              <tr>
                <td>Número Total de Transacciones</td>
                <td className="text-right">{formatNumber(kpis?.general?.total_ventas || 0)} ventas</td>
              </tr>
              <tr>
                <td>Ticket Promedio por Venta</td>
                <td className="text-right">{formatCurrency(kpis?.general?.ticket_promedio || 0)}</td>
              </tr>
              <tr>
                <td>Subtotal sin Impuestos</td>
                <td className="text-right">{formatCurrency(kpis?.general?.subtotal || 0)}</td>
              </tr>
              <tr>
                <td>Impuestos Generados (IVA)</td>
                <td className="text-right">{formatCurrency(kpis?.general?.impuestos || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Desglose por Método de Pago */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">2. Desglose de Ventas por Método de Pago</h3>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Método de Pago</th>
                <th className="text-center">Transacciones</th>
                <th className="text-right">Monto Total ($)</th>
                <th className="text-right">Participación (%)</th>
              </tr>
            </thead>
            <tbody>
              {paymentData.map((item, idx) => {
                const totalGen = kpis?.general?.total || 1;
                const pct = ((item.value / totalGen) * 100).toFixed(1);
                return (
                  <tr key={idx}>
                    <td className="font-semibold">{item.name}</td>
                    <td className="text-center">{formatNumber(item.cantidad)}</td>
                    <td className="text-right">{formatCurrency(item.value)}</td>
                    <td className="text-right">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3. Desglose de Ventas por Mes (Enero - Diciembre) */}
        {monthlyData.length > 0 && (
          <div className="pdf-section">
            <h3 className="pdf-section-title">3. Rendimiento Mensual de Ventas</h3>
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th className="text-center">Transacciones Realizadas</th>
                  <th className="text-right">Monto Acumulado ($)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, idx) => (
                  <tr key={idx}>
                    <td>{m.mes}</td>
                    <td className="text-center">{formatNumber(m.ventas)}</td>
                    <td className="text-right font-semibold">{formatCurrency(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Top 10 Productos Más Vendidos */}
        <div className="pdf-section">
          <h3 className="pdf-section-title">4. Top 10 Productos Más Vendidos</h3>
          <table className="pdf-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>#</th>
                <th>Nombre del Producto</th>
                <th className="text-center">Unidades Vendidas</th>
                <th className="text-right">Ingresos Totales ($)</th>
              </tr>
            </thead>
            <tbody>
              {topProductsData.map((prod, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td className="font-semibold">{prod.nombre}</td>
                  <td className="text-center">{formatNumber(prod.cantidad)}</td>
                  <td className="text-right">{formatCurrency(prod.ingresos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pie de Página PDF */}
        <div className="pdf-footer">
          <p>Coffee POS System — Documento Oficial de Reporte de Datos de Ventas</p>
        </div>
      </div>
    </div>
  );
}
