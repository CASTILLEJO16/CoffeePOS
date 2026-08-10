import { toSQLDate } from './dateTime.js';

/**
 * Normaliza método de pago a categorías conocidas
 */
export function normalizePaymentMethod(method) {
  const value = String(method || '').toLowerCase().trim();
  if (value === 'efectivo') return 'efectivo';
  if (value === 'tarjeta' || value === 'credito' || value === 'debito') return 'tarjeta';
  if (value === 'transferencia') return 'transferencia';
  return 'otros';
}

export const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  usd: 'USD',
  otros: 'Otros'
};

/**
 * Formatea el método de pago incluyendo el tipo de tarjeta si existe
 */
export function formatPaymentMethod(metodo, tipoTarjeta) {
  let label = PAYMENT_LABELS[normalizePaymentMethod(metodo)] || metodo;
  
  if (metodo === 'tarjeta' && tipoTarjeta) {
    const tipo = tipoTarjeta.charAt(0).toUpperCase() + tipoTarjeta.slice(1);
    label += ` (${tipo})`;
  }
  
  return label;
}

/**
 * Extrae YYYY-MM-DD de una fecha de venta
 */
export function getSaleDateKey(sale) {
  if (!sale?.fecha) return '';
  const raw = String(sale.fecha).trim().replace('T', ' ');
  return raw.slice(0, 10);
}

/**
 * Extrae hora (0-23) de una fecha de venta
 */
export function getSaleHour(sale) {
  if (!sale?.fecha) return 0;
  const raw = String(sale.fecha).trim().replace('T', ' ');
  const time = raw.split(' ')[1] || '00:00:00';
  return Number(time.slice(0, 2)) || 0;
}

/**
 * Cuenta productos de una venta
 */
export function countSaleProducts(sale) {
  if (!sale?.detalles?.length) return 0;
  return sale.detalles.reduce((sum, d) => sum + (Number(d.cantidad) || 0), 0);
}

/**
 * Rangos de fechas en Tijuana para KPIs
 */
export function getPeriodRanges(now = new Date()) {
  const todayKey = toSQLDate(now);
  const parts = (() => {
    // Usar partes Tijuana vía toSQLDate + Date local construido
    const [y, m, d] = todayKey.split('-').map(Number);
    return { y, m, d };
  })();

  const today = new Date(parts.y, parts.m - 1, parts.d);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const weekStart = new Date(today);
  const day = weekStart.getDay(); // 0 domingo
  const diff = day === 0 ? 6 : day - 1; // lunes como inicio
  weekStart.setDate(weekStart.getDate() - diff);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

  const monthStart = new Date(parts.y, parts.m - 1, 1);
  const prevMonthStart = new Date(parts.y, parts.m - 2, 1);
  const prevMonthEnd = new Date(parts.y, parts.m - 1, 0);

  return {
    today: { start: toSQLDate(today), end: toSQLDate(today) },
    yesterday: { start: toSQLDate(yesterday), end: toSQLDate(yesterday) },
    week: { start: toSQLDate(weekStart), end: toSQLDate(today) },
    prevWeek: { start: toSQLDate(prevWeekStart), end: toSQLDate(prevWeekEnd) },
    month: { start: toSQLDate(monthStart), end: toSQLDate(today) },
    prevMonth: { start: toSQLDate(prevMonthStart), end: toSQLDate(prevMonthEnd) }
  };
}

function inRange(sale, start, end) {
  const key = getSaleDateKey(sale);
  return key >= start && key <= end;
}

function sumSales(sales) {
  return sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
}

