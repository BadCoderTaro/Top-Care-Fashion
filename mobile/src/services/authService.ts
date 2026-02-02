import { apiClient } from './api';
import { API_CONFIG } from '../config/api';

// 用户类型 (匹配 Web API 响应)
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
  likesVisibility?: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
  followsVisibility?: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
}

// 登录请求
export interface SignInRequest {
  email: string;
  password: string;
}

// 注册请求
export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
}

// 认证响应 (匹配 Web API 响应)
export interface AuthResponse {
  user: User;
  source?: string; // "supabase" | "legacy-cookie"
  fallback?: boolean;
  access_token?: string;
  refresh_token?: string;
}

// 认证服务类
export class AuthService {
  // 用户登录 - 纯 Web API
  async signIn(credentials: SignInRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.AUTH.SIGNIN,
        credentials
      );

      if (response.data) {
        console.log('🔍 Web API login successful, user:', response.data.user.username);

        // 使用 Supabase tokens (access_token + refresh_token)
        if (response.data.access_token && response.data.refresh_token) {
          console.log("🔑 Storing Supabase access token and refresh token");
          apiClient.setAuthToken(response.data.access_token, response.data.refresh_token);
        } else if (response.data.access_token) {
          console.warn("⚠️ No refresh token received, only storing access token");
          apiClient.setAuthToken(response.data.access_token);
        }

        return response.data;
      }

      throw new Error('Web API login failed');
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  // 用户注册 - 纯 Web API
  async signUp(userData: SignUpRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_CONFIG.ENDPOINTS.AUTH.SIGNUP,
        userData
      );

      if (response.data) {
        return response.data;
      }

      throw new Error('Registration failed');
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<User | null> {
    try {
      // 移动端通过 Bearer token 调用需要鉴权的 /api/profile
      const response = await apiClient.get<{ ok: boolean; user: User }>(API_CONFIG.ENDPOINTS.PROFILE);
      if (response.data && (response.data as any).user) return (response.data as any).user as User;
      return null;
    } catch (error) {
      // 🔥 静默处理错误 - 这通常是正常的（例如 logout 后重启）
      // 只在调试模式下记录详细信息
      if (__DEV__) {
        console.log('📝 getCurrentUser failed (this is normal after logout):', error);
      }
      return null;
    }
  }

  // 用户登出 - 纯 Web API
  async signOut(): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.SIGNOUT);
    } catch (error) {
      console.error('Error signing out from server:', error);
      // Continue to clear local tokens even if server logout fails
    } finally {
      // Always clear local auth tokens, even if server logout fails
      await apiClient.clearAuthToken();
    }
  }

  // 检查是否已登录
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch (error) {
      return false;
    }
  }

  // 请求密码重置
  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      throw error;
    }
  }

  // 重置密码
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD, {
        token,
        newPassword,
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  // 修改密码
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword,
        newPassword,
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const authService = new AuthService();


