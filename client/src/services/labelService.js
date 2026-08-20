import { formatBusinessTime } from '../utils/dateTime.js';

/**
 * Servicio de Etiquetas para Vasos
 * Genera e imprime etiquetas individuales para cada producto
 */

/**
 * Genera el HTML de una etiqueta individual
 * @param {Object} detail - Detalle de venta con producto
 * @param {string} customerName - Nombre del cliente
 * @param {number} orderId - ID de la orden
 * @returns {string} HTML de la etiqueta
 */
function generateLabelHTML(detail, customerName, orderId) {
  console.log('[LabelService] Generando etiqueta para:', detail);
  console.log('[LabelService] Personalizaciones:', detail.personalizaciones);
  
  const customizationDetails = getCustomizationDetails(detail.personalizaciones);
  console.log('[LabelService] Detalles extraídos:', customizationDetails);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta #${orderId}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 9px;
          width: 50.8mm;
          height: 25.4mm;
          padding: 1mm;
          margin: 0 auto;
          background: white;
        }
        
        .label {
          width: 100%;
          height: 100%;
          border: 1px solid #000;
          padding: 1.5mm;
          text-align: center;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .customer-name {
          font-size: 10px;
          font-weight: bold;
          color: #000;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding-bottom: 0.5mm;
          margin-bottom: 0.5mm;
        }
        
        .product {
          font-size: 9px;
          font-weight: bold;
          color: #333;
          text-transform: uppercase;
          margin-bottom: 0.5mm;
        }
        
        .customization-item {
          font-size: 7px;
          color: #444;
          margin-bottom: 0.3mm;
          font-weight: normal;
          line-height: 1.1;
        }
        
        .order-info {
          font-size: 7px;
          color: #000;
          border-top: 1px solid #000;
          padding-top: 0.5mm;
          margin-top: 0.5mm;
          font-weight: bold;
        }
        
        .quantity-badge {
          display: inline-block;
          background: #000;
          color: #fff;
          font-size: 7px;
          font-weight: bold;
          padding: 0.5px 2px;
          border-radius: 1px;
          margin-left: 2px;
        }
        
        @media print {
          body {
            width: 50.8mm;
            height: 25.4mm;
            margin: 0;
            padding: 0;
          }
          
          @page {
            margin: 0;
            size: 50.8mm 25.4mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="label">
        <div class="customer-name">${customerName || 'CLIENTE'}</div>
        <div class="product">
          ${detail.producto_nombre || 'Producto'}
          ${detail.cantidad > 1 ? `<span class="quantity-badge">${detail.cantidad}x</span>` : ''}
        </div>
        
        ${customizationDetails.length > 0 ? `
          <div class="customization-section">
            ${customizationDetails.map(item => `
              <div class="customization-item">${item}</div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="order-info">
          #${orderId}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Obtiene los detalles de personalizaciones para la etiqueta
 * @param {Object} personalizaciones - Objeto de personalizaciones
 * @returns {Array} Array con detalles formateados de personalizaciones
 */
function getCustomizationDetails(personalizaciones) {
  if (!personalizaciones) return [];
  
  const details = [];
  const p = personalizaciones;

  console.log('[LabelService] getCustomizationDetails - personalizaciones:', JSON.stringify(personalizaciones, null, 2));

  // Función helper para extraer el nombre de un objeto
  const extractName = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
      // Limpiar strings que parecen JSON
      if (value.includes('","name":"')) {
        const match = value.match(/"name":"([^"]+)"/);
        return match ? match[1] : value;
      }
      return value;
    }
    if (typeof value === 'object') {
      // Intentar diferentes propiedades donde podría estar el nombre
      return value.name || value.nombre || value.label || value.descripcion || 
             value.id || value.value || null;
    }
    return String(value);
  };

  // Función helper para agregar detalles con etiquetas en español
  const addDetail = (label, value) => {
    const extractedValue = extractName(value);
    if (extractedValue && extractedValue !== 'none' && extractedValue !== 'default' && extractedValue !== '' && extractedValue !== 'null' && extractedValue !== 'undefined') {
      details.push(`${label}: ${extractedValue}`);
    }
  };

  // Mapeo de nombres de propiedades a español
  const labelMap = {
    'milkType': 'Leche',
    'milk': 'Leche',
    'toppings': 'Extras',
    'topping': 'Extra',
    'coldFoam': 'Cold Foam',
    'cold_foam': 'Cold Foam',
    'syrup': 'Sirope',
    'sweetness': 'Dulzura',
    'teaOption': 'Té',
    'tea': 'Té',
    'tea_option': 'Té'
  };

  // Extraer todas las personalizaciones posibles
  Object.keys(p).forEach(key => {
    const value = p[key];
    const spanishLabel = labelMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
    
    if (value) {
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(item => {
            addDetail(spanishLabel, item);
          });
        } else {
          addDetail(spanishLabel, value);
        }
      } else if (typeof value !== 'object') {
        addDetail(spanishLabel, value);
      }
    }
  });
  
  console.log('[LabelService] getCustomizationDetails - detalles extraídos:', details);
  return details;
}

/**
 * Imprime una etiqueta individual
 * @param {Object} detail - Detalle de venta
 * @param {string} customerName - Nombre del cliente
 * @param {number} orderId - ID de la orden
 */
async function printSingleLabel(detail, customerName, orderId) {
  const labelHTML = generateLabelHTML(detail, customerName, orderId);

  // Verificar si estamos en Electron
  if (window.electronAPI && window.electronAPI.printHTML) {
    try {
      await window.electronAPI.printHTML(labelHTML);
      console.log('Etiqueta enviada a impresión en Electron');
    } catch (error) {
      console.error('Error al imprimir etiqueta en Electron:', error);
      // Fallback a impresión web normal
      printLabelWeb(labelHTML);
    }
  } else {
    // Fallback para navegadores web normales
    printLabelWeb(labelHTML);
  }
}

/**
 * Fallback para impresión web normal (fuera de Electron)
 * @param {string} labelHTML - HTML de la etiqueta
 */
function printLabelWeb(labelHTML) {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(labelHTML);
    printWindow.document.close();

    printWindow.onload = function() {
      printWindow.print();
      printWindow.close();
    };
  } else {
    console.error('No se pudo abrir la ventana de impresión para etiqueta');
  }
}

/**
 * Imprime etiquetas para todos los productos de una venta
 * @param {Object} sale - Venta con detalles
 * @param {string} customerName - Nombre del cliente (opcional, usa sale.cliente si no se proporciona)
 */
export function printLabels(sale, customerName = null) {
  console.log('[LabelService] printLabels llamado con sale:', sale);
  console.log('[LabelService] customerName:', customerName);
  
  if (!sale || !sale.detalles || sale.detalles.length === 0) {
    console.error('No hay detalles para imprimir etiquetas');
    return;
  }

  // Usar el nombre proporcionado o el de la venta, o 'Cliente' por defecto
  const finalCustomerName = customerName || sale.cliente || 'Cliente';
  console.log('[LabelService] finalCustomerName:', finalCustomerName);
  
  // Imprimir una etiqueta por cada producto
  sale.detalles.forEach((detail, index) => {
    console.log(`[LabelService] Procesando detalle ${index}:`, detail);
    // Si hay cantidad > 1, imprimir etiquetas individuales
    const quantity = detail.cantidad || 1;
    
    for (let i = 0; i < quantity; i++) {
      // Pequeño delay entre impresiones para evitar bloqueos
      setTimeout(() => {
        printSingleLabel(detail, finalCustomerName, sale.id);
      }, index * 500 + i * 300);
    }
  });
}
