import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for persisted auth on mount
    const persistedUser = localStorage.getItem('goal-tracker-user');
    const rememberMe = localStorage.getItem('goal-tracker-remember');
    
    if (persistedUser && rememberMe === 'true') {
      setUser(JSON.parse(persistedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe = false): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check against stored users (for demo purposes)
    const storedUsers = JSON.parse(localStorage.getItem('goal-tracker-users') || '[]');
    const foundUser = storedUsers.find((u: any) => u.email === email && u.password === password);
    
    if (foundUser) {
      const userData = { id: foundUser.id, name: foundUser.name, email: foundUser.email };
      setUser(userData);
      
      if (rememberMe) {
        localStorage.setItem('goal-tracker-user', JSON.stringify(userData));
        localStorage.setItem('goal-tracker-remember', 'true');
      }
      
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if user already exists
    const storedUsers = JSON.parse(localStorage.getItem('goal-tracker-users') || '[]');
    const existingUser = storedUsers.find((u: any) => u.email === email);
    
    if (existingUser) {
      setIsLoading(false);
      return false;
    }
    
    // Create new user
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password // In real app, this would be hashed
    };
    
    const updatedUsers = [...storedUsers, newUser];
    localStorage.setItem('goal-tracker-users', JSON.stringify(updatedUsers));
    
    // Auto-login after registration
    const userData = { id: newUser.id, name: newUser.name, email: newUser.email };
    setUser(userData);
    
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('goal-tracker-user');
    localStorage.removeItem('goal-tracker-remember');
  };

  const value = {
    user,
    login,
    register,
    logout,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
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