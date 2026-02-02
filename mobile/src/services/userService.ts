import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { apiClient } from "./api";
import { API_CONFIG } from "../config/api";
import type { User } from "./authService";
import { resolvePremiumFlag } from "./utils/premium";
import { ApiError } from "../config/api";

export type VisibilitySetting = "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";

const VISIBILITY_OPTIONS: VisibilitySetting[] = [
  "PUBLIC",
  "FOLLOWERS_ONLY",
  "PRIVATE",
];

const normalizeVisibilitySetting = (value: unknown): VisibilitySetting => {
  if (typeof value === "string") {
    const upper = value.trim().toUpperCase();
    if (VISIBILITY_OPTIONS.includes(upper as VisibilitySetting)) {
      return upper as VisibilitySetting;
    }
  }
  return "PUBLIC";
};

const parseNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  bio?: string;
  isPremium?: boolean;
  premiumUntil?: string | null;
  lastSignInAt?: string | null;
  location?: string;
  dob?: string;
  gender?: "Male" | "Female" | null;
  avatar_url?: string;
  rating: number;
  reviewsCount: number;
  totalListings: number;
  activeListings: number;
  soldListings: number;
  followersCount: number | null;
  followingCount: number | null;
  memberSince: string;
  likesVisibility?: VisibilitySetting;
  followsVisibility?: VisibilitySetting;
  canViewLikes?: boolean;
  canViewFollowLists?: boolean;
}

export interface FollowListEntry {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  followersCount: number;
  followingCount: number;
  followedAt: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
  dob?: string | null;
  gender?: "Male" | "Female" | null;
  preferredStyles?: string[] | null;
  preferredSizes?: { top?: string | null; bottom?: string | null; shoe?: string | null } | null;
  preferredBrands?: string[] | null;
  likesVisibility?: VisibilitySetting;
  followsVisibility?: VisibilitySetting;
}

const normalizeAvatar = (primary?: string | null, secondary?: string | null): string | null => {
  if (typeof primary === "string" && primary.trim()) return primary;
  if (typeof secondary === "string" && secondary.trim()) return secondary;
  return null;
};

const normalizeUser = (user: any): User => {
  if (!user) {
    return user;
  }

  const avatarUrl =
    normalizeAvatar(user.avatar_url, normalizeAvatar(user.avatar, user.avatar_path)) ?? null;

  return {
    ...user,
    avatar_url: avatarUrl,
    isPremium: resolvePremiumFlag(user),
    premiumUntil: user.premiumUntil ?? user.premium_until ?? null,
    likesVisibility: normalizeVisibilitySetting((user as any)?.likesVisibility ?? (user as any)?.likes_visibility),
    followsVisibility: normalizeVisibilitySetting((user as any)?.followsVisibility ?? (user as any)?.follows_visibility),
  } as User;
};

const normalizeUserProfile = (profile: any): UserProfile => {
  if (!profile) {
    return profile;
  }

  const avatarUrl =
    normalizeAvatar(profile.avatar_url, normalizeAvatar(profile.avatar, profile.avatar_path)) ?? undefined;

  const likesVisibility = normalizeVisibilitySetting((profile as any)?.likesVisibility ?? (profile as any)?.likes_visibility);
  const followsVisibility = normalizeVisibilitySetting((profile as any)?.followsVisibility ?? (profile as any)?.follows_visibility);
  const canViewLikesRaw = (profile as any)?.canViewLikes ?? (profile as any)?.can_view_likes;
  const canViewFollowListsRaw = (profile as any)?.canViewFollowLists ?? (profile as any)?.can_view_follow_lists;

  return {
    ...profile,
    avatar_url: avatarUrl,
    isPremium: resolvePremiumFlag(profile),
    premiumUntil: profile.premiumUntil ?? profile.premium_until ?? null,
    lastSignInAt: profile.lastSignInAt ?? profile.last_sign_in_at ?? null,
    followersCount: parseNullableNumber((profile as any)?.followersCount ?? (profile as any)?.followers_count),
    followingCount: parseNullableNumber((profile as any)?.followingCount ?? (profile as any)?.following_count),
    likesVisibility,
    followsVisibility,
    canViewLikes: typeof canViewLikesRaw === "boolean" ? canViewLikesRaw : undefined,
    canViewFollowLists:
      typeof canViewFollowListsRaw === "boolean" ? canViewFollowListsRaw : undefined,
  } as UserProfile;
};

