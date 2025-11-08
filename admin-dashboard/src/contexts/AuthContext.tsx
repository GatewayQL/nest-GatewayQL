import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { LOGIN_MUTATION, LOGOUT_MUTATION } from '../graphql/auth.mutations';

interface User {
  id: string;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const { data } = await loginMutation({
        variables: {
          loginInput: {
            username,
            password,
          },
        },
      });

      if (data?.login) {
        const { accessToken, user: userData } = data.login;

        localStorage.setItem('token', accessToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error?.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout mutation (optional, as JWT is stateless)
      await logoutMutation();
    } catch (error) {
      console.error('Logout mutation failed:', error);
    } finally {
      // Always clear local storage regardless of mutation result
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
