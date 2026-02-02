import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { verifyLegacyToken } from "@/lib/jwt"
import { createSupabaseServer } from "@/lib/supabase"
import { VisibilitySetting, isVisibilitySetting } from "@/types/privacy"

export type SessionUser = {
	id: number
	username: string
	email: string
	role: "User" | "Admin"
	status: "active" | "suspended"
	isPremium?: number | boolean
	dob?: string | null
	gender?: "Male" | "Female" | null
	avatar_url?: string | null
	likesVisibility: VisibilitySetting
	followsVisibility: VisibilitySetting
}

function mapRole(value: unknown): "User" | "Admin" {
	const normalized = String(value ?? "").toUpperCase()
	return normalized === "ADMIN" ? "Admin" : "User"
}

function mapStatus(value: unknown): "active" | "suspended" {
	const normalized = String(value ?? "").toUpperCase()
	return normalized === "SUSPENDED" ? "suspended" : "active"
}

function mapGender(value: unknown): "Male" | "Female" | null {
	const normalized = String(value ?? "").toUpperCase()
	if (!normalized) return null

	// Handle new enum values (Men, Women, Unisex)
	if (normalized === "MEN") return "Male"
	if (normalized === "WOMEN") return "Female"
	if (normalized === "UNISEX") return null

	// Backward compatibility with old enum (MALE, FEMALE)
	if (normalized === "MALE") return "Male"
	if (normalized === "FEMALE") return "Female"

	return null
}

function mapVisibility(value: unknown): VisibilitySetting {
	if (isVisibilitySetting(value)) return value
	const normalized = String(value ?? "").toUpperCase()
	if (isVisibilitySetting(normalized)) return normalized
	return "PUBLIC"
}

export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
	const store = await cookies()

	// 首先尝试 Supabase 认证
	try {
		const supabase = await createSupabaseServer()

		// 如果有 Request 对象，尝试从 Authorization header 获取 token
		if (req) {
			const authHeader = req.headers.get("authorization")
			// console.log("🔍 Auth header:", authHeader);
			if (authHeader?.startsWith("Bearer ")) {
				const token = authHeader.substring(7)
				// console.log("🔍 Bearer token:", token.substring(0, 20) + "...");
				// 先尝试 legacy JWT（移动端兜底）
				try {
					const legacy = verifyLegacyToken(token)
					if (legacy.valid && legacy.payload?.uid) {
						const user = await prisma.users.findUnique({
							where: { id: Number(legacy.payload.uid) },
							select: {
								id: true,
								username: true,
								email: true,
								role: true,
								status: true,
								is_premium: true,
								dob: true,
								gender: true,
								avatar_url: true,
								likes_visibility: true,
								follows_visibility: true,
							},
						})
						if (user) {
							const sessionUser: SessionUser = {
								id: user.id,
								username: user.username,
								email: user.email,
								role: mapRole(user.role),
								status: mapStatus(user.status),
								isPremium: Boolean(user.is_premium),
								dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
								gender: mapGender(user.gender),
								avatar_url: user.avatar_url ?? null,
								likesVisibility: mapVisibility(user.likes_visibility),
								followsVisibility: mapVisibility(user.follows_visibility),
							}
							return sessionUser
						}
					}
				} catch {
					// Legacy token auth failed, continue to Supabase auth
				}
				try {
					const {
						data: { user: supabaseUser },
						error,
					} = await supabase.auth.getUser(token)
					// console.log("🔍 Supabase user:", supabaseUser?.id);

					if (error) {
						// Log specific Supabase auth errors for debugging
						if (error.message?.includes("expired")) {
							console.log("🔍 Token expired, client should refresh")
						} else {
							console.log("🔍 Supabase auth error:", error.message)
						}
					}

					if (supabaseUser && !error) {
						const dbUser = await findUserBySupabaseId(supabaseUser.id)
						// console.log("🔍 DB user found:", dbUser?.username);
						return dbUser
					}
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : String(error)
					console.log("❌ Bearer token auth failed:", errorMsg)
				}

				// 如果提供了 Authorization header 但验证失败，不要 fallback 到 cookie
				// 直接返回 null，让 API 返回 401
				// console.log("🔍 Bearer token provided but invalid, skipping cookie fallback");
				return null
			}
		}

		// 回退到 cookie 认证
		const {
			data: { user: supabaseUser },
		} = await supabase.auth.getUser()

		if (supabaseUser) {
			// 通过 Supabase user ID 查找本地用户
			try {
				const user = await prisma.users.findUnique({
					where: { supabase_user_id: supabaseUser.id },
					select: {
						id: true,
						username: true,
						email: true,
						role: true,
						status: true,
						is_premium: true,
						dob: true,
						gender: true,
						avatar_url: true,
						likes_visibility: true,
						follows_visibility: true,
					},
				})

				if (user) {
					const sessionUser: SessionUser = {
						id: user.id,
						username: user.username,
						email: user.email,
						role: mapRole(user.role),
						status: mapStatus(user.status),
						isPremium: Boolean(user.is_premium),
						dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
						gender: mapGender(user.gender),
						avatar_url: user.avatar_url ?? null,
						likesVisibility: mapVisibility(user.likes_visibility),
						followsVisibility: mapVisibility(user.follows_visibility),
					}
					return sessionUser
				}
			} catch (error) {
				console.log("❌ Error finding user by Supabase ID (cookie auth):", error)
			}
		}
	} catch (error) {
		console.log("Supabase auth check failed:", error)
	}

	// 回退到 legacy cookie 认证
	const sid = store.get("tc_session")?.value
	if (!sid) return null

	try {
		const user = await prisma.users.findUnique({
			where: { id: parseInt(sid) },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				status: true,
				is_premium: true,
				dob: true,
				gender: true,
				avatar_url: true,
				likes_visibility: true,
				follows_visibility: true,
			},
		})

		if (user) {
			const sessionUser: SessionUser = {
				id: user.id,
				username: user.username,
				email: user.email,
				role: mapRole(user.role),
				status: mapStatus(user.status),
				isPremium: Boolean(user.is_premium),
				dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
				gender: mapGender(user.gender),
				avatar_url: user.avatar_url ?? null,
				likesVisibility: mapVisibility(user.likes_visibility),
				followsVisibility: mapVisibility(user.follows_visibility),
			}
			return sessionUser
		}
	} catch (error) {
		console.log("❌ Error finding user by legacy session:", error)
	}

	return null
}

async function findUserBySupabaseId(supabaseUserId: string): Promise<SessionUser | null> {
	try {
		const user = await prisma.users.findUnique({
			where: { supabase_user_id: supabaseUserId },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				status: true,
				is_premium: true,
				dob: true,
				gender: true,
				avatar_url: true,
				likes_visibility: true,
				follows_visibility: true,
			},
		})

		if (user) {
			const sessionUser: SessionUser = {
				id: user.id,
				username: user.username,
				email: user.email,
				role: mapRole(user.role),
				status: mapStatus(user.status),
				isPremium: Boolean(user.is_premium),
				dob: user.dob ? user.dob.toISOString().slice(0, 10) : null,
				gender: mapGender(user.gender),
				avatar_url: user.avatar_url ?? null,
				likesVisibility: mapVisibility(user.likes_visibility),
				followsVisibility: mapVisibility(user.follows_visibility),
			}
			return sessionUser
		}
	} catch (error) {
		console.log("❌ Error finding user by Supabase ID:", error)
	}
	return null
}

export async function requireAdmin(req?: Request): Promise<SessionUser | null> {
	const user = await getSessionUser(req)
	if (!user || user.role !== "Admin") return null
	return user
}
