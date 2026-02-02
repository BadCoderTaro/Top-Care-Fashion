import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LOGO_WHITE } from "../../constants/assetUrls";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../src/services/authService";

type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Login: undefined;
  OnboardingPreference: undefined;
  Main: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export default function SplashScreen({ navigation }: Props) {
  const { loading, isAuthenticated } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = React.useState(false);

  // 🔥 确保 Splash screen 至少显示 1.5 秒
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1500); // 1.5 秒最小显示时间

    return () => clearTimeout(timer);
  }, []);

  // 应用启动时根据认证状态决定跳转：
  // - 已登录 -> 检查偏好是否完整，决定进入 Main 或 OnboardingPreference
  // - 未登录 -> 进入 Landing
  useEffect(() => {
    // 🔥 等待 AuthContext 完成初始化 AND 最小显示时间
    if (loading || !minTimeElapsed) return;

    const checkPreferencesAndNavigate = async () => {
      if (isAuthenticated) {
        // 检查用户偏好是否完整
        let hasCompletePreferences = false;
        try {
          const u = await authService.getCurrentUser();
          // 严格检查：要求所有偏好字段都已填写（包括生日）
          hasCompletePreferences = Boolean(
            u &&
            u.dob && // 检查生日是否已填写
            Array.isArray(u.preferred_styles) && u.preferred_styles.length > 0 &&
            u.preferred_size_shoe &&
            u.preferred_size_top &&
            u.preferred_size_bottom
          );
        } catch (error) {
          console.warn("Failed to check user preferences, proceeding to Main:", error);
        }
        navigation.replace(hasCompletePreferences ? "Main" : "OnboardingPreference");
      } else {
        navigation.replace("Landing");
      }
    };

    checkPreferencesAndNavigate();
  }, [loading, minTimeElapsed, isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
  <LOGO_WHITE width={160} height={120} preserveAspectRatio="xMidYMid meet" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F54B3D", // 品牌红
    justifyContent: "center",
    alignItems: "center",
  },
  // LOGO_WHITE is an SVG component; sizing handled via props.
});
