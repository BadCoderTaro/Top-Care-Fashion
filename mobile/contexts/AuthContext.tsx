import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { authService, premiumService } from '../src/services';
import { apiClient } from '../src/services/api';
import { navigateToLogin } from '../src/services/navigationService';

// 用户类型定义 (匹配 Web API)
export interface User {
  id: number;
  username: string;
  email: string;
  role: "User" | "Admin";
  status: "active" | "suspended";
  isPremium: boolean;
  premiumUntil?: string | null;
  dob?: string | null;
  gender?: "Male" | "Female" | null;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  created_at?: string;
  updated_at?: string;
  preferred_styles?: string[];
  preferred_brands?: string[];
  preferred_size_top?: string | null;
  preferred_size_bottom?: string | null;
  preferred_size_shoe?: string | null;
}

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUser: (updatedUser: User) => void;
  error: string | null;
  clearError: () => void;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者组件
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 开关：启动时强制进入登录页（开发/演示用）
  const FORCE_LOGIN_ON_START = false;

  // 检查用户是否已登录
  const isAuthenticated = !!user;

  // 清除错误
  const clearError = useCallback(() => setError(null), []);

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.signIn({ email, password });
      
      if (response.user) {
        // 立即同步 premium 状态，避免界面刷新后闪烁
        try {
          const status = await premiumService.getStatus();
          setUser({ ...(response.user as any), isPremium: status.isPremium, premiumUntil: status.premiumUntil });
        } catch (_) {
          setUser(response.user);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 注册
  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.signUp({ username, email, password });
      
      if (response.user) {
        try {
          const status = await premiumService.getStatus();
          setUser({ ...(response.user as any), isPremium: status.isPremium, premiumUntil: status.premiumUntil });
        } catch (_) {
          setUser(response.user);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Logging out user...');
      await authService.signOut();
      console.log('✅ Logout successful - all tokens cleared');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    } finally {
      // Clear all local auth data
      setUser(null);
      setError(null);
      setLoading(false);
      console.log('✅ User state cleared');

      // 🔄 Ensure navigation stack resets so stale screens (e.g. previous My TOP state) unmount
      navigateToLogin();
    }
  }, []);

  // 请求密码重置
  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      setError(null);
      await authService.forgotPassword(email);
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
      throw error;
    }
  }, []);

  // 重置密码
  const resetPasswordHandler = useCallback(async (token: string, newPassword: string) => {
    try {
      setError(null);
      await authService.resetPassword(token, newPassword);
    } catch (error: any) {
      setError(error.message || 'Failed to reset password');
      throw error;
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      setError(null);
      await authService.changePassword(currentPassword, newPassword);
    } catch (error: any) {
      setError(error.message || 'Failed to change password');
      throw error;
    }
  }, []);

  // 更新用户信息
  const updateUser = useCallback((updatedUser: User) => {
    setUser((prev) => {
      if (!prev) {
        return {
          ...updatedUser,
          isPremium: updatedUser.isPremium ?? (updatedUser as any).is_premium ?? false,
          premiumUntil: updatedUser.premiumUntil ?? (updatedUser as any).premium_until ?? null,
        };
      }

      return {
        ...prev,
        ...updatedUser,
        isPremium:
          updatedUser.isPremium ?? (updatedUser as any).is_premium ?? prev.isPremium ?? false,
        premiumUntil:
          updatedUser.premiumUntil ?? (updatedUser as any).premium_until ?? prev.premiumUntil ?? null,
        avatar_url: updatedUser.avatar_url ?? prev.avatar_url ?? null,
      };
    });
  }, []);

  // 应用启动时检查用户登录状态（仅在存在本地 token 时触发服务器查询）
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);

        if (FORCE_LOGIN_ON_START) {
          // 启动即清除本地 token，确保进入登录页
          try {
            await apiClient.clearAuthToken();
          } catch {}
          setUser(null);
          return; // 直接结束检查流程
        }

        // 🔥 确保在获取当前用户前，先检查本地是否有 token
        const hasToken = await apiClient.getCurrentToken();
        console.log('🔍 Auth check - has stored token:', !!hasToken);
        
        if (!hasToken) {
          console.log('🔍 Auth check - no token found, skipping user fetch');
          setUser(null);
          return;
        }

        console.log('🔍 Auth check - fetching current user...');
        const baseUser = await authService.getCurrentUser();
        
        if (baseUser) {
          console.log('🔍 Auth check - user found:', baseUser.username);
          try {
            const status = await premiumService.getStatus();
            setUser({ ...(baseUser as any), isPremium: status.isPremium, premiumUntil: status.premiumUntil });
          } catch (_) {
            setUser(baseUser);
          }
        } else {
          console.log('🔍 Auth check - no user returned, clearing state');
          setUser(null);
        }
      } catch (error) {
        // 🔥 只在有 token 但获取用户失败时才记录错误
        // 正常的 logout 后重启不应该显示错误
        console.log('🔍 Auth check - failed to get user (expected after logout)');
        setUser(null);
        // 不设置 error，避免在 logout 后重启时显示错误信息
      } finally {
        setLoading(false);
      }
    };

    // 设置认证失败回调：当 session refresh 失败时自动登出并导航到登录页
    apiClient.setOnAuthFailure(() => {
      console.log('🔍 Auth failure detected, logging out and navigating to login');
      setUser(null);
      setError(null);
      navigateToLogin();
    });

    checkAuthStatus();

    // 移动端不订阅 Supabase 事件，完全依赖 Web API
    return () => {
      apiClient.setOnAuthFailure(null);
    };
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      requestPasswordReset,
      resetPassword: resetPasswordHandler,
      changePassword,
      updateUser,
      error,
      clearError,
    }),
    [
      user,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      requestPasswordReset,
      resetPasswordHandler,
      changePassword,
      updateUser,
      error,
      clearError,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证上下文的 Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


