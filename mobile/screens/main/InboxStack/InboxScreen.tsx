import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  Animated,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Swipeable } from "react-native-gesture-handler";
// Keep SafeAreaView inside Header; avoid double SafeArea padding here
import Icon from "../../../components/Icon";
import Header from "../../../components/Header";
import ASSETS from "../../../constants/assetUrls";
import { messagesService, pollingService, type Conversation } from "../../../src/services";
import { notificationService } from "../../../src/services/notificationService";
import { useAuth } from "../../../contexts/AuthContext";
import { premiumService } from "../../../src/services";
import Avatar from "../../../components/Avatar";

// 模拟多条对话（Support + Seller）
// added `unread` and `lastFrom` to support filtering
const mockThreads = [
  {
    id: "support-1",
    sender: "TOP Support",
    message: "Hey @ccc446981,",
    time: "1 month ago",
    avatar: ASSETS.avatars.top, // 红色 TOP PNG
    kind: "support",
    unread: false,
    lastFrom: "support",
  },
  {
    id: "order-2",
    sender: "seller111",
    message: "Leave a review for seller111",
    time: "Sep 25, 2025",
    avatar: { uri: "https://i.pravatar.cc/100?img=12" }, // seller111 专用头像
    kind: "order",
    order: {
      id: "ORD123",
      product: {
        title: "American Eagle Super Stretch Skinny Jeans",
        price: 10,
        image:
          "https://tse4.mm.bing.net/th/id/OIP.TC_mOkLd6sQzsLiE_uSloQHaJ3?w=600&h=799&rs=1&pid=ImgDetMain",
      },
      seller: { name: "seller111" },
      status: "Delivered",
    },
    unread: true,
    // last message came from the seller in this thread
    lastFrom: "seller",
  },
  {
    id: "order-3",
    sender: "buyer002",
    message: "I've completed my review",
    time: "Sep 26, 2025",
    avatar: { uri: "https://i.pravatar.cc/100?img=32" },
    kind: "order",
    order: {
      id: "2",
      product: {
        title: "Casual Beige Hoodie",
        price: 25,
        size: "L",
        image: "https://i5.walmartimages.com/asr/7aed82da-69af-46b8-854e-5c22d45a4df3.e7011d0ebdea1d9fabb68417c789ae16.jpeg",
      },
      seller: { name: "sellerCozy" },
      buyer: { name: "buyer002", avatar: "https://i.pravatar.cc/100?img=32" },
      status: "Completed",
    },
    unread: false,
    lastFrom: "buyer",
  },
];

