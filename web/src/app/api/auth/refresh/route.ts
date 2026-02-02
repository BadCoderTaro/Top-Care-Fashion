import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/refresh
 * 
 * 刷新 Supabase access token
 * 
 * 请求体:
 * {
 *   "refresh_token": "your_refresh_token_here"
 * }
 * 
 * 响应:
 * {
 *   "access_token": "new_access_token",
 *   "refresh_token": "new_refresh_token",
 *   "expires_in": 3600
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refresh_token } = body;

    if (!refresh_token || typeof refresh_token !== 'string') {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // 获取 Supabase 配置
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Refresh API - Supabase config missing');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 调用 Supabase Auth API 刷新 token
    // 参考: https://supabase.com/docs/guides/auth/sessions
    const refreshEndpoint = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=refresh_token`;
    
    console.log('🔍 Refresh API - Calling Supabase refresh endpoint');
    
    const response = await fetch(refreshEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ refresh_token }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Refresh API - Supabase refresh failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      // 根据错误类型返回不同的状态码
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { error: 'Invalid or expired refresh token' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Supabase 返回的数据结构可能是:
    // 1. { access_token, refresh_token, expires_in, ... }
    // 2. { session: { access_token, refresh_token, expires_in, ... } }
    const accessToken = data.access_token || data.session?.access_token;
    const newRefreshToken = data.refresh_token || data.session?.refresh_token || refresh_token;
    const expiresIn = data.expires_in || data.session?.expires_in || 3600;

    if (!accessToken) {
      console.error('❌ Refresh API - Response missing access token:', data);
      return NextResponse.json(
        { error: 'Invalid response from authentication server' },
        { status: 500 }
      );
    }

    console.log('✅ Refresh API - Token refreshed successfully');

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: expiresIn,
      token_type: 'bearer',
    });
  } catch (error) {
    console.error('❌ Refresh API - Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

