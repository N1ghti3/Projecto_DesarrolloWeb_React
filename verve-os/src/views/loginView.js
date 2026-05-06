// src/views/loginView.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import '../assets/styles/login.css';

const LoginView = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, completa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    // Simula una verificación de credenciales
    setTimeout(() => {
      setLoading(false);
      // En un caso real, aquí validarías contra una API
      navigate('/select');
    }, 800);
  };

  return (
    <div className="login-container">
      <div className="login-card card">
        <h1>VerveOS</h1>
        <p className="subtitle">Inicia sesión para continuar</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Correo electrónico
            <input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Contraseña
            <div className="pwd-field">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="toggle" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
        <p className="helper">¿Olvidaste tu contraseña? <button type="button" className="link-button">Recupérala</button></p>
      </div>
    </div>
  );
};

export default LoginView;