function growthPercent(current, previous) {
  if (previous === 0) {
    if (current === 0) return null;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Calcula KPIs del vendedor a partir de su historial
 */
export function computeSellerKpis(sales) {
  const ranges = getPeriodRanges();

  const todaySales = sales.filter((s) => inRange(s, ranges.today.start, ranges.today.end));
  const yesterdaySales = sales.filter((s) => inRange(s, ranges.yesterday.start, ranges.yesterday.end));
  const weekSales = sales.filter((s) => inRange(s, ranges.week.start, ranges.week.end));
  const prevWeekSales = sales.filter((s) => inRange(s, ranges.prevWeek.start, ranges.prevWeek.end));
  const monthSales = sales.filter((s) => inRange(s, ranges.month.start, ranges.month.end));
  const prevMonthSales = sales.filter((s) => inRange(s, ranges.prevMonth.start, ranges.prevMonth.end));

  const todayTotal = sumSales(todaySales);
  const weekTotal = sumSales(weekSales);
  const monthTotal = sumSales(monthSales);
  const ticketsHoy = todaySales.length;
  const productosHoy = todaySales.reduce((sum, s) => sum + countSaleProducts(s), 0);
  const promedio = ticketsHoy > 0 ? todayTotal / ticketsHoy : 0;

  const byMethod = { efectivo: 0, tarjeta: 0, tarjeta_credito: 0, tarjeta_debito: 0, transferencia: 0, otros: 0 };
  for (const sale of todaySales) {
    const key = normalizePaymentMethod(sale.metodo_pago);
    byMethod[key] += Number(sale.total) || 0;
    
    // Separar tarjeta por tipo
    if (sale.metodo_pago === 'tarjeta' && sale.tipo_tarjeta) {
      byMethod[`tarjeta_${sale.tipo_tarjeta}`] += Number(sale.total) || 0;
    }
  }

  return {
    ventasHoy: {
      value: todayTotal,
      growth: growthPercent(todayTotal, sumSales(yesterdaySales)),
      label: 'vs ayer'
    },
    ventasSemana: {
      value: weekTotal,
      growth: growthPercent(weekTotal, sumSales(prevWeekSales)),
      label: 'vs semana ant.'
    },
    ventasMes: {
      value: monthTotal,
      growth: growthPercent(monthTotal, sumSales(prevMonthSales)),
      label: 'vs mes ant.'
    },
    ticketsHoy: {
      value: ticketsHoy,
      growth: growthPercent(ticketsHoy, yesterdaySales.length),
      label: 'vs ayer'
    },
    productosHoy: {
      value: productosHoy,
      growth: growthPercent(
        productosHoy,
        yesterdaySales.reduce((sum, s) => sum + countSaleProducts(s), 0)
      ),
      label: 'vs ayer'
    },
    promedioVenta: {
      value: promedio,
      growth: null,
      label: 'hoy'
    },
    efectivo: { value: byMethod.efectivo, growth: null, label: 'hoy' },
    tarjeta: { value: byMethod.tarjeta, growth: null, label: 'hoy' },
    transferencia: { value: byMethod.transferencia, growth: null, label: 'hoy' },
    otros: { value: byMethod.otros, growth: null, label: 'hoy' },
    todaySales,
    weekSales,
    monthSales
  };
}

/**
 * Serie para gráfica según modo
 */
export function buildSalesChartSeries(sales, mode) {
  if (mode === 'hoy') {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      key: String(h).padStart(2, '0') + ':00',
      label: String(h).padStart(2, '0') + 'h',
      total: 0,
      tickets: 0
    }));

    for (const sale of sales) {
      const hour = getSaleHour(sale);
      hours[hour].total += Number(sale.total) || 0;
      hours[hour].tickets += 1;
    }

    // Mostrar solo rango operativo típico o horas con datos
    const withData = hours.filter((h) => h.total > 0 || h.tickets > 0);
    if (withData.length === 0) {
      return hours.slice(8, 21);
    }
    const first = Math.max(0, hours.findIndex((h) => h.tickets > 0) - 1);
    const lastIdx = [...hours].reverse().findIndex((h) => h.tickets > 0);
    const last = lastIdx === -1 ? 20 : Math.min(23, hours.length - 1 - lastIdx + 1);
    return hours.slice(Math.min(first, 8), Math.max(last, 12) + 1);
  }

  // Semana / mes: agrupar por día
  const map = new Map();
  for (const sale of sales) {
    const key = getSaleDateKey(sale);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { key, label: key.slice(5), total: 0, tickets: 0 });
    }
    const row = map.get(key);
    row.total += Number(sale.total) || 0;
    row.tickets += 1;
  }

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Distribución de métodos de pago
 */
