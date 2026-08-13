import { formatBusinessDateTime } from '../utils/dateTime.js';

/**
 * Servicio de Tickets para Cliente
 * Genera e imprime tickets de venta
 */

/**
 * Genera un ticket en formato HTML para impresión
 * @param {Object} sale - Venta con detalles
 * @param {string} customerName - Nombre del cliente (opcional)
 * @returns {string} HTML del ticket
 */
export function generateTicketHTML(sale, customerName = null) {
  const formatDate = (dateString) => formatBusinessDateTime(dateString);

  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  // Config defaults (can be injected later)
  const tipoCambio = Number(sale.tipo_cambio || 18);

  // Redondeo a 0.05 (típico efectivo MXN). Ajusta si quieres 0.10
  const roundCash = (amount) => {
    return Math.round(amount / 0.05) * 0.05;
  };

  const totalRedondeado = roundCash(sale.total);
  const diferenciaRedondeo = Number((totalRedondeado - sale.total).toFixed(2));
  const totalUSD = Number((sale.total / tipoCambio).toFixed(2));
  const totalRedondeadoUSD = Number((totalRedondeado / tipoCambio).toFixed(2));

  const itemsHTML = sale.detalles.map(detail => {
    const extras = getCustomizationItems(detail.personalizaciones);
    const hasDiscount = detail.descuento && detail.descuento > 0;

    // línea principal del producto
    let rows = `
    <tr class="ticket-item">
      <td class="ticket-qty">${detail.cantidad}</td>
      <td class="ticket-name">${detail.producto_nombre || 'Producto'}${hasDiscount ? ` <span style="color: var(--color-warning); font-size: 0.8em;">(-${detail.descuento}%)</span>` : ''}</td>
      <td class="ticket-price">${formatCurrency(detail.precio)}</td>
      <td class="ticket-total">${formatCurrency(detail.precio * detail.cantidad)}</td>
    </tr>`;

    // línea de descuento si aplica
    if (hasDiscount) {
      const discountAmount = detail.precio * (detail.descuento / 100) * detail.cantidad;
      rows += `
      <tr class="ticket-item">
        <td></td>
        <td class="ticket-name ticket-extra" style="color: var(--color-success);">Descuento</td>
        <td class="ticket-price" style="color: var(--color-success);">-${detail.descuento}%</td>
        <td class="ticket-total" style="color: var(--color-success);">-${formatCurrency(discountAmount)}</td>
      </tr>`;
    }

    // líneas separadas de extras
    let extrasTotal = 0;
    if (extras.length > 0) {
      extras.forEach(extra => {
        extrasTotal += extra.price * detail.cantidad;
        rows += `
        <tr class="ticket-item">
          <td></td>
          <td class="ticket-name ticket-extra">+ ${extra.name}</td>
          <td class="ticket-price">${formatCurrency(extra.price)}</td>
          <td class="ticket-total">${formatCurrency(extra.price * detail.cantidad)}</td>
        </tr>`;
      });

      // línea resumen de extras
      rows += `
      <tr class="ticket-item">
        <td></td>
        <td class="ticket-name ticket-extra">Extras</td>
        <td></td>
        <td class="ticket-total">${formatCurrency(extrasTotal)}</td>
      </tr>`;
    }

    return rows;
  }).join('');

  // IVA dinámico confiable desde backend
  const ivaPercent = sale.iva_rate
    ? Math.round(sale.iva_rate * 100)
    : (sale.subtotal > 0
        ? Math.round((sale.impuestos / sale.subtotal) * 100)
        : 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Ticket #${sale.id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 110mm;
          padding: 5mm;
          margin: 0 auto; /* ✅ centrar en hoja */
          background: white;
        }
        
        .ticket {
          width: 100%;
        }
        
        .ticket-header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        
        .ticket-header h1 {
          font-size: 16px;
          margin-bottom: 5px;
        }
        
        .ticket-info {
          margin-bottom: 10px;
          font-size: 11px;
        }
        
        .ticket-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
        }
        
        .ticket-items {
          margin-bottom: 10px;
        }
        
        .ticket-items table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .ticket-item td {
          padding: 2px 0;
        }
        
        .ticket-qty {
          text-align: left;
          width: 15%;
        }
        
        .ticket-name {
          text-align: left;
          width: 45%;
          font-weight: bold;
        }
        
        .ticket-customization {
          font-size: 9px;
          color: #666;
          font-style: italic;
        }

        .ticket-extra {
          font-weight: normal;
          font-size: 11px;
          padding-left: 6px;
        }
        
        .ticket-price {
          text-align: right;
          width: 20%;
        }
        
        .ticket-total {
          text-align: right;
          width: 20%;
        }
        
        .ticket-totals {
          border-top: 2px dashed #000;
          padding-top: 5px;
        }
        
        .ticket-total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .ticket-grand-total {
          font-weight: bold;
          font-size: 14px;
          border-top: 1px solid #000;
          padding-top: 5px;
          margin-top: 5px;
        }
        
        .ticket-footer {
          text-align: center;
          border-top: 2px dashed #000;
          padding-top: 10px;
          margin-top: 10px;
          font-size: 11px;
        }
        
        @media print {
          body {
            width: 110mm;
            margin: 0 auto; /* ✅ centrar impresión */
            padding: 0;
          }
          
          @page {
            margin: 0;
            size: 110mm 220mm; /* ✅ tamaño correcto */
          }
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="ticket-header">
          <h1>CAFETERÍA POS</h1>
        </div>
        
        <div class="ticket-info">
          <div class="ticket-info-row">
            <span>Ticket #:</span>
            <span>${sale.id}</span>
          </div>
          <div class="ticket-info-row">
            <span>Fecha:</span>
            <span>${formatDate(sale.fecha)}</span>
          </div>
          ${customerName ? `
          <div class="ticket-info-row">
            <span>Cliente:</span>
            <span>${customerName}</span>
          </div>` : ''}
          <div class="ticket-info-row">
            <span>Método:</span>
            <span>${sale.metodo_pago.toUpperCase()}${sale.metodo_pago === 'tarjeta' && sale.tipo_tarjeta ? ` (${sale.tipo_tarjeta.toUpperCase()})` : ''}</span>
          </div>
        </div>

        ${sale.metodo_pago === 'mixto' ? `
        <div class="ticket-info" style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px;">
          <div style="font-weight: bold; margin-bottom: 3px;">Desglose de Pago:</div>
          ${sale.efectivo_mxn > 0 ? `
          <div class="ticket-info-row">
            <span>Efectivo MXN:</span>
            <span>${formatCurrency(sale.efectivo_mxn)}</span>
          </div>` : ''}
          ${sale.efectivo_usd > 0 ? `
          <div class="ticket-info-row">
            <span>Efectivo USD:</span>
            <span>$${sale.efectivo_usd.toFixed(2)} USD</span>
          </div>
          <div class="ticket-info-row">
            <span>  (= MXN):</span>
            <span>${formatCurrency(sale.efectivo_usd * (sale.tipo_cambio || 20))}</span>
          </div>` : ''}
          ${sale.tarjeta_credito > 0 ? `
          <div class="ticket-info-row">
            <span>Tarjeta Crédito:</span>
            <span>${formatCurrency(sale.tarjeta_credito)}</span>
          </div>` : ''}
          ${sale.tarjeta_debito > 0 ? `
          <div class="ticket-info-row">
            <span>Tarjeta Débito:</span>
            <span>${formatCurrency(sale.tarjeta_debito)}</span>
          </div>` : ''}
          ${sale.tipo_cambio ? `
          <div class="ticket-info-row" style="margin-top: 3px; border-top: 1px solid #000; padding-top: 3px;">
            <span>Tipo de Cambio:</span>
            <span>1 USD = $${sale.tipo_cambio.toFixed(2)}</span>
          </div>` : ''}
        </div>` : ''}

        ${sale.metodo_pago === 'dolar' ? `
        <div class="ticket-info" style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px;">
          <div class="ticket-info-row">
            <span>Monto USD:</span>
            <span>$${sale.monto_dolar ? sale.monto_dolar.toFixed(2) : '0.00'} USD</span>
          </div>
          ${sale.dolar_recibido ? `
          <div class="ticket-info-row">
            <span>Recibido USD:</span>
            <span>$${sale.dolar_recibido.toFixed(2)} USD</span>
          </div>` : ''}
          ${sale.cambio_pesos !== null && sale.cambio_pesos !== undefined ? `
          <div class="ticket-info-row">
            <span>Cambio MXN:</span>
            <span>${formatCurrency(sale.cambio_pesos)}</span>
          </div>` : ''}
          ${sale.tipo_cambio ? `
          <div class="ticket-info-row" style="margin-top: 3px; border-top: 1px solid #000; padding-top: 3px;">
            <span>Tipo de Cambio:</span>
            <span>1 USD = $${sale.tipo_cambio.toFixed(2)}</span>
          </div>` : ''}
        </div>` : ''}
        
        <div class="ticket-items">
          <table>
            <thead>
              <tr>
                <th class="ticket-qty">CANT</th>
                <th class="ticket-name">PRODUCTO</th>
                <th class="ticket-price">PRECIO</th>
                <th class="ticket-total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>
        
        <div class="ticket-totals">
          <div class="ticket-total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(sale.subtotal)}</span>
          </div>
          <div class="ticket-total-row">
            <span>IVA (${ivaPercent}%):</span>
            <span>${formatCurrency(sale.impuestos)}</span>
          </div>
          <div class="ticket-total-row ticket-grand-total">
            <span>TOTAL:</span>
            <span>${formatCurrency(sale.total)}</span>
          </div>
          ${sale.metodo_pago !== 'mixto' && sale.metodo_pago !== 'dolar' ? `
          <div class="ticket-total-row">
            <span>Redondeo:</span>
            <span>${formatCurrency(diferenciaRedondeo)}</span>
          </div>
          <div class="ticket-total-row ticket-grand-total">
            <span>TOTAL EFECTIVO:</span>
            <span>${formatCurrency(totalRedondeado)}</span>
          </div>
          <div class="ticket-total-row">
            <span>Total USD:</span>
            <span>$${totalUSD.toFixed(2)} USD</span>
          </div>
          <div class="ticket-total-row">
            <span>Total USD (Redondeado):</span>
            <span>$${totalRedondeadoUSD.toFixed(2)} USD</span>
          </div>` : ''}
        </div>
        
        <div class="ticket-footer">
          <p>¡Gracias por su compra!</p>
          <p>***</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getCustomizationText(personalizaciones) {
  if (!personalizaciones) return null;
  
  const parts = [];
  const p = personalizaciones;

  // helper para mostrar nombre + precio extra
  const formatOpt = (opt) => {
    if (!opt) return null;
    const price = opt.price || 0;
    return price > 0 ? `${opt.name} (+$${price.toFixed(2)})` : opt.name;
  };
  
  if (p.milkType && p.milkType.id !== 'entera') {
    parts.push(formatOpt(p.milkType));
  }
  
  if (p.toppings && p.toppings.length > 0) {
    parts.push(p.toppings.map(t => formatOpt(t)).join(', '));
  }
  
  if (p.coldFoam && p.coldFoam.id !== 'none') {
    parts.push(formatOpt(p.coldFoam));
  }
  
  if (p.syrup && p.syrup.id !== 'none') {
    parts.push(formatOpt(p.syrup));
  }
  
  if (p.sweetness && p.sweetness.id !== '50') {
    parts.push(formatOpt(p.sweetness));
  }
  
  if (p.teaOption && p.teaOption.id !== 'hot') {
    parts.push(formatOpt(p.teaOption));
  }
  
  return parts.length > 0 ? parts.join(' • ') : null;
}

// 🔥 obtener lista de extras con precio
function getCustomizationItems(personalizaciones) {
  if (!personalizaciones) return [];

  const items = [];
  const pushIfValid = (opt) => {
    if (!opt) return;
    if (Array.isArray(opt)) {
      opt.forEach(o => pushIfValid(o));
      return;
    }
    if (opt.price && opt.price > 0) {
      items.push({ name: opt.name || 'Extra', price: opt.price });
    }
  };

  // 🔥 recorrer cualquier estructura dinámica
  Object.values(personalizaciones).forEach(val => {
    pushIfValid(val);
  });

  return items;
}

/**
 * Imprime un ticket de venta
 * @param {Object} sale - Venta con detalles
 * @param {string} customerName - Nombre del cliente (opcional)
 */
export function printTicket(sale, customerName = null) {
  const ticketHTML = generateTicketHTML(sale, customerName);
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(ticketHTML);
    printWindow.document.close();
    
    printWindow.onload = function() {
      printWindow.print();
      printWindow.close();
    };
  } else {
    console.error('No se pudo abrir la ventana de impresión');
  }
}