export class UserService {
  async getProfile(): Promise<User | null> {
    const res = await apiClient.get<{ success?: boolean; user?: User }>(
      API_CONFIG.ENDPOINTS.PROFILE
    );

    const payload = res.data;
    if (!payload) {
      return null;
    }

    if (typeof payload === "object" && "user" in payload && payload.user) {
      return normalizeUser(payload.user);
    }

    if ((payload as unknown as User).id) {
      return normalizeUser(payload as unknown as User);
    }

    return null;
  }

  async updateProfile(profileData: UpdateProfileRequest): Promise<User> {
    console.log("🔄 Calling updateProfile with:", JSON.stringify(profileData, null, 2));
    console.log("🔄 API endpoint:", API_CONFIG.ENDPOINTS.PROFILE);
    
    const res = await apiClient.patch<{ ok: boolean; user: User }>(
      API_CONFIG.ENDPOINTS.PROFILE,
      profileData
    );
    
    console.log("🔄 UpdateProfile response:", res);
    
    if (!res.data?.user) throw new Error("Profile update failed");
    
    // ✅ 返回更新后的完整用户数据
    return normalizeUser(res.data.user);
  }

  // ✅ 修复后的头像上传：统一处理拍照和图库，支持 FormData + base64 fallback
  async uploadAvatar(imageUri: string, assetInfo?: any): Promise<string> {
    try {
      console.log("📸 Starting avatar upload...");
      console.log("📸 Image URI:", imageUri);
      console.log("📸 Asset info:", assetInfo);

      // ✅ 统一处理文件名和类型（兼容拍照和图库）
      let fileName: string;
      let fileType: string;

      if (assetInfo?.fileName) {
        // 图库模式：使用原始文件名
        fileName = assetInfo.fileName;
        fileType = assetInfo.type || "image/jpeg";
      } else {
        // 拍照模式：动态生成文件名
        const uriFileName = imageUri.split("/").pop() || "";
        const hasExtension = uriFileName.includes(".");
        
        if (hasExtension) {
          fileName = uriFileName;
          fileType = uriFileName.endsWith(".png") ? "image/png" : "image/jpeg";
        } else {
          // 拍照模式可能没有扩展名，动态生成
          fileName = `avatar_${Date.now()}.jpg`;
          fileType = "image/jpeg";
        }
      }

      // ✅ 确保文件类型正确（iOS拍照可能返回"image"）
      if (fileType === "image") {
        fileType = "image/jpeg";
      }

      console.log("📸 Final file name:", fileName);
      console.log("📸 Final file type:", fileType);

      // --- 方法 1：正确的 FormData 格式 ---
      try {
        const formData = new FormData();
        formData.append("file", {
          uri: imageUri,
          name: fileName,
          type: fileType,
        } as any);

        console.log("👉 Trying FormData upload...");
        console.log("📸 API endpoint:", `${API_CONFIG.ENDPOINTS.PROFILE}/avatar`);
        
        // ✅ 使用正确的API调用方式，不手动设置Content-Type
        const response = await apiClient.post<{ avatarUrl: string }>(
          `${API_CONFIG.ENDPOINTS.PROFILE}/avatar`,
          formData
        );

        console.log("✅ FormData upload success:", response.data);
        return response.data!.avatarUrl;
      } catch (err) {
        console.warn("⚠️ FormData upload failed, trying base64 fallback:", err);
        // --- 方法 2：base64 fallback ---
        console.log("🔁 Fallback to base64 upload...");
        const base64Data = await this.convertImageToBase64(imageUri);
        const res = await apiClient.post<{ avatarUrl: string }>(
          `${API_CONFIG.ENDPOINTS.PROFILE}/avatar-base64`,
          { imageData: base64Data, fileName }
        );

        if (res.data?.avatarUrl) {
          return res.data!.avatarUrl;
        }
        throw new Error("Avatar upload failed: no avatarUrl");
      }
    } catch (error) {
      console.error("❌ Avatar upload error:", error);
      throw error;
    }
  }

