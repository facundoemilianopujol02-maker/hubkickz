import React, { createContext, useContext, useEffect, useState } from 'react';
import { subscribeToAuthChanges, logoutUser } from '../firebase/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await logoutUser();
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout: handleLogout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);