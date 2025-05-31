import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'technician' | 'customer' | 'manager';
  is_active: boolean;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  canAccess: (feature: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing auth on component mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading auth from localStorage:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // For demo purposes, simulate API call with demo users
      const demoUsers: Record<string, { user: User; password: string }> = {
        'admin': {
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@ajlongelectric.com',
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            is_active: true
          },
          password: 'admin123'
        },
        'technician': {
          user: {
            id: 2,
            username: 'technician',
            email: 'tech@ajlongelectric.com',
            first_name: 'Mike',
            last_name: 'Johnson',
            role: 'technician',
            is_active: true
          },
          password: 'tech123'
        },
        'manager': {
          user: {
            id: 3,
            username: 'manager',
            email: 'manager@ajlongelectric.com',
            first_name: 'Sarah',
            last_name: 'Davis',
            role: 'manager',
            is_active: true
          },
          password: 'manager123'
        },
        'customer': {
          user: {
            id: 4,
            username: 'customer',
            email: 'customer@example.com',
            first_name: 'John',
            last_name: 'Smith',
            role: 'customer',
            is_active: true
          },
          password: 'customer123'
        }
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const userRecord = demoUsers[username.toLowerCase()];
      
      if (!userRecord || userRecord.password !== password) {
        setError('Invalid username or password');
        setLoading(false);
        return false;
      }

      // Simulate JWT token
      const demoToken = `demo_token_${Date.now()}_${userRecord.user.id}`;
      
      // Store auth data
      setUser(userRecord.user);
      setToken(demoToken);
      
      // Persist to localStorage
      localStorage.setItem('auth_token', demoToken);
      localStorage.setItem('auth_user', JSON.stringify(userRecord.user));
      
      setLoading(false);
      return true;

    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    
    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Simple permission check based on role
    const rolePermissions: Record<string, string[]> = {
      manager: ['customers.*', 'jobs.*', 'scheduling.*', 'billing.*', 'analytics.read'],
      technician: ['customers.read', 'jobs.read', 'jobs.update', 'inventory.read'],
      customer: ['jobs.read', 'billing.read']
    };
    
    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.some(p => p === '*' || p === permission || 
      (p.endsWith('.*') && permission.startsWith(p.slice(0, -2))));
  };

  const canAccess = (feature: string): boolean => {
    if (!user) return false;
    
    const featurePermissions: Record<string, string[]> = {
      dashboard: ['admin', 'manager', 'technician', 'customer'],
      customers: ['admin', 'manager', 'technician'],
      jobs: ['admin', 'manager', 'technician'],
      scheduling: ['admin', 'manager', 'technician'],
      billing: ['admin', 'manager'],
      inventory: ['admin', 'manager', 'technician'],
      analytics: ['admin', 'manager'],
      technicians: ['admin', 'manager'],
      reports: ['admin', 'manager']
    };
    
    return featurePermissions[feature]?.includes(user.role) || false;
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    loading,
    error,
    hasPermission,
    canAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};