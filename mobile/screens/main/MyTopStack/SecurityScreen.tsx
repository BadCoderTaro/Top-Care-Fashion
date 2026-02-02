import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, Pressable } from "react-native";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MyTopStackParamList } from "./index";
import { apiClient } from "../../../src/services/api";
import { userService } from "../../../src/services/userService";
import { premiumService } from "../../../src/services/premiumService";
import { useAuth } from "../../../contexts/AuthContext";

declare const __DEV__: boolean;

export default function SecurityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MyTopStackParamList>>();
  const { user, updateUser } = useAuth();
  const [showDevToolsModal, setShowDevToolsModal] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openChangePassword = () => {
    navigation.navigate("ChangePassword");
  };

  const openForgotPassword = () => {
    const tabNavigator = navigation.getParent();
    const rootNavigator = tabNavigator?.getParent?.();
    if (rootNavigator && typeof rootNavigator.navigate === "function") {
      rootNavigator.navigate("ForgotPassword" as never);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const handleBlankAreaTap = () => {
    if (!__DEV__) return;
    
    tapCountRef.current += 1;
    
    // 清除之前的超时
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    
    // 如果达到5次，显示开发者工具
    if (tapCountRef.current >= 5) {
      setShowDevToolsModal(true);
      tapCountRef.current = 0;
    } else {
      // 设置2秒超时，重置计数
      tapTimeoutRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
  };

  const testAutoLogout = async () => {
    Alert.alert(
      "测试自动登出",
      "这将设置一个无效的 token，下次 API 调用将触发 401 错误，然后尝试刷新 session。由于 token 无效，刷新会失败，系统将自动登出并跳转到登录页。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确定",
          onPress: async () => {
            await apiClient.setInvalidTokenForTesting();
            Alert.alert(
              "已设置无效 Token",
              "现在返回到个人主页，系统将尝试加载数据并自动登出。",
              [
                {
                  text: "好的",
                  onPress: () => {
                    // 返回到 My TOP 主页，触发数据加载
                    navigation.goBack();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const deleteUserPreferences = async () => {
    Alert.alert(
      "删除个人信息",
      "确定要删除性别、生日、偏好风格和尺码吗？此操作不可撤销。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确定删除",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedUser = await userService.updateProfile({
                gender: null,
                dob: null,
                preferredStyles: null,
                preferredSizes: {
                  top: null,
                  bottom: null,
                  shoe: null,
                },
              });
              updateUser(updatedUser);
              Alert.alert("成功", "已删除性别、生日、偏好风格和尺码");
              setShowDevToolsModal(false);
            } catch (error) {
              console.error("删除用户偏好失败:", error);
              Alert.alert("错误", "删除失败，请稍后重试");
            }
          },
        },
      ]
    );
  };

  const cancelPremiumSubscription = async () => {
    if (!user?.isPremium) {
      Alert.alert("提示", "您当前不是 Premium 会员");
      return;
    }

    Alert.alert(
      "取消 Premium 订阅",
      "确定要取消 Premium 订阅吗？所有活跃的订阅将被标记为过期，Premium 权益将立即失效。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确定取消",
          style: "destructive",
          onPress: async () => {
            try {
              const status = await premiumService.cancel();
              updateUser({
                ...(user as any),
                isPremium: status.isPremium,
                premiumUntil: status.premiumUntil,
              });
              Alert.alert("成功", "Premium 订阅已取消");
              setShowDevToolsModal(false);
            } catch (error) {
              console.error("取消 Premium 订阅失败:", error);
              Alert.alert("错误", "取消订阅失败，请稍后重试");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Security" showBack />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Password Section */}
        <Text style={styles.sectionTitle}>Password</Text>
        <View style={styles.sectionBox}>
          <SettingItem icon="key-outline" label="Change Password" onPress={openChangePassword} />
          <SettingItem icon="lock-open-outline" label="Forgot Password" onPress={openForgotPassword} />
        </View>
        
        {/* Blank area for tap detection (only in dev mode) */}
        {__DEV__ && (
          <Pressable 
            style={styles.blankArea}
            onPress={handleBlankAreaTap}
          >
            <View style={styles.blankAreaInner} />
          </Pressable>
        )}
      </ScrollView>

      {/* Developer Tools Modal (only in dev mode) */}
      {__DEV__ && (
        <Modal
          visible={showDevToolsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDevToolsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>开发者工具</Text>
                <TouchableOpacity
                  onPress={() => setShowDevToolsModal(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <SettingItem
                  icon="bug-outline"
                  label="🧪 Test Auto Logout"
                  onPress={() => {
                    setShowDevToolsModal(false);
                    testAutoLogout();
                  }}
                />
                <SettingItem
                  icon="trash-outline"
                  label="🗑️ 删除性别/生日/偏好"
                  onPress={() => {
                    setShowDevToolsModal(false);
                    deleteUserPreferences();
                  }}
                />
                <SettingItem
                  icon="close-circle-outline"
                  label="🚫 取消 Premium 订阅"
                  onPress={() => {
                    setShowDevToolsModal(false);
                    cancelPremiumSubscription();
                  }}
                />
                <View style={styles.devNote}>
                  <Text style={styles.devNoteText}>
                    测试 token 过期后的自动登出和导航功能
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const SettingItem = ({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress?: () => void;
}) => {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <Icon name={icon} size={22} color="#333" />
        <Text style={styles.itemText}>{label}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#aaa" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    marginTop: 20,
    marginBottom: 8,
  },
  sectionBox: {
    backgroundColor: "#f5f5f7",
    borderRadius: 12,
    paddingVertical: 4,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e6e6e6",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
  itemText: {
    fontSize: 16,
    color: "#111",
  },
  devNote: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fffbf0',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f0ad4e',
    marginTop: 8,
  },
  devNoteText: {
    fontSize: 13,
    color: '#856404',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    backgroundColor: '#fff3cd',
  },
  blankArea: {
    flex: 1,
    minHeight: 200,
    marginTop: 40,
  },
  blankAreaInner: {
    flex: 1,
  },
});
