import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import Header from "../../../components/Header";
import { useAuth } from "../../../contexts/AuthContext";
import { ApiError } from "../../../src/config/api";

export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    // 清除之前的状态
    setStatus(null);
    setStatusType(null);

    // 验证输入
    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus("Please fill in all fields.");
      setStatusType("error");
      return;
    }

    if (newPassword.length < 6) {
      setStatus("New password must be at least 6 characters long.");
      setStatusType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("New passwords do not match.");
      setStatusType("error");
      return;
    }

    // 检查新密码是否与当前密码相同
    if (currentPassword === newPassword) {
      setStatus("New password must be different from your current password.");
      setStatusType("error");
      return;
    }

    setSubmitting(true);
    setStatus("Updating password...");
    setStatusType("info");

    try {
      await changePassword(currentPassword, newPassword);
      setStatus("Password updated successfully.");
      setStatusType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      let errorMessage = "Failed to change password.";

      if (error instanceof ApiError) {
        // 优先使用后端返回的 error 字段
        const backendError = error.response?.error || error.response?.message || error.message;
        
        // 根据状态码提供更友好的错误信息
        switch (error.status) {
          case 400:
            // 400 可能包含：密码相同、密码长度不够、缺少字段等
            if (backendError) {
              errorMessage = backendError;
            } else if (error.message?.includes("same") || error.message?.toLowerCase().includes("identical")) {
              errorMessage = "New password must be different from your current password.";
            } else {
              errorMessage = "Invalid password. Please check your input and try again.";
            }
            break;
          case 401:
            // 401: 当前密码错误
            errorMessage = backendError || "Current password is incorrect. Please try again.";
            break;
          case 403:
            errorMessage = backendError || "You don't have permission to change the password.";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
          default:
            errorMessage = backendError || error.message || "Failed to change password. Please try again.";
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      setStatus(errorMessage);
      setStatusType("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Change Password" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.caption}>Enter your current password and set a new one.</Text>

          <Text style={styles.label}>Current password</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            placeholder="Current password"
          textAlignVertical="center"
          />

          <Text style={styles.label}>New password</Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            placeholder="New password"
          textAlignVertical="center"
          />

          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
            placeholder="Confirm new password"
          textAlignVertical="center"
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>{submitting ? "Updating..." : "Update password"}</Text>
          </TouchableOpacity>

          {status ? (
            <Text
              style={[
                styles.status,
                statusType === "success" && styles.statusSuccess,
                statusType === "error" && styles.statusError,
                statusType === "info" && styles.statusInfo,
              ]}
            >
              {status}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  caption: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: "#111827",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "android" ? 0 : 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
    includeFontPadding: false,
  },
  button: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  status: {
    marginTop: 24,
    fontSize: 14,
    textAlign: "center",
  },
  statusSuccess: {
    color: "#10B981",
    backgroundColor: "#D1FAE5",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusError: {
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statusInfo: {
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
});
