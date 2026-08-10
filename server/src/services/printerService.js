/**
 * Servicio de Formateo e Impresión Térmica ESC/POS para Coffee POS
 * Permite generar tramas de comandos de texto y códigos de control para impresoras térmicas (58mm / 80mm).
 */

const ESC = '\x1b';
const GS = '\x1d';

export const ESC_POS_COMMANDS = {
  INIT: `${ESC}@`,                      // Inicializar impresora
  ALIGN_LEFT: `${ESC}a0`,               // Alineación izquierda
  ALIGN_CENTER: `${ESC}a1`,             // Alineación centro
  ALIGN_RIGHT: `${ESC}a2`,              // Alineación derecha
  BOLD_ON: `${ESC}E\x01`,               // Negrita activada
  BOLD_OFF: `${ESC}E\x00`,              // Negrita desactivada
  DOUBLE_HEIGHT: `${GS}!1`,            // Texto doble altura
  NORMAL_TEXT: `${GS}!0`,              // Texto tamaño normal
  CUT_PAPER: `${GS}V\x41\x00`,          // Corte de papel parcial/total
  FEED_3_LINES: `${ESC}d\x03`          // Alimentar 3 líneas
};

/**
 * Formatea una venta en un ticket de texto listo para impresoras térmicas ESC/POS
 * @param {Object} sale Objeto con datos de la venta y productos
 * @param {Object} options Opciones de configuración (ancho: 32 chars para 58mm, 48 chars para 80mm)
 */
export function formatReceiptESCPOS(sale, options = { width: 32, storeName: 'COFFEE POS' }) {
  const { width, storeName } = options;
  const divider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);

  let ticket = '';

  // Encabezado
  ticket += `${ESC_POS_COMMANDS.INIT}`;
  ticket += `${ESC_POS_COMMANDS.ALIGN_CENTER}`;
  ticket += `${ESC_POS_COMMANDS.BOLD_ON}${storeName}\n${ESC_POS_COMMANDS.BOLD_OFF}`;
  ticket += `Punto de Venta\n`;
  ticket += `${divider}\n`;

  // Datos de la venta
  ticket += `${ESC_POS_COMMANDS.ALIGN_LEFT}`;
  ticket += `Ticket #: ${sale.id || 'N/A'}\n`;
  ticket += `Atendió: ${sale.usuario_nombre || 'Cajero'}\n`;
  ticket += `Pago: ${sale.metodo_pago ? sale.metodo_pago.toUpperCase() : 'EFECTIVO'}\n`;
  ticket += `${divider}\n`;

  // Encabezado de la tabla de productos
  ticket += padRow('CANT PRODUCTO', 'TOTAL', width) + '\n';
  ticket += `${divider}\n`;

  // Productos
  if (Array.isArray(sale.items)) {
    sale.items.forEach(item => {
      const cant = `${item.cantidad}x `;
      const nombre = item.nombre || item.producto_nombre || 'Producto';
      const itemTotal = `$${(Number(item.precio || 0) * Number(item.cantidad || 1)).toFixed(2)}`;

      const lineName = `${cant}${nombre}`;
      ticket += padRow(lineName, itemTotal, width) + '\n';

      // Personalizaciones / Extras
      if (item.personalizaciones) {
        let extrasStr = '';
        try {
          const extras = typeof item.personalizaciones === 'string' ? JSON.parse(item.personalizaciones) : item.personalizaciones;
          if (Array.isArray(extras)) {
            extrasStr = extras.map(e => e.nombre || e).join(', ');
          } else if (typeof extras === 'object') {
            extrasStr = Object.values(extras).join(', ');
          }
        } catch (_) {
          extrasStr = String(item.personalizaciones);
        }
        if (extrasStr) {
          ticket += `   * ${extrasStr}\n`;
        }
      }
    });
  }

  ticket += `${divider}\n`;

  // Totales
  ticket += padRow('Subtotal:', `$${Number(sale.subtotal || 0).toFixed(2)}`, width) + '\n';
  if (sale.impuestos > 0) {
    ticket += padRow('IVA / Impuestos:', `$${Number(sale.impuestos || 0).toFixed(2)}`, width) + '\n';
  }
  ticket += `${doubleDivider}\n`;
  ticket += `${ESC_POS_COMMANDS.BOLD_ON}`;
  ticket += padRow('TOTAL:', `$${Number(sale.total || 0).toFixed(2)}`, width) + '\n';
  ticket += `${ESC_POS_COMMANDS.BOLD_OFF}`;
  ticket += `${doubleDivider}\n`;

  // Mensaje final
  ticket += `${ESC_POS_COMMANDS.ALIGN_CENTER}`;
  ticket += `¡Gracias por tu compra!\n\n`;
  ticket += `${ESC_POS_COMMANDS.FEED_3_LINES}`;
  ticket += `${ESC_POS_COMMANDS.CUT_PAPER}`;

  return ticket;
}

/**
 * Función auxiliar para justificar texto a izquierda y derecha
 */
function padRow(left, right, width) {
  const availableLeftWidth = width - right.length - 1;
  const truncatedLeft = left.length > availableLeftWidth ? left.substring(0, availableLeftWidth) : left;
  const spaces = Math.max(1, width - truncatedLeft.length - right.length);
  return truncatedLeft + ' '.repeat(spaces) + right;
}
