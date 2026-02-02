import { API_CONFIG, ApiResponse, ApiError } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const EXPO_EXTRA = (Constants?.expoConfig?.extra ?? {}) as Record<string, unknown>;

function resolveEnvVar(key: string): string | undefined {
  const envValue =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)[key]
      : undefined;
  const extraValue = EXPO_EXTRA[key];
  const resolved =
    typeof envValue === 'string' && envValue.trim().length
      ? envValue
      : typeof extraValue === 'string' && (extraValue as string).trim().length
        ? (extraValue as string)
        : undefined;
  return resolved;
}

const SUPABASE_URL = resolveEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = resolveEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// 认证失败回调类型
type OnAuthFailureCallback = () => void;

// 基础 API 客户端类
class ApiClient {
  private baseURL: string;
  private timeout: number;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;
  private supabaseUrl: string | null;
  private supabaseAnonKey: string | null;
  private onAuthFailure: OnAuthFailureCallback | null = null;
  // 仅用于 GET 的请求去重：相同 URL 的并发请求复用同一 Promise，避免重复发起
  private inFlightGet: Map<string, Promise<ApiResponse<any>>> = new Map();

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.supabaseUrl = SUPABASE_URL ?? null;
    this.supabaseAnonKey = SUPABASE_ANON_KEY ?? null;
    
