import { useState } from 'react';
import { registerUser } from '../firebase/authService';

export const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await registerUser(email, password);
      // Notificar al usuario que revise su bandeja de entrada
      setMessage('¡Cuenta creada! Te enviamos un correo de verificación. Revisa tu bandeja de entrada o la carpeta de spam.');
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Crear Cuenta</h2>
      
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
        {loading ? 'Registrando...' : 'Registrarse'}
      </button>

      {message && <p>{message}</p>}
    </form>
  );
};