export function buildPaymentBreakdown(sales) {
  const totals = { efectivo: 0, tarjeta: 0, transferencia: 0, otros: 0 };
  const tarjetaTipos = {}; // Para separar crédito y débito
  
  for (const sale of sales) {
    const metodo = normalizePaymentMethod(sale.metodo_pago);
    totals[metodo] += Number(sale.total) || 0;
    
    // Si es tarjeta, separar por tipo
    if (sale.metodo_pago === 'tarjeta' && sale.tipo_tarjeta) {
      const tipoKey = `tarjeta_${sale.tipo_tarjeta}`;
      if (!tarjetaTipos[tipoKey]) {
        tarjetaTipos[tipoKey] = 0;
      }
      tarjetaTipos[tipoKey] += Number(sale.total) || 0;
    }
  }
  
  // Si hay tipos de tarjeta separados, usarlos en lugar del total general de tarjeta
  const breakdown = [];
  let grand = 0;
  
  Object.entries(totals).forEach(([key, amount]) => {
    if (key === 'tarjeta') {
      // Si hay tipos específicos, agregarlos en lugar del total general
      if (Object.keys(tarjetaTipos).length > 0) {
        Object.entries(tarjetaTipos).forEach(([tipoKey, tipoAmount]) => {
          const tipo = tipoKey.replace('tarjeta_', '');
          breakdown.push({
            key: tipoKey,
            label: `Tarjeta (${tipo.charAt(0).toUpperCase() + tipo.slice(1)})`,
            amount: tipoAmount,
            percent: 0 // Se calculará después
          });
          grand += tipoAmount;
        });
      } else {
        breakdown.push({
          key,
          label: PAYMENT_LABELS[key],
          amount,
          percent: 0
        });
        grand += amount;
      }
    } else {
      breakdown.push({
        key,
        label: PAYMENT_LABELS[key],
        amount,
        percent: 0
      });
      grand += amount;
    }
  });
  
  // Calcular porcentajes
  breakdown.forEach(item => {
    item.percent = grand > 0 ? (item.amount / grand) * 100 : 0;
  });

  return breakdown;
}

/**
 * Top N productos del vendedor
 */
export function buildTopProducts(sales, limit = 5) {
  const map = new Map();
  let grandTotal = 0;

  for (const sale of sales) {
    for (const detail of sale.detalles || []) {
      const id = detail.producto_id || detail.producto_nombre;
      const name = detail.producto_nombre || 'Producto';
      const qty = Number(detail.cantidad) || 0;
      const income = Number(detail.importe) || 0;
      grandTotal += income;

      if (!map.has(id)) {
        map.set(id, { id, name, quantity: 0, income: 0 });
      }
      const row = map.get(id);
      row.quantity += qty;
      row.income += income;
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity || b.income - a.income)
    .slice(0, limit)
    .map((item) => ({
      ...item,
      percent: grandTotal > 0 ? (item.income / grandTotal) * 100 : 0
    }));
}

/**
 * Filtra y ordena historial para la tabla
 */
export function filterAndSortSales(sales, filters, sort) {
  let result = [...sales];

  const q = String(filters.search || '').trim().toLowerCase();
  if (q) {
    result = result.filter((sale) => {
      const folio = String(sale.id);
      const cliente = String(sale.cliente || 'cliente general').toLowerCase();
      const metodo = String(sale.metodo_pago || '').toLowerCase();
      const productos = (sale.detalles || [])
        .map((d) => d.producto_nombre || '')
        .join(' ')
        .toLowerCase();
      return (
        folio.includes(q) ||
        cliente.includes(q) ||
        metodo.includes(q) ||
        productos.includes(q)
      );
    });
  }

  if (filters.metodo && filters.metodo !== 'todos') {
    result = result.filter(
      (s) => normalizePaymentMethod(s.metodo_pago) === filters.metodo
    );
  }

  if (filters.estado && filters.estado !== 'todos') {
    // Sin campo estado real: todas se consideran completadas
    if (filters.estado === 'cancelada') {
      result = [];
    }
  }

  if (filters.folio) {
    const folio = String(filters.folio).trim();
    if (folio) {
      result = result.filter((s) => String(s.id).includes(folio));
    }
  }

  if (filters.cliente) {
    const cliente = String(filters.cliente).trim().toLowerCase();
    if (cliente) {
      result = result.filter((s) =>
        String(s.cliente || 'cliente general').toLowerCase().includes(cliente)
      );
    }
  }

  const dir = sort.direction === 'asc' ? 1 : -1;
  result.sort((a, b) => {
    switch (sort.field) {
      case 'total':
        return ((Number(a.total) || 0) - (Number(b.total) || 0)) * dir;
      case 'productos':
        return (countSaleProducts(a) - countSaleProducts(b)) * dir;
      case 'cliente':
        return String(a.cliente || '').localeCompare(String(b.cliente || '')) * dir;
      case 'hora':
        return String(a.fecha || '').localeCompare(String(b.fecha || '')) * dir;
      case 'fecha':
      default:
        return String(a.fecha || '').localeCompare(String(b.fecha || '')) * dir;
    }
  });

  return result;
}
