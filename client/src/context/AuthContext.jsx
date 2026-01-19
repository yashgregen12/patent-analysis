import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "@/lib/api";
import { redirect } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      // Not authenticated
      setUser(null);
      console.log("Not authenticated", error);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      // Optional: redirect logic handled by component consuming auth
      redirect("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
