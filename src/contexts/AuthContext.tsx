import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface User {
  _id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'individual' | 'organization';
  avatar?: string;
  bio?: string;
  location?: string;
  interests?: string[];
  skills?: string[];
  organization?: {
    name?: string;
    website?: string;
    industry?: string;
    size?: string;
  };
  sustainabilityMetrics?: {
    carbonFootprint: number;
    wasteReduced: number;
    energySaved: number;
    projectsCompleted: number;
  };
  totalCO2Saved?: number;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.getMe();
          const userData = response.data.data;
          setUser(userData);
          
          // Check if user has admin email
          const adminEmails = ['admin@ecoloop.com', 'admin@example.com'];
          setIsAdmin(adminEmails.includes(userData.email));
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAdmin(false);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, ...userData } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Check if user is admin
      const adminEmails = ['admin@ecoloop.com', 'admin@example.com'];
      setIsAdmin(adminEmails.includes(email));
      
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to Eco Loop AI Connect.",
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };
  
  const adminLogin = async (email: string, password: string) => {
    try {
      // Admin email validation
      const adminEmails = ['admin@ecoloop.com', 'admin@example.com'];
      if (!adminEmails.includes(email)) {
        throw new Error('This email is not registered as an admin');
      }
      
      const response = await authAPI.login({ email, password });
      const { token, ...userData } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAdmin(true);
      
      toast({
        title: "Welcome, Admin!",
        description: "Successfully logged in to Admin Dashboard.",
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Admin login failed');
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await authAPI.register(userData);
      const { token, ...userInfo } = response.data.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      
      toast({
        title: "Welcome to Eco Loop AI Connect!",
        description: "Your account has been created successfully.",
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Even if logout API fails, we still want to clear local data
      console.error('Logout API error:', error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAdmin(false);
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin,
    isLoading,
    login,
    adminLogin,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 