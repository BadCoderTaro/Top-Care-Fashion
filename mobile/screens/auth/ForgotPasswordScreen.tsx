import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { LOGO_FULL_COLOR } from "../../constants/assetUrls";
import Icon from "../../components/Icon";
import { API_BASE_URL } from "../../src/config/api";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const handleOpenResetPassword = async () => {
    const resetPasswordUrl = `${API_BASE_URL.replace(/\/+$/, '')}/reset-password`;

    try {
      const supported = await Linking.canOpenURL(resetPasswordUrl);
      if (supported) {
        await Linking.openURL(resetPasswordUrl);
      } else {
        Alert.alert("Error", "Cannot open the reset password page");
      }
    } catch (error) {
      console.error("Error opening reset password URL:", error);
      Alert.alert("Error", "Failed to open reset password page");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 返回按钮 */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Icon name="chevron-back" size={20} color="#111" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoWrapper}>
          <LOGO_FULL_COLOR width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
        </View>

        {/* 标题 */}
        <Text style={styles.title}>Reset Your Password</Text>
        <Text style={styles.subtitle}>
          To reset your password, please open our secure web page where you can enter your email address and receive a password reset link.
        </Text>

        {/* 打开浏览器按钮 */}
        <TouchableOpacity style={styles.openBrowserBtn} onPress={handleOpenResetPassword}>
          <Icon name="globe-outline" size={24} color="#fff" />
          <Text style={styles.openBrowserText}>Open Reset Password Page</Text>
        </TouchableOpacity>

        {/* 说明信息 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>1.</Text>
            <Text style={styles.infoText}>You'll be taken to our secure web page</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>2.</Text>
            <Text style={styles.infoText}>Enter your email address</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>3.</Text>
            <Text style={styles.infoText}>Check your email for the reset link</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>4.</Text>
            <Text style={styles.infoText}>Follow the link to create a new password</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    padding: 24,
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  logoWrapper: {
    width: 140,
    height: 100,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 32,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  openBrowserBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 56,
    backgroundColor: "#F54B3D",
    borderRadius: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
    width: "100%",
  },
  openBrowserText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  infoBox: {
    width: "100%",
    backgroundColor: "#F6F7F9",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEF0F3",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoBullet: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F54B3D",
    width: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});
