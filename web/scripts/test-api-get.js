#!/usr/bin/env node
/**
 * 测试所有 API 的 GET 方法
 * 检查哪些需要认证，哪些不需要
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// 从 middleware 中提取的路由配置
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
];

const PARTIALLY_PROTECTED_ROUTES = {
  '/api/listings': ['GET', 'PATCH', 'DELETE'],
};

// 测试的 API 路径列表
const API_ROUTES = [
  // Auth
  '/api/auth/me',
  '/api/auth/check-availability',
  
  // Listings
  '/api/listings',
  '/api/listings/1',
  '/api/listings/boosted',
  '/api/listings/brands',
  '/api/listings/my',
  '/api/listings/my/categories',
  
  // Users
  '/api/users/testuser',
  '/api/users/testuser/listings',
  '/api/users/testuser/reviews',
  '/api/users/testuser/likes',
  '/api/users/testuser/follows',
  
  // Profile
  '/api/profile',
  '/api/profile/premium',
  '/api/profile/follows',
  
  // Cart
  '/api/cart',
  
  // Orders
  '/api/orders',
  '/api/orders/1',
  
  // Categories
  '/api/categories',
  
  // Search & Feed
  '/api/search',
  '/api/feed/home',
  
  // Notifications
  '/api/notifications',
  '/api/notifications/1',
  '/api/notifications/system',
  
  // Messages & Conversations
  '/api/messages/1',
  '/api/conversations',
  '/api/conversations/check',
  
  // Likes
  '/api/likes',
  '/api/likes/1',
  
  // Outfits
  '/api/outfits',
  '/api/outfits/1',
  
  // Addresses
  '/api/addresses',
  
  // Payment Methods
  '/api/payment-methods',
  
  // Reports
  '/api/reports',
  
  // FAQ
  '/api/faq',
  
  // Site Stats
  '/api/site-stats',
  
  // Releases
  '/api/releases/current',
  
  // Pricing Plans
  '/api/pricing-plans',
  
  // User Benefits
  '/api/user/benefits',
  
  // Health & Status
  '/api/health',
  '/api/db-status',
  
  // Landing
  '/api/landing-content',
];

function isProtectedRoute(path) {
  // 检查完全受保护的路由
  const isFullyProtected = PROTECTED_API_ROUTES.some(route => 
    path.startsWith(route)
  );
  
  if (isFullyProtected) return true;
  
  // 检查部分受保护的路由
  const partiallyProtected = Object.entries(PARTIALLY_PROTECTED_ROUTES).find(
    ([route]) => path.startsWith(route)
  );
  
  if (partiallyProtected) {
    const [route] = partiallyProtected;
    const isSubRoute = PROTECTED_API_ROUTES.some(protectedRoute => 
      path.startsWith(protectedRoute)
    );
    
    if (path.startsWith(route) && !isSubRoute) {
      return true; // GET 方法也需要认证
    }
  }
  
  return false;
}

async function testApiRoute(path) {
  const url = `${BASE_URL}${path}`;
  const expectedAuth = isProtectedRoute(path);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const status = response.status;
    const requiresAuth = status === 401;
    
    return {
      path,
      status,
      requiresAuth,
      expectedAuth,
      match: requiresAuth === expectedAuth,
    };
  } catch (error) {
    return {
      path,
      status: 0,
      requiresAuth: false,
      expectedAuth,
      match: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('🧪 Testing all API GET endpoints...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  
  const results = [];
  
  for (const route of API_ROUTES) {
    const result = await testApiRoute(route);
    results.push(result);
    
    const icon = result.match ? '✅' : '❌';
    const authStatus = result.requiresAuth ? '🔒 Requires Auth' : '🔓 Public';
    const statusText = result.status === 401 ? '401' : 
                       result.status >= 200 && result.status < 300 ? `✅ ${result.status}` :
                       result.status >= 400 ? `❌ ${result.status}` : `⚠️ ${result.status}`;
    
    console.log(`${icon} ${route.padEnd(50)} ${authStatus.padEnd(20)} ${statusText}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    // 避免请求过快
    await sleep(100);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:\n');
  
  const total = results.length;
  const matched = results.filter(r => r.match).length;
  const mismatched = results.filter(r => !r.match);
  
  console.log(`Total routes tested: ${total}`);
  console.log(`✅ Matched expectations: ${matched}`);
  console.log(`❌ Mismatched: ${mismatched.length}`);
  
  if (mismatched.length > 0) {
    console.log('\n❌ Mismatched routes:');
    mismatched.forEach(r => {
      console.log(`   ${r.path}: Expected ${r.expectedAuth ? 'auth required' : 'public'}, got ${r.requiresAuth ? 'auth required' : 'public'} (status: ${r.status})`);
    });
  }
  
  console.log('\n📋 Detailed Results:\n');
  console.log('Route'.padEnd(50) + 'Status'.padEnd(10) + 'Auth'.padEnd(15) + 'Expected'.padEnd(15) + 'Match');
  console.log('-'.repeat(100));
  
  results.forEach(r => {
    const matchIcon = r.match ? '✅' : '❌';
    console.log(
      r.path.padEnd(50) +
      String(r.status).padEnd(10) +
      (r.requiresAuth ? 'Required'.padEnd(15) : 'Public'.padEnd(15)) +
      (r.expectedAuth ? 'Required'.padEnd(15) : 'Public'.padEnd(15)) +
      matchIcon
    );
  });
}

// 运行测试
runTests().catch(console.error);

