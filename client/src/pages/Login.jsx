import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, User, Lock, Sun, Moon } from 'lucide-react';
import { login, saveToken, saveUser } from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { clearAuth } from '../services/authService.js';
import { useTheme } from '../context/ThemeContext.jsx';
import Input from '../components/common/Input.jsx';
import Button from '../components/common/Button.jsx';
import './Login.css';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(usuario, contraseña);
      saveToken(response.token);
      saveUser(response.user);
      authLogin(response);
      // Redirigir según el rol del usuario
      const rol = response.user?.rol || response.user?.role;
      navigate(rol === 'admin' ? '/admin' : '/');
    } catch (err) {
      // Ensure no stale session remains after failed login
      clearAuth();
      setError('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-background-decoration" />
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Coffee size={48} className="login-logo-icon" />
          </div>
          <h1 className="login-title">Coffee POS</h1>
          <p className="login-subtitle">Inicia sesión en tu cuenta</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <Input
            label="Usuario"
            type="text"
            icon={User}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Ingresa tu usuario"
            required
          />
          
          <Input
            label="Contraseña"
            type="password"
            icon={Lock}
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            placeholder="Ingresa tu contraseña"
            required
          />
          
          {error && <div className="login-error">{error}</div>}
          
          <Button 
            type="submit" 
            variant="primary" 
            size="large" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>

        <div className="login-footer">
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            type="button"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <p className="login-hint"></p>
        </div>
      </div>
    </div>
  );
}
