import { useState } from 'react';
import { Coffee } from 'lucide-react';
import './ProductCard.css';
import { formatCurrency } from '../../utils/formatCurrency.js';

const SERVER_URL = 'http://localhost:3001';

function getImageSrc(imagen) {
  if (!imagen) return null;
  if (imagen.startsWith('http')) return imagen;
  
  // Si la imagen no empieza con / (como los nombres antiguos 'latte.png'), agregamos /uploads/
  const imgPath = imagen.startsWith('/') ? imagen : `/uploads/${imagen}`;
  return `${SERVER_URL}${imgPath}`;
}

export default function ProductCard({ product, onClick }) {
  const [imgError, setImgError] = useState(false);

  const imgSrc = product.imagen && !imgError ? getImageSrc(product.imagen) : null;

  return (
    <div className="product-card" onClick={() => onClick(product)}>
      <div className="product-image">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.nombre}
            className="product-img-element"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="product-icon">
            <Coffee size={32} />
          </div>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.nombre}</h3>
        <p className="product-price">{formatCurrency(product.precio)}</p>
      </div>
    </div>
  );
}