    // 🔍 调试：检查 Supabase 配置
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      console.warn('⚠️ API Client - Supabase config missing! Token refresh will fail.');
      console.warn('   Missing:', {
        url: !this.supabaseUrl,
        anonKey: !this.supabaseAnonKey
      });
      console.warn('   Please add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env');
    } else {
      console.log('✅ API Client - Supabase config loaded');
    }
    
    this.loadStoredTokens();
  }

  // 设置认证失败回调
  public setOnAuthFailure(callback: OnAuthFailureCallback | null): void {
    this.onAuthFailure = callback;
  }

  // 从 AsyncStorage 加载存储的 token
  private async loadStoredTokens(): Promise<void> {
    try {
      const [storedAccessToken, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      ]);
      console.log("🔍 loadStoredTokens - accessToken:", storedAccessToken ? "present" : "null", "| refreshToken:", storedRefreshToken ? "present" : "null");
      if (storedAccessToken) {
        this.authToken = storedAccessToken;
        console.log("🔍 API Client - Loaded stored access token:", this.previewToken(storedAccessToken));
      } else {
        console.log("🔍 API Client - No stored access token found");
      }
      if (storedRefreshToken) {
        this.refreshToken = storedRefreshToken;
        console.log("🔍 API Client - Loaded stored refresh token:", this.previewToken(storedRefreshToken));
      }
    } catch (error) {
      console.log('🔍 API Client - Failed to load stored tokens:', error);
    }
  }

  private previewToken(token: string): string {
    return token;
  }

  private async ensureRefreshTokenLoaded(): Promise<void> {
    if (this.refreshToken) return;
    try {
      const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (storedRefreshToken) {
        this.refreshToken = storedRefreshToken;
        console.log("🔍 API Client - Lazy-loaded refresh token:", this.previewToken(storedRefreshToken));
      }
    } catch (error) {
      console.log('🔍 API Client - Failed to hydrate refresh token:', error);
    }
  }

  private async tryRefreshSession(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = (async () => {
      await this.ensureRefreshTokenLoaded();
      const tokenToRefresh = this.refreshToken;
      if (!tokenToRefresh) {
        console.log("🔍 API Client - No refresh token available for session refresh");
        return false;
      }

      // 🔥 优先使用后端 API 刷新（更安全，统一管理）
      // 如果后端 API 失败，再尝试直接调用 Supabase（兜底）
      try {
        // 方法 1: 使用后端 API（推荐）
        console.log("🔍 API Client - Refreshing session via backend API");
        const backendRefreshEndpoint = `${this.baseURL}/api/auth/refresh`;
        const backendResponse = await fetch(backendRefreshEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: tokenToRefresh }),
        });

        if (backendResponse.ok) {
          const backendData = await backendResponse.json();
          const newAccessToken = backendData.access_token;
          const newRefreshToken = backendData.refresh_token || tokenToRefresh;

          if (newAccessToken) {
            this.setAuthToken(newAccessToken, newRefreshToken);
            console.log("✅ API Client - Session refresh succeeded via backend API");
            return true;
          }
        } else {
          const errorBody = await backendResponse.text().catch(() => '');
          console.warn(`🔍 API Client - Backend refresh failed: HTTP ${backendResponse.status}`, errorBody);
        }
      } catch (backendError) {
        console.warn("🔍 API Client - Backend refresh error, trying direct Supabase:", backendError);
      }

      // 方法 2: 直接调用 Supabase（兜底，需要环境变量）
      if (!this.supabaseUrl || !this.supabaseAnonKey) {
        console.warn("🔍 API Client - Supabase config missing, cannot use fallback refresh");
        return false;
      }

      try {
        console.log("🔍 API Client - Trying direct Supabase refresh as fallback");
        const supabaseRefreshEndpoint = `${this.supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=refresh_token`;
        const supabaseResponse = await fetch(supabaseRefreshEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: this.supabaseAnonKey,
            Authorization: `Bearer ${this.supabaseAnonKey}`,
          },
          body: JSON.stringify({ refresh_token: tokenToRefresh }),
        });

        if (!supabaseResponse.ok) {
          const errorBody = await supabaseResponse.text().catch(() => '');
          console.warn(`🔍 API Client - Supabase refresh failed: HTTP ${supabaseResponse.status}`, errorBody);
          return false;
        }

        const supabaseData = await supabaseResponse.json();
        const newAccessToken: string | undefined =
          typeof supabaseData.access_token === 'string'
            ? supabaseData.access_token
            : supabaseData.session?.access_token;
        const newRefreshToken: string | undefined =
          typeof supabaseData.refresh_token === 'string'
            ? supabaseData.refresh_token
            : supabaseData.session?.refresh_token;

        if (!newAccessToken) {
          console.warn("🔍 API Client - Supabase refresh response missing access token");
          return false;
        }

        this.setAuthToken(newAccessToken, newRefreshToken ?? tokenToRefresh);
        console.log("✅ API Client - Session refresh succeeded via direct Supabase");
        return true;
      } catch (error) {
        console.warn("🔍 API Client - Supabase refresh error:", error);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  // 设置认证 token
  public setAuthToken(accessToken: string, refreshToken?: string | null): void {
    this.authToken = accessToken;
    AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken).catch((error) => {
      console.log('🔍 API Client - Failed to persist access token:', error);
    });
    console.log("🔍 API Client - Access token stored:", this.previewToken(accessToken));

    if (refreshToken) {
      this.refreshToken = refreshToken;
      AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken).catch((error) => {
        console.log('🔍 API Client - Failed to persist refresh token:', error);
      });
      console.log("🔍 API Client - Refresh token stored:", this.previewToken(refreshToken));
    }
  }

  // 获取当前 token (调试用)
  public async getCurrentToken(): Promise<string | null> {
    if (this.authToken) {
      console.log("🔑 Current JWT Token:", this.previewToken(this.authToken));
      return this.authToken;
    }
    try {
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (storedToken) {
        console.log("🔑 Stored JWT Token:", this.previewToken(storedToken));
        return storedToken;
      }
    } catch (e) {
      console.log('🔍 API Client - No stored token available');
    }
    return null;
  }

  // 清除认证 token
  public async clearAuthToken(): Promise<void> {
    this.authToken = null;
    this.refreshToken = null;
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
      ]);
      console.log('🔍 API Client - Cleared stored tokens');
    } catch (error) {
      console.log('🔍 API Client - Failed to clear stored tokens:', error);
    }
  }

  // 开发工具：手动设置无效 token 以测试自动刷新和登出逻辑
  public async setInvalidTokenForTesting(): Promise<void> {
    const invalidToken = 'invalid-token-for-testing';
    this.authToken = invalidToken;
    this.refreshToken = null; // 同时清除 refresh token，确保 refresh 也会失败
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, invalidToken),
      AsyncStorage.removeItem(REFRESH_TOKEN_KEY), // 删除 refresh token
    ]);
    console.log('🧪 API Client - Set invalid token for testing (and cleared refresh token). Next API call will trigger 401 and auto-refresh flow.');
  }

  // 构建完整 URL
  private buildUrl(endpoint: string): string {
    // 规范化：移除baseURL末尾的斜杠，移除endpoint开头的斜杠，然后用单个斜杠连接
    const base = this.baseURL.replace(/\/+$/, '');
    const path = endpoint.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  // 获取认证头
  private async getAuthHeaders(): Promise<Record<string, string>> {
    // console.log("🔍 getAuthHeaders - accessToken in memory:", this.authToken ? "present" : "null");

    // 使用 Supabase access token
    if (this.authToken) {
      // console.log("🔑 Using JWT Token for API request:", this.previewToken(this.authToken));
      return { Authorization: `Bearer ${this.authToken}` };
    }

    try {
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      // console.log("🔍 getAuthHeaders - stored access token:", storedToken ? "present" : "null");
      if (storedToken) {
        this.authToken = storedToken;
        // console.log("🔑 Using stored JWT Token for API request:", this.previewToken(storedToken));
        await this.ensureRefreshTokenLoaded();
        return { Authorization: `Bearer ${storedToken}` };
      }
    } catch (e) {
      console.log('🔍 API Client - Error reading stored token:', e);
    }

    // console.log("❌ No auth token available, returning empty headers");
    return {};
  }

  // 基础请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    
    // 获取认证头
    const authHeaders = await this.getAuthHeaders();
    
    // 构建默认选项
    const defaultOptions: RequestInit = {
      headers: {
        ...authHeaders,
        'x-mobile-app': 'true',  // 标识移动端请求
        ...options.headers,
      },
    };

    // 如果不是 FormData，设置 Content-Type
    if (!(options.body instanceof FormData)) {
      defaultOptions.headers = {
        'Content-Type': 'application/json',
        ...defaultOptions.headers,
      };
    }

    try {
      // console.log(`🔍 API Request -> ${options.method || 'GET'} ${url} (timeout: ${this.timeout}ms)`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, { 
        ...defaultOptions, 
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const ct = response.headers.get('content-type') || '';
      // console.log(`🔍 API Response <- ${options.method || 'GET'} ${url} status=${response.status} time=${Date.now()}`);
      // if (!ct.includes('application/json')) {
      //   console.log(`🔍 API Response Content-Type: ${ct}`);
      // }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // 如果是 401/403 错误且还有重试次数，尝试刷新 session
        // 🔥 但是登录/注册相关的端点不应该触发session刷新（因为用户还没有登录，没有refresh token）
        // 🔥 忘记密码/重置密码端点也不需要刷新session（这些是公开端点）
        const isPublicAuthEndpoint = endpoint.includes('/api/auth/signin') ||
                                     endpoint.includes('/api/auth/register') ||
                                     endpoint.includes('/api/auth/signup') ||
                                     endpoint.includes('/api/auth/forgot-password') ||
                                     endpoint.includes('/api/auth/reset-password');

        // 🔥 Supabase 在 token 过期时可能返回 403 而不是 401
        // 因此我们需要同时处理这两种状态码
        const isAuthError = response.status === 401 || response.status === 403;

        if (isAuthError && retryCount < 1 && !isPublicAuthEndpoint) {
          console.log(`🔍 API Client - ${response.status} error, attempting session refresh (retry ${retryCount + 1})`);
          const refreshed = await this.tryRefreshSession();
          if (refreshed) {
            return this.request<T>(endpoint, options, retryCount + 1);
          }
          console.warn("🔍 API Client - Session refresh failed, clearing stored tokens");
          await this.clearAuthToken();

          // 触发认证失败回调（导航到登录页）
          if (this.onAuthFailure) {
            console.log("🔍 API Client - Triggering auth failure callback (navigating to login)");
            this.onAuthFailure();
          }

          // 🔥 对于非公开认证端点，session刷新失败后，不抛出原始401/403错误
          // 因为已经导航到登录页了，抛出错误可能会在UI层显示"HTTP 401"或"HTTP 403"
          // 改为抛出更友好的错误消息，或者让调用方知道认证已失效
          throw new ApiError(
            "Session expired. Please log in again.",
            response.status,
            errorData
          );
        }

        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      // 优先按 JSON 解析，若非 JSON，抛出带正文摘要的错误，帮助定位错误服务端/URL
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return { data };
      } else {
        const text = await response.text();
        const snippet = text.slice(0, 200);
        throw new ApiError(
          `Non-JSON response (Content-Type: ${contentType})`,
          response.status,
          { preview: snippet }
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // 网络错误或其他错误
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  // GET 请求
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(this.buildUrl(endpoint));
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const key = `GET ${url.pathname}${url.search}`;
    const existing = this.inFlightGet.get(key);
    if (existing) {
      return existing as Promise<ApiResponse<T>>;
    }

    const p = this.request<T>(url.pathname + url.search, {
      method: 'GET',
    }).finally(() => {
      // 请求完成后移除，允许后续相同 GET 再次发起
      this.inFlightGet.delete(key);
    });
    this.inFlightGet.set(key, p as Promise<ApiResponse<any>>);
    return p;
  }

  // POST 请求
  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    const requestOptions: RequestInit = {
      method: 'POST',
    };

    // 如果是 FormData，不设置 Content-Type，让浏览器自动设置
    if (data instanceof FormData) {
      requestOptions.body = data;
    } else if (data) {
      requestOptions.body = JSON.stringify(data);
    }

    return this.request<T>(endpoint, { ...requestOptions, ...options });
  }

  // PUT 请求
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH 请求
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 请求
  async delete<T>(endpoint: string, options?: { data?: any }): Promise<ApiResponse<T>> {
    const requestOptions: RequestInit = {
      method: 'DELETE',
    };

    // 如果有数据，添加到请求体中
    if (options?.data) {
      requestOptions.body = JSON.stringify(options.data);
    }

    return this.request<T>(endpoint, requestOptions);
  }
}

// 创建单例实例
export const apiClient = new ApiClient();


