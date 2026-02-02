import React from "react";
import {
  Image,
  type ImageSourcePropType,
  type ImageStyle,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Icon from "./Icon";
import { useAuth } from "../contexts/AuthContext";

type BadgePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface AvatarProps {
  source: ImageSourcePropType;
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  isPremium?: boolean | null;
  self?: boolean;
  badgePosition?: BadgePosition;
  showBadge?: boolean;
  badgeScale?: number; // 0..1 of size, default 0.38
  badgeBackgroundColor?: string;
  badgeIconColor?: string;
  // badgeOffset: translate in pixels applied after anchoring (positive x moves right, positive y moves down)
  badgeOffset?: { x?: number; y?: number };
}

const BADGE_ANCHOR_STYLE: Record<BadgePosition, ViewStyle> = {
  "top-left": { top: 0, left: 0 },
  "top-right": { top: 0, right: 0 },
  "bottom-left": { bottom: 0, left: 0 },
  "bottom-right": { bottom: 0, right: 0 },
};

export default function Avatar({
  source,
  size,
  style,
  containerStyle,
  isPremium,
  self,
  badgePosition = "bottom-right",
  showBadge,
  badgeScale = 0.38,
  badgeBackgroundColor = "#ffffffff", // amber-100
  badgeIconColor = "#F54B3D", // amber-600
  badgeOffset,
}: AvatarProps) {
  const { user } = useAuth();
  // 尝试从 style 推断尺寸（当未显式传入 size 时）
  const flatImageStyle = StyleSheet.flatten(style) as ImageStyle | undefined;
  const inferredW =
    flatImageStyle && typeof flatImageStyle.width === "number"
      ? flatImageStyle.width
      : undefined;
  const inferredH =
    flatImageStyle && typeof flatImageStyle.height === "number"
      ? flatImageStyle.height
      : undefined;
  const inferredSize =
    typeof size === "number"
      ? size
      : typeof inferredW === "number" && typeof inferredH === "number"
      ? Math.min(inferredW, inferredH)
      : inferredW ?? inferredH;

  const computedSizeStyle: ImageStyle | undefined =
    typeof size === "number"
      ? { width: size, height: size, borderRadius: size / 2 }
      : undefined;

  const containerSizeStyle: ViewStyle | undefined =
    typeof (inferredSize as number) === "number"
      ? { width: inferredSize as number, height: inferredSize as number }
      : undefined;

  const finalIsPremium = isPremium ?? (self ? Boolean(user?.isPremium) : false);
  const shouldShowBadge = showBadge ?? finalIsPremium;
  const clampedScale = Math.max(0.18, Math.min(0.6, badgeScale));
  const effectiveSize = typeof size === "number" ? size : inferredSize;
  const badgeSize =
    typeof effectiveSize === "number"
      ? Math.max(9, Math.round((effectiveSize as number) * clampedScale))
      : 18;

  const offsetX = (badgeOffset && typeof badgeOffset.x === "number") ? badgeOffset.x : 0;
  const offsetY = (badgeOffset && typeof badgeOffset.y === "number") ? badgeOffset.y : 0;

  return (
    <View style={[styles.container, containerSizeStyle, containerStyle]}>
      <Image source={source} style={[computedSizeStyle, style]} />
      {shouldShowBadge ? (
        <View
          style={[
            styles.badge,
            BADGE_ANCHOR_STYLE[badgePosition],
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: badgeBackgroundColor,
              transform: [{ translateX: offsetX }, { translateY: offsetY }],
            },
          ]}
        >
          <Icon name="star" size={Math.round(badgeSize * 0.68)} color={badgeIconColor} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1.5,
  },
});
