// src/components/AuthForm.jsx
import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';

export default function AuthForm({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Iniciar sesión / Registrarse con Email y Contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      console.error(err);
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('El correo electrónico ya está registrado.');
          break;
        case 'auth/invalid-email':
          setError('El correo electrónico no es válido.');
          break;
        case 'auth/weak-password':
          setError('La contraseña debe tener al menos 6 caracteres.');
          break;
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Correo o contraseña incorrectos.');
          break;
        default:
          setError('Ocurrió un error al procesar la solicitud.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Iniciar sesión con Google
  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      console.error(err);
      setError('Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label>Correo Electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ejemplo@correo.com"
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
            style={styles.input}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading 
            ? 'Cargando...' 
            : isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
        </button>
      </form>

      {/* Botón para iniciar sesión con Google */}
      <div style={styles.divider}>o</div>

      <button 
        type="button" 
        onClick={handleGoogleLogin} 
        disabled={loading} 
        style={styles.googleButton}
      >
        🌐 Continuar con Google
      </button>

      <p style={styles.toggleText}>
        {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'} {' '}
        <button 
          type="button" 
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError('');
          }}
          style={styles.linkButton}
        >
          {isRegistering ? 'Inicia sesión aquí' : 'Regístrate aquí'}
        </button>
      </p>
    </div>
  );
}

const styles = {
  card: {
    maxWidth: '400px',
    margin: '40px auto',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#fff',
    fontFamily: 'sans-serif'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left'
  },
  input: {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    fontSize: '14px'
  },
  button: {
    padding: '12px',
    backgroundColor: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '8px'
  },
  divider: {
    margin: '16px 0',
    textAlign: 'center',
    color: '#888',
    fontSize: '14px'
  },
  googleButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  error: {
    padding: '10px',
    backgroundColor: '#ffe6e6',
    color: '#d32f2f',
    borderRadius: '4px',
    fontSize: '14px',
    marginTop: '10px'
  },
  toggleText: {
    marginTop: '20px',
    fontSize: '14px',
    textAlign: 'center'
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#0070f3',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontWeight: 'bold'
  }
};