import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import ASSETS from "../../../constants/assetUrls";
import { notificationService, type Notification } from "../../../src/services/notificationService";
import { messagesService } from "../../../src/services/messagesService";
import type { Conversation } from "../../../src/services/messagesService";

export default function NotificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [conversationCache, setConversationCache] = useState<Conversation[] | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  // ✅ 页面聚焦时自动刷新
  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      console.log("🔔 Loading notifications...");
      
      const fetchedNotifications = await notificationService.getNotifications();
      setNotifications(fetchedNotifications);
      
      console.log("🔔 Loaded", fetchedNotifications.length, "notifications");
    } catch (error) {
      console.error("❌ Error loading notifications:", error);
      if (!isRefresh) {
        Alert.alert("Error", "Failed to load notifications. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ✅ 下拉刷新
  const handleRefresh = () => {
    loadNotifications(true);
  };

  const getConversationsWithCache = async (): Promise<Conversation[]> => {
    if (conversationCache) {
      return conversationCache;
    }

    try {
      console.log("💬 Preloading conversations for notification navigation");
      const convs = await messagesService.getConversations();
      setConversationCache(convs);
      return convs;
    } catch (error) {
      console.error("❌ Failed to preload conversations:", error);
      return [];
    }
  };

  const resolveConversationContext = async (notification: Notification) => {
    let conversationId = notification.conversationId;
    let orderId = notification.orderId;

    if ((!conversationId || !orderId) && notification.orderId) {
      const conversations = await getConversationsWithCache();
      const matchedConversation = conversations.find((conv) => conv.order?.id?.toString() === notification.orderId);

      if (matchedConversation) {
        conversationId = matchedConversation.id;
        orderId = matchedConversation.order?.id ?? notification.orderId;
        console.log("💬 Resolved conversation via orderId:", {
          matchedConversationId: matchedConversation.id,
          orderId,
        });
      }
    }

    return { conversationId, orderId };
  };

  const handleDeleteNotification = (notification: Notification) => {
    Alert.alert(
      "Delete Notification",
      `Are you sure you want to delete "${notification.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ Deleting notification:", notification.id);
              await notificationService.deleteNotification(notification.id);
              setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
              console.log("✅ Notification deleted");
            } catch (error) {
              console.error("❌ Error deleting notification:", error);
              Alert.alert("Error", "Failed to delete notification. Please try again.");
            }
          },
        },
      ]
    );
  };

  // 一键标记所有通知为已读
  const handleMarkAllAsRead = async () => {
    try {
      const unreadCount = notifications.filter(n => !n.isRead).length;
      if (unreadCount === 0) {
        return;
      }

      console.log("🔔 Marking all notifications as read");
      await notificationService.markAllAsRead();
      
      // 更新本地状态
      setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
      
      console.log("✅ All notifications marked as read");
      Alert.alert("Success", `${unreadCount} notification${unreadCount > 1 ? 's' : ''} marked as read`);
    } catch (error) {
      console.error("❌ Error marking all as read:", error);
      Alert.alert("Error", "Failed to mark notifications as read. Please try again.");
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // 标记为已读
      if (!notification.isRead) {
        await notificationService.markAsRead(notification.id);
        
        // 更新本地状态
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id 
              ? { ...n, isRead: true }
              : n
          )
        );
      }

      // ✅ 详细的调试日志
      console.log("🔔 Notification clicked - Full data:", JSON.stringify(notification, null, 2));
      console.log("🔔 Notification clicked - Key fields:", {
        type: notification.type,
        orderId: notification.orderId,
        conversationId: notification.conversationId,
        listingId: notification.listingId,
        related_user_id: notification.related_user_id,
      });
      console.log("🔔 Type checks:", {
        hasConversationId: !!notification.conversationId,
        hasOrderId: !!notification.orderId,
        hasListingId: !!notification.listingId,
        conversationIdType: typeof notification.conversationId,
        orderIdType: typeof notification.orderId,
      });

      // ✅ 根据通知类型进行导航
      const notifType = notification.type?.toLowerCase();

      switch (notifType) {
        case 'order':
        case 'review': {
          const { conversationId, orderId } = await resolveConversationContext(notification);

          // ✅ 使用 ChatStandalone（根 Stack）- 避免嵌套导航导致的返回问题
          if (conversationId) {
            console.log("📱 Navigating to ChatStandalone:", {
              conversationId,
            });
            try {
              // 🔥 使用 ChatStandalone 确保返回时回到 NotificationScreen
              navigation.navigate("ChatStandalone", {
                conversationId,
                sender: notification.username || "User",
                kind: "order",
              });
            } catch (err) {
              console.error("❌ Failed to navigate to ChatStandalone:", err);
              Alert.alert("Error", "Failed to open conversation");
            }
          } else if (notification.listingId) {
            // ⚠️ 降级方案：如果缺少 conversationId，但有 listingId，跳转到商品详情
            console.warn("⚠️ Missing conversationId, fallback to ListingDetail");
            console.log("📱 Navigating to ListingDetail (fallback):", notification.listingId);
            try {
              navigation.navigate("Buy", {
                screen: "ListingDetail",
                params: { listingId: notification.listingId }
              });
            } catch (err) {
              console.error("❌ Failed to navigate to ListingDetail:", err);
              Alert.alert("Error", "Failed to open listing details");
            }
          } else {
            // ❌ 完全缺少必要信息，显示提示
            console.error("❌ Cannot navigate: missing conversationId and listingId");
            Alert.alert(
              "Notice",
              "This is an old notification. The related conversation may no longer be available."
            );
          }
          break;
        }

        case 'like':
          // ✅ 导航到商品详情（Buy → ListingDetail）
          if (notification.listingId) {
            console.log("📱 Navigating to ListingDetail:", notification.listingId);
            try {
              navigation.navigate("Buy", {
                screen: "ListingDetail",
                params: { listingId: notification.listingId }
              });
            } catch (err) {
              console.error("❌ Failed to navigate to ListingDetail:", err);
              Alert.alert("Error", "Failed to open listing details");
            }
          }
          break;

        case 'follow':
          // ✅ 导航到用户资料页面（Buy → UserProfile）
          if (notification.username) {
            // 优先使用 username
            console.log("📱 Navigating to UserProfile (username):", notification.username);
            try {
              navigation.navigate("Buy", {
                screen: "UserProfile",
                params: { username: notification.username }
              });
            } catch (err) {
              console.error("❌ Failed to navigate to UserProfile:", err);
              Alert.alert("Error", "Failed to open user profile");
            }
          } else if (notification.related_user_id) {
            // 降级方案：使用 userId
            console.warn("⚠️ No username, using userId:", notification.related_user_id);
            try {
              navigation.navigate("Buy", {
                screen: "UserProfile",
                params: { userId: notification.related_user_id }
              });
            } catch (err) {
              console.error("❌ Failed to navigate to UserProfile:", err);
              Alert.alert("Error", "Failed to open user profile");
            }
          } else {
            console.error("❌ Missing both username and related_user_id for FOLLOW notification");
            Alert.alert("Notice", "Cannot open user profile: user information not available");
          }
          break;

        case 'system':
          // 系统通知 - 无需导航
          console.log("📱 System notification clicked");
          break;

        default:
          console.log("📱 Unknown notification type:", notification.type);
      }
    } catch (error) {
      console.error("❌ Error handling notification press:", error);
      Alert.alert("Error", "Failed to handle notification");
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    // 🔥 根据通知类型决定显示什么图片：
    // ORDER/REVIEW/FOLLOW → 显示用户头像（image 字段）
    // LIKE → 可以显示商品图片（listingImage）
    let imageSource;
    
    if (item.type === 'order' || item.type === 'review' || item.type === 'follow') {
      // 订单、评论、关注通知 → 显示用户头像
      if (item.image && item.image !== '') {
        imageSource = { uri: item.image };
      } else {
        imageSource = ASSETS.avatars.default;
      }
    } else if (item.type === 'like') {
      // 点赞通知 → 优先显示商品图片，回退到用户头像
      if (item.listingImage && item.listingImage !== '') {
        imageSource = { uri: item.listingImage };
      } else if (item.image && item.image !== '') {
        imageSource = { uri: item.image };
      } else {
        imageSource = ASSETS.avatars.default;
      }
    } else {
      // 其他通知 → 优先用户头像，回退到商品图片
      if (item.image && item.image !== '') {
        imageSource = { uri: item.image };
      } else if (item.listingImage && item.listingImage !== '') {
        imageSource = { uri: item.listingImage };
      } else {
        imageSource = ASSETS.avatars.default;
      }
    }

    const renderRightActions = () => (
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteNotification(item)}
        >
          <Icon name="trash" size={20} color="#fff" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.7}
        >
          <Image
            source={imageSource}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, !item.isRead && styles.unreadTitle]}>
              {item.title}
            </Text>
            {item.message ? (
              <Text style={styles.message} numberOfLines={2}>
                {item.message}
              </Text>
            ) : null}
            <Text style={styles.time}>{item.time}</Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // 计算未读通知数量
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  // 创建"Mark All Read"按钮（始终显示，无未读时变灰）
  const markAllReadButton = (
    <TouchableOpacity 
      onPress={hasUnread ? handleMarkAllAsRead : undefined}
      style={styles.markAllButton}
      activeOpacity={hasUnread ? 0.7 : 1}
      disabled={!hasUnread}
    >
      <Icon 
        name="checkmark-done" 
        size={24} 
        color={hasUnread ? "#fff" : "rgba(255, 255, 255, 0.4)"} 
      />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Notifications" showBack bgColor="#F54B3D" textColor="#fff" iconColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F54B3D" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header 
        title="Notifications" 
        showBack 
        bgColor="#F54B3D" 
        textColor="#fff" 
        iconColor="#fff"
        rightAction={markAllReadButton}
      />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#F54B3D"]}
            tintColor="#F54B3D"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>You'll see updates about orders, likes, and follows here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  markAllButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f2f2f2",
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  unreadTitle: {
    fontWeight: "700",
  },
  message: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F54B3D",
    marginLeft: 8,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#ff4444",
    borderRadius: 10,
    marginVertical: 4,
    marginRight: 8,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#ff4444",
    borderRadius: 10,
    minWidth: 92,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});
