import { useState, useEffect, useRef } from 'react';
import { Camera, Upload, X, Check, Plus } from 'lucide-react';
import Input from '../common/Input.jsx';
import Button from '../common/Button.jsx';
import { getCategories, createCategory } from '../../services/categoryService.js';
import './ProductForm.css';

const DEFAULT_CATEGORIES = ['Cafés Calientes', 'Cafés Fríos', 'Frappés', 'Especiales', 'Tés'];
const SERVER_URL = 'http://localhost:3000';

export default function ProductForm({ product, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    nombre: '',
    precio: '',
    categoria: '',
  });
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        nombre: product.nombre || '',
        precio: product.precio || '',
        categoria: product.categoria || '',
      });
      // Mostrar imagen actual si existe
      if (product.imagen) {
        const url = product.imagen.startsWith('/uploads/')
          ? `${SERVER_URL}${product.imagen}`
          : product.imagen;
        setImagePreview(url);
      }
    } else {
      setFormData({ nombre: '', precio: '', categoria: '' });
      setImageFile(null);
      setImagePreview(null);
    }
  }, [product]);

  async function loadCategories() {
    try {
      setLoadingCategories(true);
      const data = await getCategories();
      const categoryNames = data.map(cat => cat.nombre);
      setCategories(categoryNames.length > 0 ? categoryNames : DEFAULT_CATEGORIES);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoadingCategories(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleFileChange(file) {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Solo se permiten imágenes (JPG, PNG, WEBP, GIF)');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('La imagen no debe superar 3 MB');
      return;
    }
    setError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleInputChange(e) {
    handleFileChange(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files[0]);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleAddNewCategory() {
    if (!newCategoryName.trim()) {
      setError('El nombre de la categoría es requerido');
      return;
    }
    if (categories.includes(newCategoryName.trim())) {
      setError('Esa categoría ya existe');
      return;
    }
    
    try {
      setCreatingCategory(true);
      setError('');
      const newCategory = await createCategory(newCategoryName.trim());
      setCategories(prev => [...prev, newCategory.nombre]);
      setFormData(prev => ({ ...prev, categoria: newCategory.nombre }));
      setNewCategoryName('');
      setShowNewCategoryInput(false);
    } catch (error) {
      setError(error.message || 'Error al crear categoría');
    } finally {
      setCreatingCategory(false);
    }
  }

  function handleCancelNewCategory() {
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!formData.nombre || !formData.precio || !formData.categoria) {
      setError('Nombre, precio y categoría son obligatorios');
      return;
    }
    setError('');
    // Pasar el archivo como parte del submit (el padre lo convierte a FormData)
    onSubmit({
      nombre: formData.nombre,
      precio: parseFloat(formData.precio),
      categoria: formData.categoria,
      imageFile: imageFile || null
    });
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <Input
        label="Nombre del producto"
        name="nombre"
        value={formData.nombre}
        onChange={handleChange}
        placeholder="Ej: Latte Vainilla"
        required
      />

      <Input
        label="Precio"
        name="precio"
        type="number"
        step="0.01"
        min="0"
        value={formData.precio}
        onChange={handleChange}
        placeholder="Ej: 65.00"
        required
      />

      <div className="form-group">
        <label className="form-label">Categoría</label>
        {showNewCategoryInput ? (
          <div className="new-category-input">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Nombre de la nueva categoría"
              className="form-input"
              autoFocus
              disabled={creatingCategory}
            />
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={handleAddNewCategory}
              icon={Check}
              disabled={creatingCategory}
            >
              {creatingCategory ? 'Creando...' : 'Agregar'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={handleCancelNewCategory}
              icon={X}
              disabled={creatingCategory}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className="form-select"
              required
              disabled={loadingCategories}
            >
              <option value="">
                {loadingCategories ? 'Cargando categorías...' : 'Seleccionar categoría'}
              </option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button
              type="button"
              className="add-category-btn"
              onClick={() => setShowNewCategoryInput(true)}
              disabled={loadingCategories}
            >
              <Plus size={16} />
              <span>Crear nueva categoría</span>
            </button>
          </>
        )}
      </div>

      {/* Image Upload */}
      <div className="form-group">
        <label className="form-label">Imagen del producto</label>

        {imagePreview ? (
          <div className="image-preview-container">
            <img src={imagePreview} alt="Preview" className="image-preview" />
            <div className="image-preview-overlay">
              <button
                type="button"
                className="image-change-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={16} />
                <span>Cambiar</span>
              </button>
              <button
                type="button"
                className="image-remove-btn"
                onClick={handleRemoveImage}
              >
                <X size={16} />
                <span>Quitar</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`image-dropzone ${dragOver ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Camera className="dropzone-icon" size={32} />
            <p className="dropzone-text">Clic o arrastra una imagen aquí</p>
            <p className="dropzone-hint">JPG, PNG, WEBP · Máx 3MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleInputChange}
          className="file-input-hidden"
        />
      </div>

      <div className="form-actions">
        <Button type="submit" variant="primary" icon={product ? Check : Plus}>
          {product ? 'Actualizar Producto' : 'Crear Producto'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
