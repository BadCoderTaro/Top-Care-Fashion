import type { FC } from "react";
import type { SvgProps } from "react-native-svg";
import type { ImageSourcePropType } from "react-native";

import LogoFullColor from "../assets/logo_brandcolor.svg";
import LogoWhite from "../assets/logo_white.svg";

// ✅ 本地 PNG/JPG 资源
const TOP_Avatar = require("../assets/TOP_Avatar.png");
const DefaultAvatar = require("../assets/default_avatar.png");
const PremiumBg = require("../assets/premium_bg.jpg");

export const REMOTE_ASSET_BASE_URL =
  "https://ilykxrtilsbymlncunua.supabase.co/storage/v1/object/public/assets";

// 类型定义
export type SvgAsset = FC<SvgProps>;
export type ImageAsset = ImageSourcePropType;

// ✅ 导出资源
export const LOGO_FULL_COLOR: SvgAsset = LogoFullColor;
export const LOGO_WHITE: SvgAsset = LogoWhite;
export const DEFAULT_AVATAR: ImageAsset = DefaultAvatar;
export const PREMIUM_BG: ImageAsset = PremiumBg;

export const ASSETS = {
  logos: {
    fullColor: LOGO_FULL_COLOR,
    white: LOGO_WHITE,
  },
  images: {
    defaultAvatar: DEFAULT_AVATAR,
    premiumBg: PREMIUM_BG,
  },
  avatars: {
    default: DEFAULT_AVATAR, // 用户默认头像
    top: TOP_Avatar,         // ✅ TOP 官方头像（PNG）
  },
  remoteBaseUrl: REMOTE_ASSET_BASE_URL,
} as const;

export default ASSETS;

