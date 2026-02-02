import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, BackHandler } from "react-native";
import Icon from "../../components/Icon";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStackParamList } from "../../App";
import { LOGO_FULL_COLOR } from "../../constants/assetUrls";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../src/services/authService";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const { login, error, clearError } = useAuth();

  // Disable back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default back behavior
      return true;
    });

    // Set navigation options to hide back button
    navigation.setOptions({
      headerShown: false,
      gestureEnabled: false,
    });

    return () => backHandler.remove();
  }, [navigation]);

  const handleLogin = async () => {
    // Clear previous errors
    setLocalError(null);
    clearError();

    // Validation
    if (!email.trim() && !password.trim()) {
      setLocalError("Please enter your email and password");
      return;
    }
    if (!email.trim()) {
      setLocalError("Please enter your email address");
      return;
    }
    if (!password.trim()) {
      setLocalError("Please enter your password");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      // 登录成功后，拉取一次用户资料以判定是否已有偏好
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
      } catch {}
      navigation.replace(hasCompletePreferences ? "Main" : "OnboardingPreference");
    } catch (error: any) {
      // Handle different error types based on HTTP status code and message
      const errorMessage = error.message || "An unexpected error occurred";
      const statusCode = error.status || error.statusCode;

      // Handle errors based on HTTP status code first
      if (statusCode === 401) {
        setLocalError("Invalid email or password. Please check your credentials and try again.");
      } else if (statusCode === 403) {
        setLocalError("Your account has been suspended. Please contact support.");
      } else if (statusCode === 404) {
        setLocalError("Account not found. Please check your email or sign up.");
      } else if (statusCode === 429) {
        setLocalError("Too many login attempts. Please try again later.");
      } else if (statusCode >= 500) {
        setLocalError("Server error. Please try again later.");
      } else if (statusCode === 0 || errorMessage.toLowerCase().includes("network") ||
                 errorMessage.toLowerCase().includes("connection") ||
                 errorMessage.toLowerCase().includes("timeout")) {
        setLocalError("Network error. Please check your connection and try again.");
      } else if (errorMessage.toLowerCase().includes("invalid") ||
                 errorMessage.toLowerCase().includes("credentials") ||
                 errorMessage.toLowerCase().includes("password")) {
        setLocalError("Invalid email or password. Please try again.");
      } else if (errorMessage.toLowerCase().includes("not found") ||
                 errorMessage.toLowerCase().includes("user")) {
        setLocalError("Account not found. Please check your email or sign up.");
      } else {
        // Show the server's error message if available, otherwise show generic error
        setLocalError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* 欢迎文字 */}
        <Text style={styles.welcome}>Welcome!</Text>
        <View style={styles.logoWrapper}>
          <LOGO_FULL_COLOR width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
        </View>

        {/* 输入框 */}
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#9AA0A6"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#9AA0A6"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            multiline={false}
            numberOfLines={1}
          />
          
        </View>

        {/* 忘记密码 */}
        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
        <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* 错误信息 - 优先显示本地错误，避免显示context中的原始错误信息 */}
        {localError && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={18} color="#DC2626" style={styles.errorIcon} />
            <Text style={styles.errorText}>{localError}</Text>
          </View>
        )}

        {/* 登录按钮 */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.loginText}>Login</Text>
          )}
        </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BRAND_RED = "#F54B3D";
const INPUT_BG = "#F6F7F9";

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 24, 
    justifyContent: "center" // 让内容垂直居中
  },

  welcome: { fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 8 },
  logoWrapper: {
    width: 140,
    height: 100,
    marginBottom: 32,
  },

  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: INPUT_BG,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 0 : 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    fontSize: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: "#EEF0F3",
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'android' ? 0 : 0,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    includeFontPadding: false,
    paddingVertical: Platform.OS === 'android' ? 0 : 16,
    textAlignVertical: "center",
    lineHeight: 16,
    height: Platform.OS === 'android' ? 50 : undefined,
  },

  forgot: {
    alignSelf: "flex-end",
    color: "#6B7280",
    fontWeight: "600",
    marginVertical: 12,
    fontSize: 14,
  },

  loginBtn: {
    height: 56,
    backgroundColor: BRAND_RED,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,

  },
  loginText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  loginBtnDisabled: { opacity: 0.6 },

  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 14,
    lineHeight: 20,
  },
});

