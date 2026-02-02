import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 配置通知行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // expo-notifications >=0.32 需要额外字段
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 通知数据接口
export interface MessageNotificationData {
  title: string;
  body: string;
  conversationId: string;
  userId?: string;
  username?: string;
}

export interface AppNotificationData {
  title: string;
  body: string;
  type: 'order' | 'like' | 'follow' | 'review' | 'system';
  notificationId?: string;
  orderId?: string;
  listingId?: string;
  userId?: string;
}

// 已通知ID的存储键
const NOTIFIED_MESSAGES_KEY = '@notified_message_ids';
const NOTIFIED_NOTIFICATIONS_KEY = '@notified_notification_ids';
const PUSH_NOTIFICATION_KEY = '@push_notifications_enabled';

class LocalNotificationService {
  private notifiedMessageIds: Set<string> = new Set();
  private notifiedNotificationIds: Set<string> = new Set();
  private isInitialized = false;

  /**
   * 初始化服务 - 加载已通知的ID
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 加载已通知的消息ID
      const messageIdsJson = await AsyncStorage.getItem(NOTIFIED_MESSAGES_KEY);
      if (messageIdsJson) {
        const ids = JSON.parse(messageIdsJson);
        this.notifiedMessageIds = new Set(ids);
      }

      // 加载已通知的通知ID
      const notificationIdsJson = await AsyncStorage.getItem(NOTIFIED_NOTIFICATIONS_KEY);
      if (notificationIdsJson) {
        const ids = JSON.parse(notificationIdsJson);
        this.notifiedNotificationIds = new Set(ids);
      }

      this.isInitialized = true;
      console.log('✅ LocalNotificationService initialized');
    } catch (error) {
      console.error('❌ Error initializing LocalNotificationService:', error);
    }
  }

  /**
   * 请求通知权限
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Notification permission not granted');
        return false;
      }

      // Android需要额外配置通知渠道
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F54B3D',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F54B3D',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('notifications', {
          name: 'Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F54B3D',
        });
      }

      console.log('✅ Notification permissions granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * 保存已通知的消息ID
   */
  private async saveNotifiedMessageIds(): Promise<void> {
    try {
      const ids = Array.from(this.notifiedMessageIds);
      await AsyncStorage.setItem(NOTIFIED_MESSAGES_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('❌ Error saving notified message IDs:', error);
    }
  }

  /**
   * 保存已通知的通知ID
   */
  private async saveNotifiedNotificationIds(): Promise<void> {
    try {
      const ids = Array.from(this.notifiedNotificationIds);
      await AsyncStorage.setItem(NOTIFIED_NOTIFICATIONS_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error('❌ Error saving notified notification IDs:', error);
    }
  }

  /**
   * 检查推送通知是否已启用
   */
  async isPushNotificationEnabled(): Promise<boolean> {
    try {
      const saved = await AsyncStorage.getItem(PUSH_NOTIFICATION_KEY);
      // 默认为 true（如果从未设置过）
      return saved === null || saved === 'true';
    } catch (error) {
      console.error('❌ Error checking push notification setting:', error);
      return true; // 默认启用
    }
  }

  /**
   * 显示新消息通知
   */
  async showMessageNotification(data: MessageNotificationData): Promise<void> {
    try {
      await this.initialize();

      // 检查推送通知开关
      const isEnabled = await this.isPushNotificationEnabled();
      if (!isEnabled) {
        console.log('⚠️ Push notifications disabled, skipping message notification');
        return;
      }

      // 检查是否已经通知过（使用conversationId + timestamp作为唯一标识）
      const notificationId = `msg_${data.conversationId}_${Date.now()}`;

      // 显示通知
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            type: 'message',
            conversationId: data.conversationId,
            userId: data.userId,
            username: data.username,
          },
          sound: true,
        },
        trigger: null, // 立即显示
        identifier: notificationId,
      });

      console.log('✅ Message notification shown:', data.title);
    } catch (error) {
      console.error('❌ Error showing message notification:', error);
    }
  }

  /**
   * 显示应用通知（订单、点赞、关注等）
   */
  async showNotification(data: AppNotificationData): Promise<void> {
    try {
      await this.initialize();

      // 检查推送通知开关
      const isEnabled = await this.isPushNotificationEnabled();
      if (!isEnabled) {
        console.log('⚠️ Push notifications disabled, skipping app notification');
        return;
      }

      // 检查是否已经通知过
      if (data.notificationId && this.notifiedNotificationIds.has(data.notificationId)) {
        return;
      }

      // 显示通知
      const notificationId = data.notificationId || `notif_${Date.now()}`;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: {
            type: 'notification',
            notificationType: data.type,
            notificationId: notificationId,
            orderId: data.orderId,
            listingId: data.listingId,
            userId: data.userId,
          },
          sound: true,
        },
        trigger: null, // 立即显示
        identifier: notificationId,
      });

      // 记录已通知
      if (data.notificationId) {
        this.notifiedNotificationIds.add(data.notificationId);
        await this.saveNotifiedNotificationIds();
      }

      console.log('✅ App notification shown:', data.title);
    } catch (error) {
      console.error('❌ Error showing app notification:', error);
    }
  }

  /**
   * 检查消息是否已经通知过
   */
  async isMessageNotified(messageId: string): Promise<boolean> {
    await this.initialize();
    return this.notifiedMessageIds.has(messageId);
  }

  /**
   * 标记消息为已通知
   */
  async markMessageAsNotified(messageId: string): Promise<void> {
    await this.initialize();
    this.notifiedMessageIds.add(messageId);
    await this.saveNotifiedMessageIds();
  }

  /**
   * 检查通知是否已经显示过
   */
  async isNotificationNotified(notificationId: string): Promise<boolean> {
    await this.initialize();
    return this.notifiedNotificationIds.has(notificationId);
  }

  /**
   * 清除所有已通知的记录（用于测试或重置）
   */
  async clearNotifiedHistory(): Promise<void> {
    try {
      this.notifiedMessageIds.clear();
      this.notifiedNotificationIds.clear();
      await AsyncStorage.removeItem(NOTIFIED_MESSAGES_KEY);
      await AsyncStorage.removeItem(NOTIFIED_NOTIFICATIONS_KEY);
      console.log('✅ Cleared notification history');
    } catch (error) {
      console.error('❌ Error clearing notification history:', error);
    }
  }

  /**
   * 取消所有待显示的通知
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling notifications:', error);
    }
  }

  /**
   * 获取通知响应处理器（用于处理通知点击）
   */
  getNotificationResponseHandler() {
    return Notifications.addNotificationResponseReceivedListener;
  }

  /**
   * 获取前台通知处理器（用于处理应用在前台时收到的通知）
   */
  getForegroundNotificationHandler() {
    return Notifications.addNotificationReceivedListener;
  }
}

export const localNotificationService = new LocalNotificationService();

