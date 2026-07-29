/**
 * Servicio de Tickets
 * Genera tickets en formato ESC/POS para impresoras térmicas
 */

/**
 * Genera un ticket en formato texto para impresión
 * @param {Object} sale - Venta con detalles
 * @returns {string} Ticket formateado
 */
export function generateTicket(sale) {
  const lines = [];
  const width = 42; // Ancho estándar para impresoras térmicas

  // Encabezado
  lines.push(''.padEnd(width, '='));
  lines.push('CAFETERÍA POS'.padStart(width / 2 + 7).padEnd(width));
  lines.push(''.padEnd(width, '='));
  lines.push('');
  lines.push(`Ticket #: ${sale.id}`);
  lines.push(`Fecha: ${formatDate(sale.fecha)}`);
  lines.push(`Método: ${sale.metodo_pago.toUpperCase()}`);
  lines.push(''.padEnd(width, '-'));

  // Detalles de productos
  lines.push('CANT  PRODUCTO              PRECIO    IMPORTE');
  lines.push(''.padEnd(width, '-'));

  for (const detail of sale.detalles) {
    const cantidad = detail.cantidad.toString().padEnd(4);
    const nombre = (detail.producto_nombre || 'Producto').substring(0, 20).padEnd(20);
    const precio = formatCurrency(detail.precio).padStart(8);
    const importe = formatCurrency(detail.importe).padStart(8);
    lines.push(`${cantidad}${nombre}${precio}${importe}`);
    
    // Agregar personalizaciones si existen
    if (detail.personalizaciones) {
      const customText = getCustomizationText(detail.personalizaciones);
      if (customText) {
        lines.push(`     ${customText.substring(0, 35)}`);
      }
    }
  }

  lines.push(''.padEnd(width, '-'));

  // Totales
  lines.push(`Subtotal: ${formatCurrency(sale.subtotal).padStart(width - 11)}`);
  lines.push(`IVA (${(process.env.IVA_RATE || 0.16) * 100}%): ${formatCurrency(sale.impuestos).padStart(width - 11)}`);
  lines.push(''.padEnd(width, '='));
  lines.push(`TOTAL: ${formatCurrency(sale.total).padStart(width - 8)}`);
  lines.push(''.padEnd(width, '='));

  // Pie de página
  lines.push('');
  lines.push('¡Gracias por su compra!'.padStart(width / 2 + 10).padEnd(width));
  lines.push(''.padEnd(width, '='));

  return lines.join('\n');
}

/**
 * Genera texto de personalizaciones para el ticket
 * @param {Object} personalizaciones - Objeto de personalizaciones
 * @returns {string} Texto formateado
 */
function getCustomizationText(personalizaciones) {
  if (!personalizaciones) return null;
  
  const parts = [];
  const p = personalizaciones;
  
  if (p.milkType && p.milkType.id !== 'entera') {
    parts.push(p.milkType.name);
  }
  
  if (p.toppings && p.toppings.length > 0) {
    parts.push(p.toppings.map(t => t.name).join(', '));
  }
  
  if (p.coldFoam && p.coldFoam.id !== 'none') {
    parts.push(p.coldFoam.name);
  }
  
  if (p.syrup && p.syrup.id !== 'none') {
    parts.push(p.syrup.name);
  }
  
  if (p.sweetness && p.sweetness.id !== '50') {
    parts.push(p.sweetness.name);
  }
  
  if (p.teaOption && p.teaOption.id !== 'hot') {
    parts.push(p.teaOption.name);
  }
  
  return parts.length > 0 ? parts.join(' • ') : null;
}

/**
 * Genera un ticket en formato ESC/POS (comandos de impresora)
 * @param {Object} sale - Venta con detalles
 * @returns {Buffer} Comandos ESC/POS
 */
export function generateESPOSTicket(sale) {
  // Esta es una implementación básica
  // Para producción, se recomienda usar una librería como escpos
  const text = generateTicket(sale);
  return Buffer.from(text, 'utf8');
}

/**
 * Formatea una fecha para el ticket
 * @param {string} dateString - Fecha en formato ISO
 * @returns {string} Fecha formateada
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea un valor monetario
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado como moneda
 */
function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

/**
 * Simula la impresión de un ticket
 * @param {Object} sale - Venta con detalles
 * @returns {Object} Resultado de la impresión simulada
 */
export async function printTicket(sale) {
  try {
    const ticket = generateTicket(sale);
    
    // Simulación de impresión
    console.log('--- TICKET GENERADO ---');
    console.log(ticket);
    console.log('--- FIN DEL TICKET ---');

    return {
      success: true,
      ticket,
      message: 'Ticket generado exitosamente'
    };
  } catch (error) {
    console.error('Error al generar ticket:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