export default function InboxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, updateUser } = useAuth();
  
  // filter UI state (simple modal + selectedFilter)
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const anim = useRef(new Animated.Value(0)).current;
  const filtersArr = ["All", "Unread", "From seller", "From buyer"];

  // 加载真实对话数据
  useEffect(() => {
    loadConversations();
    loadUnreadNotificationCount();
  }, []);

  // ✅ 页面聚焦时自动刷新未读数量
  useFocusEffect(
    React.useCallback(() => {
      loadUnreadNotificationCount();
    }, [])
  );

  // ✅ 加载未读notification计数（使用新方法）
  const loadUnreadNotificationCount = async () => {
    try {
      console.log("🔔 Loading unread notification count...");
      const unreadCount = await notificationService.getUnreadCount();
      setUnreadNotificationCount(unreadCount);
      console.log("🔔 Unread notification count:", unreadCount);
    } catch (error) {
      console.error("❌ Error loading unread notification count:", error);
      setUnreadNotificationCount(0);
    }
  };

  // 添加焦点监听，每次返回时刷新数据
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // Reuse MyPremiumScreen logic: sync premium status on focus
      if (user?.id) {
        premiumService
          .getStatus()
          .then((status) =>
            updateUser({
              // Only patch premium fields to avoid overriding core user info with stale data
              isPremium: status.isPremium,
              premiumUntil: status.premiumUntil,
            } as any),
          )
          .catch(() => {});
      }
      console.log("🔍 InboxScreen focused, refreshing conversations...");
      loadConversations();
      loadUnreadNotificationCount();
    });

    return unsubscribe;
  }, [navigation, user?.id]);

  // ✅ 订阅轮询服务的更新事件，自动刷新对话列表
  useEffect(() => {
    const unsubscribe = pollingService.onConversationUpdate(() => {
      console.log("🔄 PollingService detected new messages, refreshing InboxScreen...");
      loadConversations();
      loadUnreadNotificationCount();
    });

    return unsubscribe;
  }, []);

  const loadConversations = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      console.log("🔍 Loading conversations from API...");
      
      const apiConversations = await messagesService.getConversations();
      console.log("🔍 Conversations payload:", JSON.stringify(apiConversations.slice(0, 5), null, 2));
      const sortedConversations = [...apiConversations].sort((a, b) => {
        const aSource = a.last_message_at ?? a.time;
        const bSource = b.last_message_at ?? b.time;
        const aDate = new Date(aSource).getTime();
        const bDate = new Date(bSource).getTime();

        const aValid = Number.isFinite(aDate);
        const bValid = Number.isFinite(bDate);

        if (!aValid && !bValid) return 0;
        if (!aValid) return 1;
        if (!bValid) return -1;

        return bDate - aDate;
      });

      setConversations(sortedConversations);
      
      console.log("🔍 Loaded", apiConversations.length, "conversations from API");
      
    } catch (error) {
      console.error("❌ Error loading conversations:", error);
      // Fallback: 只显示 TOP Support 欢迎对话
      console.log("🔍 Falling back to TOP Support only");
      const topSupportConversation: Conversation = {
        id: "support-1",
        sender: "TOP Support",
        message: `Hey @${user?.username || 'user'}, Welcome to TOP! 👋`,
        time: "Just now",
        avatar: ASSETS.avatars.top,
        kind: "support",
        unread: false,
        lastFrom: "support",
        order: null
      };
      setConversations([topSupportConversation]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ✅ 下拉刷新处理函数
  const handleRefresh = () => {
    loadConversations(true);
    loadUnreadNotificationCount();
  };

  // 删除对话处理函数
  const handleDeleteConversation = async (conversationId: string, senderName: string) => {
    Alert.alert(
      "Delete Conversation",
      `Are you sure you want to delete this conversation with ${senderName}?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🗑️ Deleting conversation:", conversationId);
              await messagesService.deleteConversation(conversationId);
              console.log("✅ Conversation deleted successfully");
              
              // 重新加载对话列表
              await loadConversations();
            } catch (error) {
              console.error("❌ Error deleting conversation:", error);
              Alert.alert("Error", "Failed to delete conversation. Please try again.");
            }
          }
        }
      ]
    );
  };

  // apply filters to the conversations
  useEffect(() => {
    if (filterVisible) {
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
    }
  }, [filterVisible, anim]);

  const filteredThreads = useMemo(() => {
    if (selectedFilter === "All") return conversations;
    if (selectedFilter === "Unread") return conversations.filter((t) => t.unread);
    if (selectedFilter === "From seller") return conversations.filter((t) => t.lastFrom === "seller");
    if (selectedFilter === "From buyer") return conversations.filter((t) => t.lastFrom === "buyer");
    return conversations;
  }, [selectedFilter, conversations]);

  // Normalize preview text so Inbox shows the same semantic message as ChatScreen's system formatting
  const getPreviewText = (conv: Conversation) => {
    return (conv.message || "").toString();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* ✅ 统一用 Header 组件 */}
      <Header
        title="Inbox"
        rightAction={
          <View style={{ flexDirection: "row", columnGap: 16 }}>
            <TouchableOpacity accessibilityRole="button" onPress={() => setFilterVisible(true)}>
              <Icon name="filter-outline" size={24} color="#111" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate("Notification")}
              style={styles.notificationButton}
            >
              <Icon name="notifications-outline" size={24} color="#111" />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Custom modal dropdown (clean UI) */}
      <Modal transparent visible={filterVisible} animationType="none" onRequestClose={() => setFilterVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setFilterVisible(false)}>
          <Animated.View
            style={[
              styles.filterMenu,
              {
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }),
                  },
                ],
              },
            ]}
          >
            {filtersArr.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterItem, selectedFilter === f && styles.filterItemActive]}
                onPress={() => {
                  setSelectedFilter(f);
                  setFilterVisible(false);
                }}
              >
                <Text style={[styles.filterText, selectedFilter === f && styles.filterTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Message List */}
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={filteredThreads}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#F54B3D"
            colors={["#F54B3D"]}
          />
        }
        renderItem={({ item }) => {
          // 渲染右滑删除按钮
          const renderRightActions = () => (
            <View style={styles.rightActions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteConversation(item.id, item.sender)}
              >
                <Icon name="trash" size={20} color="#fff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          );

          return (
            <Swipeable renderRightActions={renderRightActions}>
              <TouchableOpacity
                style={styles.messageRow}
                onPress={() =>
                  navigation.navigate("Chat", {
                    sender: item.sender,
                    kind: item.kind,
                    order: item.order ?? null,
                    conversationId: item.id, // 传递 conversationId
                  })
                }
              >
                {/* Avatar with unread indicator */}
                <View style={styles.avatarContainer}>
                  <Avatar
                    source={
                      item.sender === "TOP Support"
                        ? ASSETS.avatars.top
                        : item.avatar || ASSETS.avatars.default
                    }
                    style={styles.avatar}
                    isPremium={item.sender === "TOP Support" ? false : item.isPremium}
                    badgeScale={0.28}
                  />
                {/* Unread indicator */}
                {item.unread && (
                  <View style={styles.unreadDot} />
                )}
                </View>

                {/* Texts */}
                <View style={styles.messageText}>
                  <Text style={[styles.sender, item.unread && styles.unreadSender]}>
                    {item.sender}
                  </Text>
                  <Text style={[styles.message, item.unread && styles.unreadMessage]}>
                    {getPreviewText(item)}
                  </Text>
                  <Text style={styles.time}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24, // ✅ 圆形头像
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff4444",
    borderWidth: 2,
    borderColor: "#fff",
  },
  messageText: { flex: 1 },
  sender: { fontWeight: "700", fontSize: 16, marginBottom: 2 },
  message: { fontSize: 14, color: "#333" },
  time: { fontSize: 12, color: "#888", marginTop: 2 },
  unreadSender: { fontWeight: "800" },
  unreadMessage: { fontWeight: "600" },
  // modal filter styles
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.12)", justifyContent: "flex-start", alignItems: "flex-end" },
  filterMenu: { backgroundColor: "#fff", borderRadius: 12, marginTop: 56, marginRight: 12, paddingVertical: 8, width: 160, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  filterItem: { paddingVertical: 10, paddingHorizontal: 16 },
  filterItemActive: { backgroundColor: "#F2F2F2" },
  filterText: { fontSize: 15, color: "#111" },
  filterTextActive: { color: "#F54B3D", fontWeight: "700" },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#ff4444",
    borderRadius: 10,
    marginVertical: 4,
    marginRight: 16,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#ff4444",
    borderRadius: 10,
    minWidth: 80,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  notificationButton: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#F54B3D",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});