  private async convertImageToBase64(uri: string): Promise<string> {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    return base64;
  }

  async deleteAvatar(): Promise<void> {
    await apiClient.delete(`${API_CONFIG.ENDPOINTS.PROFILE}/avatar`);
  }

  // 获取其他用户信息
  async getUserProfile(username: string): Promise<UserProfile | null> {
    try {
      console.log("📖 Fetching user profile for:", username);
      
      const response = await apiClient.get<{ success: boolean; user: UserProfile }>(
        `/api/users/${username}`
      );
      
      console.log("📖 User profile response:", response);
      
      if (response.data?.success && response.data.user) {
        console.log("✅ User profile found:", response.data.user.username);
        return normalizeUserProfile(response.data.user);
      }
      
      console.log("❌ No user profile data received");
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // ✅ 通过 userId 获取用户信息（返回简化的用户对象，主要用于获取 username）
  async getUserById(userId: string): Promise<{ username: string } | null> {
    try {
      console.log("📖 Fetching user by ID:", userId);
      
      // 尝试通过 /api/users/id/:id 端点获取用户
      // 如果后端没有这个端点，这个调用会失败，我们会 catch 住错误
      const response = await apiClient.get<{ success: boolean; user: { username: string } }>(
        `/api/users/id/${userId}`
      );
      
      if (response.data?.success && response.data.user?.username) {
        console.log("✅ User found by ID:", response.data.user.username);
        return response.data.user;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error fetching user by ID:', error);
      // 如果后端不支持通过 ID 查询，返回 null
      return null;
    }
  }

  // 获取用户的 listings
  async getUserListings(
    username: string,
    status: 'active' | 'sold' | 'all' = 'active',
    params?: { limit?: number; offset?: number }
  ): Promise<{ listings: any[]; total: number }> {
    try {
      console.log("📖 Fetching listings for user:", username, "status:", status, "params:", params);

      const queryParams: any = { status };
      if (params?.limit) queryParams.limit = params.limit;
      if (params?.offset) queryParams.offset = params.offset;

      const response = await apiClient.get<{ success: boolean; listings: any[]; total?: number }>(
        `/api/users/${username}/listings`,
        queryParams
      );

      console.log("📖 User listings response:", response);

      if (response.data?.success && response.data.listings) {
        const total = response.data.total ?? response.data.listings.length;
        console.log(`✅ Found ${response.data.listings.length} listings for user`);
        console.log(`📊 Backend total: ${response.data.total} | Fallback total: ${total}`);
        if (!response.data.total) {
          console.warn('⚠️ Backend did not return total field! Using listings.length as fallback');
        }
        return {
          listings: response.data.listings,
          total,
        };
      }
      
      throw new Error('No listings data received');
    } catch (error) {
      console.error('Error fetching user listings:', error);
      throw error;
    }
  }

  // Follow/Unfollow 用户
  async followUser(username: string): Promise<boolean> {
    try {
      console.log("👥 Following user:", username);
      
      const response = await apiClient.post<{ success: boolean; isFollowing: boolean }>(
        `/api/users/${username}/follow`
      );
      
      console.log("👥 Follow response:", response);
      
      if (response.data?.success) {
        console.log(`✅ Successfully followed ${username}`);
        
        // 🔔 Follow notification will be created by backend API
        console.log("🔔 Follow notification will be created by backend");
        
        return response.data.isFollowing;
      }
      
      throw new Error('Follow request failed');
    } catch (error) {
      console.error('Error following user:', error);
      throw error;
    }
  }

  async unfollowUser(username: string): Promise<boolean> {
    try {
      console.log("👥 Unfollowing user:", username);
      
      const response = await apiClient.delete<{ success: boolean; isFollowing: boolean }>(
        `/api/users/${username}/follow`
      );
      
      console.log("👥 Unfollow response:", response);
      
      if (response.data?.success) {
        console.log(`✅ Successfully unfollowed ${username}`);
        return response.data.isFollowing;
      }
      
      throw new Error('Unfollow request failed');
    } catch (error) {
      console.error('Error unfollowing user:', error);
      throw error;
    }
  }

  async checkFollowStatus(username: string): Promise<boolean> {
    try {
      console.log("👥 Checking follow status for:", username);
      
      const response = await apiClient.get<{ success: boolean; isFollowing: boolean }>(
        `/api/users/${username}/follow`
      );
      
      console.log("👥 Follow status response:", response);
      
      if (response.data?.success) {
        console.log(`✅ Follow status: ${response.data.isFollowing}`);
        return response.data.isFollowing;
      }
      
      throw new Error('Failed to check follow status');
    } catch (error) {
      console.error('Error checking follow status:', error);
      throw error;
    }
  }

  // 获取当前用户的follow统计
  async getMyFollowStats(): Promise<{
    followersCount: number;
    followingCount: number;
    reviewsCount: number;
  }> {
    try {
      console.log("👥 Fetching my follow stats");
      
      const response = await apiClient.get<{ success: boolean; user: UserProfile }>(
        API_CONFIG.ENDPOINTS.PROFILE
      );
      
      console.log("👥 My follow stats response:", response);
      
      if (response.data?.success && response.data.user) {
        console.log(`✅ My follow stats: ${response.data.user.followersCount} followers, ${response.data.user.followingCount} following`);
        return {
          followersCount: response.data.user.followersCount ?? 0,
          followingCount: response.data.user.followingCount ?? 0,
          reviewsCount: response.data.user.reviewsCount ?? 0,
        };
      }
      
      throw new Error('Failed to get follow stats');
    } catch (error) {
      console.error('Error getting follow stats:', error);
      throw error;
    }
  }

  async getMyFollowList(type: "followers" | "following"): Promise<FollowListEntry[]> {
    try {
      console.log("👥 Fetching my follow list", type);

      const response = await apiClient.get<{ success?: boolean; data?: FollowListEntry[] }>(
        "/api/profile/follows",
        { type },
      );

      if (response.data?.data && Array.isArray(response.data.data)) {
        console.log(`✅ Loaded ${response.data.data.length} ${type}`);
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error(`❌ Error fetching follow list (${type}):`, error);
      throw error;
    }
  }

  async getUserFollowList(
    username: string,
    type: "followers" | "following",
  ): Promise<FollowListEntry[]> {
    try {
      console.log("👥 Fetching follow list for user", username, type);

      const response = await apiClient.get<{ success?: boolean; data?: FollowListEntry[]; visibility?: VisibilitySetting }>(
        `/api/users/${encodeURIComponent(username)}/follows`,
        { type },
      );

      if (response.data?.data && Array.isArray(response.data.data)) {
        console.log(`✅ Loaded ${response.data.data.length} ${type} for ${username}`);
        return response.data.data;
      }

      return [];
    } catch (error) {
      console.error(`❌ Error fetching follow list for ${username} (${type}):`, error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw error;
    }
  }

  // 获取用户的 reviews
  async getUserReviews(username: string): Promise<any[]> {
    try {
      console.log("⭐ Fetching reviews for user:", username);
      
      const response = await apiClient.get<{ reviews: any[]; totalCount: number }>(
        `/api/users/${username}/reviews`
      );
      
      console.log("⭐ User reviews response:", response);
      
      if (response.data?.reviews) {
        console.log(`✅ Found ${response.data.reviews.length} reviews for user`);
        return response.data.reviews;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      throw error;
    }
  }
}

export const userService = new UserService();
