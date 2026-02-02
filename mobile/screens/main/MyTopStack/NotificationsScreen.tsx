import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Header from "../../../components/Header";

const PUSH_NOTIFICATION_KEY = "@push_notifications_enabled";

export default function NotificationsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 加载保存的设置
  useEffect(() => {
    loadPushNotificationSetting();
  }, []);

  const loadPushNotificationSetting = async () => {
    try {
      const saved = await AsyncStorage.getItem(PUSH_NOTIFICATION_KEY);
      if (saved !== null) {
        setPushEnabled(saved === "true");
      }
    } catch (error) {
      console.error("Error loading push notification setting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePushNotifications = async (enabled: boolean) => {
    try {
      if (enabled) {
        // 开启通知时，请求权限
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings to receive push notifications.",
            [{ text: "OK" }]
          );
          return;
        }
      }

      // 保存设置
      await AsyncStorage.setItem(PUSH_NOTIFICATION_KEY, enabled.toString());
      setPushEnabled(enabled);

      console.log(`✅ Push notifications ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      Alert.alert("Error", "Failed to update notification settings. Please try again.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Notifications" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        <SettingToggle
          label="Enable Push Notifications"
          value={pushEnabled}
          onValueChange={handleTogglePushNotifications}
          disabled={isLoading}
        />

        <Text style={styles.description}>
          Receive notifications about orders, messages, and updates from sellers.
        </Text>

        <Text style={styles.note}>
          Changes are saved automatically. You can manage notification permissions in your device settings.
        </Text>
      </ScrollView>
    </View>
  );
}

function SettingToggle({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    rowGap: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e6e6e6",
  },
  toggleLabel: {
    fontSize: 16,
    color: "#111",
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
    marginTop: 8,
  },
  note: {
    fontSize: 13,
    lineHeight: 20,
    color: "#666",
    marginTop: 16,
  },
});
