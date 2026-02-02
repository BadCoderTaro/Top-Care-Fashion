import { type NextRequest, NextResponse } from "next/server";

// 需要认证的 API 路由列表
const PROTECTED_API_ROUTES = [
  '/api/cart',
  '/api/orders',
  '/api/profile',
  '/api/notifications',
  '/api/messages',
  '/api/conversations',
  '/api/likes',
  '/api/outfits',
  '/api/addresses',
  '/api/payment-methods',
  '/api/user/benefits',
  '/api/reports',
  '/api/listings/create',
  '/api/listings/my',
  '/api/listings/draft',
  '/api/listings/boost',
  '/api/listings/upload-image',
  // 用户相关
  '/api/users',
  // 分类和搜索
  '/api/categories',
  '/api/search',
  // Feed 和内容
  '/api/feed',
  '/api/releases',
  // Admin APIs - 所有 admin 路由都需要认证（然后由 requireAdmin() 检查是否是 Admin）
  '/api/admin',
];

// 部分需要认证的 API（某些方法需要，某些不需要）
const PARTIALLY_PROTECTED_ROUTES: Record<string, string[]> = {
  '/api/listings': ['GET', 'PATCH', 'DELETE'], // 所有方法都需要认证
};

/**
 * 从请求中提取 token
 */
function extractToken(req: NextRequest): string | null {
  // 1. 检查 Authorization header (Bearer token)
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // 基本格式检查：JWT token 应该是三段式 (header.payload.signature)
    if (token && token.split('.').length === 3) {
      return token;
    }
  }

  // 2. 检查 Supabase session cookie
  const supabaseAccessToken = req.cookies.get('sb-access-token');
  if (supabaseAccessToken?.value) {
    return supabaseAccessToken.value;
  }

  // 3. 检查 legacy session cookie（不支持，需要查询数据库）
  const legacySession = req.cookies.get('tc_session');
  if (legacySession?.value) {
    return null; // Legacy session 需要查询数据库，在 middleware 中不支持
  }

  return null;
}

/**
 * 检查请求是否有有效的认证 token
 */
function hasAuthToken(req: NextRequest): boolean {
  return extractToken(req) !== null;
}

/**
 * 检查用户是否是 Admin（在 middleware 中使用）
 * 使用 Supabase REST API 直接查询，兼容 Edge Runtime
 */
async function isAdminUser(req: NextRequest): Promise<boolean> {
  const token = extractToken(req);
  if (!token) {
    return false;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return false;
    }

    // 1. 先验证 token 并获取 Supabase user ID
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    });

    if (!authResponse.ok) {
      return false;
    }

    const authData = await authResponse.json();
    const supabaseUserId = authData?.id;

    if (!supabaseUserId) {
      return false;
    }

    // 2. 使用 service_role key 查询数据库获取用户 role
    // 使用 Supabase REST API，兼容 Edge Runtime
    const dbResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?supabase_user_id=eq.${supabaseUserId}&select=role`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!dbResponse.ok) {
      return false;
    }

    const userData = await dbResponse.json();
    
    if (!Array.isArray(userData) || userData.length === 0) {
      return false;
    }

    // 3. 检查是否是 Admin
    return userData[0]?.role === 'ADMIN';
  } catch (error) {
    console.error('Error checking admin status in middleware:', error);
    // 出错时默认拒绝访问，确保安全
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 处理 Admin 页面路由 - 需要认证且必须是 Admin
  if (pathname.startsWith('/admin')) {
    if (!hasAuthToken(req)) {
      // 没有 token，重定向到登录页
      const loginUrl = new URL('/signin', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // 检查是否是 Admin
    const admin = await isAdminUser(req);
    if (!admin) {
      // 不是 Admin，重定向到首页或显示 403
      return NextResponse.redirect(new URL('/', req.url));
    }
    
    // 是 Admin，继续
    return NextResponse.next();
  }

  // 处理 API 路由
  if (pathname.startsWith('/api/')) {
    // 检查是否是受保护的路由
    const isProtectedRoute = PROTECTED_API_ROUTES.some(route => 
      pathname.startsWith(route)
    );

    // 检查是否是部分受保护的路由
    const partiallyProtected = Object.entries(PARTIALLY_PROTECTED_ROUTES).find(
      ([route]) => pathname.startsWith(route)
    );

    // 如果是完全受保护的路由
    if (isProtectedRoute) {
      if (!hasAuthToken(req)) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    // 如果是部分受保护的路由（某些 HTTP 方法需要认证）
    if (partiallyProtected) {
      const [route, methods] = partiallyProtected;
      const method = req.method;
      
      // 检查当前路径是否匹配（支持动态路由，如 /api/listings/123）
      // 但要排除已经在 PROTECTED_API_ROUTES 中的子路由（如 /api/listings/create）
      const isSubRoute = PROTECTED_API_ROUTES.some(protectedRoute => 
        pathname.startsWith(protectedRoute)
      );
      
      if (pathname.startsWith(route) && !isSubRoute) {
        // 如果请求方法需要认证
        if (methods.includes(method)) {
          if (!hasAuthToken(req)) {
            return NextResponse.json(
              { error: 'Unauthorized', message: 'Authentication required' },
              { status: 401 }
            );
          }
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|api/db-status).*)",
  ],
};


