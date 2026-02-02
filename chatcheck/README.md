# ChatCheck MCP Server

一个 Model Context Protocol (MCP) Server，用于让接入的 AI 轻松获取和处理待处理的 support chat。

## 功能

这个 MCP Server 提供了以下工具：

1. **get_pending_support_chats** - 获取待处理的 support chat 列表
2. **get_all_support_chats** - 获取所有 support chat（包括已回复和待处理的）
3. **get_conversation_messages** - 获取指定 conversation 的完整消息历史
4. **reply_to_support_chat** - 回复指定的 support chat

## 安装

```bash
cd chatcheck
npm install
npm run build
```

## 配置

通过环境变量配置 MCP Server：

- `API_BASE_URL` 或 `NEXT_PUBLIC_API_URL` - API 基础 URL（默认: `https://top-care-fashion.vercel.app`）
- `SUPABASE_URL` 或 `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL（必需）
- `SUPABASE_ANON_KEY` 或 `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase Anon Key（必需）
- `ADMIN_EMAIL` - 管理员邮箱（必需，用于 Supabase 认证）
- `ADMIN_PASSWORD` - 管理员密码（必需，用于 Supabase 认证）
- `SUPPORT_USER_ID` - Support User ID（默认: `59`）

### 示例配置

```bash
export API_BASE_URL="https://top-care-fashion.vercel.app"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-supabase-anon-key"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="your-admin-password"
export SUPPORT_USER_ID="59"
```

## 使用方法

### 在 Cursor 中配置

在 Cursor 的 MCP 配置文件中添加：

```json
{
	"mcpServers": {
		"chatcheck": {
			"command": "node",
			"args": ["path/to/chatcheck/build/index.js"],
			"env": {
				"API_BASE_URL": "https://top-care-fashion.vercel.app",
				"SUPABASE_URL": "https://your-project.supabase.co",
				"SUPABASE_ANON_KEY": "your-supabase-anon-key",
				"ADMIN_EMAIL": "admin@example.com",
				"ADMIN_PASSWORD": "your-admin-password",
				"SUPPORT_USER_ID": "59"
			}
		}
	}
}
```

**重要提示：**

- `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 必须是具有 admin 权限的 Supabase 用户账号
- MCP Server 会自动使用这些凭据登录 Supabase 并获取 access_token
- Token 会自动缓存并在过期前刷新（提前 5 分钟）

### 工具说明

#### 1. get_pending_support_chats

获取待处理的 support chat 列表。

**参数：**

- `limit` (可选): 返回的最大对话数量，默认 50
- `page` (可选): 页码，从 1 开始，默认 1

**返回：**

- 待处理的 support chat 列表
- 每个对话包含用户信息、最后一条消息、最近的对话历史等

#### 2. get_all_support_chats

获取所有 support chat。

**参数：**

- `filter` (可选): 过滤类型 - `"all"` | `"pending"` | `"answered"`，默认 `"all"`
- `limit` (可选): 返回的最大对话数量，默认 50
- `page` (可选): 页码，从 1 开始，默认 1

**返回：**

- 所有 support chat 列表（根据 filter 过滤）
- 统计信息（总数、待处理数、已回复数）

#### 3. get_conversation_messages

获取指定 conversation 的完整消息历史。

**参数：**

- `conversationId` (必需): 对话 ID

**返回：**

- 对话的完整消息历史
- 对话信息

#### 4. reply_to_support_chat

回复指定的 support chat。

**参数：**

- `conversationId` (必需): 对话 ID
- `content` (必需): 要发送的消息内容

**返回：**

- 发送成功的消息信息

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run build

# 运行（通过 stdio）
node build/index.js
```

## 工作原理

MCP Server 使用 Supabase Auth 进行认证：

1. **初始化时**：使用 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 登录 Supabase
2. **获取 Token**：从登录响应中获取 `access_token`
3. **Token 缓存**：Token 会被缓存，有效期为 55 分钟
4. **自动刷新**：在 Token 过期前 5 分钟自动刷新
5. **API 调用**：所有 API 请求都会在 Authorization header 中包含 Bearer token

## 注意事项

1. 确保 `ADMIN_EMAIL` 对应的用户具有 admin 权限（在数据库中 role 为 'ADMIN'）
2. Support User ID 必须与系统中的 Support User ID 匹配
3. Supabase URL 和 Anon Key 必须正确配置
4. API 端点需要支持 Supabase Bearer Token 认证

## 故障排除

如果遇到认证错误，请检查：

- `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 是否正确
- 该用户是否具有 admin 权限
- `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确设置
- `API_BASE_URL` 是否正确

如果遇到连接错误，请检查：

- `API_BASE_URL` 是否可访问
- `SUPABASE_URL` 是否可访问
- 网络连接是否正常

如果遇到 "Failed to sign in" 错误：

- 检查 Supabase 用户是否存在
- 检查密码是否正确
- 检查用户是否被禁用
