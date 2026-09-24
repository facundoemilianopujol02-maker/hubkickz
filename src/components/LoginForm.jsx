import { useState } from 'react';
import { loginUser, resendVerificationEmail } from '../firebase/authService';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    setCanResend(false);

    try {
      const user = await loginUser(email, password);
      console.log('Usuario logueado:', user);
    } catch (error) {
      if (error.message === 'EMAIL_NOT_VERIFIED') {
        setErrorMsg('Tu casilla de correo aún no ha sido verificada.');
        setCanResend(true);
      } else {
        setErrorMsg('Credenciales incorrectas o error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    setInfoMsg('');
    setErrorMsg('');
    try {
      const res = await resendVerificationEmail(email, password);
      setInfoMsg(res.message || 'Correo de verificación reenviado con éxito.');
    } catch (error) {
      if (error.code === 'auth/too-many-requests') {
        setErrorMsg('Demasiados intentos. Espera unos minutos antes de solicitar otro correo.');
      } else {
        setErrorMsg('No se pudo reenviar el correo. Revisa tus datos.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Iniciar Sesión</h2>

      <input 
        type="email" 
        placeholder="Tu correo" 
        value={email}
        onChange={(e) => setEmail(e.target.value)} 
        required 
      />

      <input 
        type="password" 
        placeholder="Tu contraseña" 
        value={password}
        onChange={(e) => setPassword(e.target.value)} 
        required 
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Cargando...' : 'Ingresar'}
      </button>

      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      {infoMsg && <p style={{ color: 'green' }}>{infoMsg}</p>}

      {canResend && (
        <button 
          type="button" 
          onClick={handleResendEmail} 
          disabled={loading}
          style={{ marginTop: '10px', backgroundColor: '#f0f0f0' }}
        >
          Reenviar email de verificación
        </button>
      )}
    </form>
  );
};