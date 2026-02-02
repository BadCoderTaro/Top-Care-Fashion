import { AppState, AppStateStatus } from 'react-native';
import { messagesService } from './messagesService';
import { notificationService, type Notification } from './notificationService';
import { localNotificationService } from './localNotificationService';

// 轮询间隔配置（毫秒）
const POLLING_INTERVALS = {
  ACTIVE: 30000,      // 应用活跃时：30秒
  BACKGROUND: 60000,  // 应用后台时：60秒
  INACTIVE: 120000,   // 应用不活跃时：2分钟
};

// 存储上次检查的数据
interface LastCheckData {
  conversations: {
    [conversationId: string]: {
      lastMessageId: string;
      lastMessageTime: number;
    };
  };
  notifications: {
    lastNotificationId: string;
    lastCheckTime: number;
  };
}

type ConversationUpdateCallback = () => void;

class PollingService {
  private intervalId: NodeJS.Timeout | null = null;
  private appState: AppStateStatus = 'active';
  private isRunning = false;
  private appStateSubscription: any = null; // AppState订阅
  private lastCheckData: LastCheckData = {
    conversations: {},
    notifications: {
      lastNotificationId: '',
      lastCheckTime: 0,
    },
  };
  private currentConversationId: string | null = null; // 当前打开的对话ID
  private conversationUpdateCallbacks: Set<ConversationUpdateCallback> = new Set(); // UI刷新回调

  /**
   * 设置当前打开的对话ID（用于避免在当前对话中显示通知）
   */
  setCurrentConversationId(conversationId: string | null): void {
    this.currentConversationId = conversationId;
  }

  /**
   * 订阅对话更新事件（用于UI自动刷新）
   */
  onConversationUpdate(callback: ConversationUpdateCallback): () => void {
    this.conversationUpdateCallbacks.add(callback);
    // 返回取消订阅函数
    return () => {
      this.conversationUpdateCallbacks.delete(callback);
    };
  }

  /**
   * 通知所有订阅者对话已更新
   */
  private notifyConversationUpdate(): void {
    this.conversationUpdateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ Error in conversation update callback:', error);
      }
    });
  }

  /**
   * 启动轮询服务
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ PollingService is already running');
      return;
    }

    console.log('🚀 Starting PollingService...');
    this.isRunning = true;

    // 获取当前应用状态
    this.appState = AppState.currentState;

    // 监听应用状态变化（新API返回订阅对象）
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // 初始化本地通知服务
    localNotificationService.initialize();
    localNotificationService.requestPermissions();

    // 立即执行一次检查
    this.checkForUpdates();

    // 开始轮询
    this.startPolling();
  }

  /**
   * 停止轮询服务
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping PollingService...');
    this.isRunning = false;

    // 清除定时器
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // 移除应用状态监听（新API使用subscription.remove()）
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  /**
   * 处理应用状态变化
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      console.log('📱 App has come to the foreground');
      // 应用回到前台时立即检查
      this.checkForUpdates();
    }

    this.appState = nextAppState;

    // 重新启动轮询以应用新的间隔
    if (this.isRunning) {
      this.startPolling();
    }
  };

  /**
   * 启动轮询
   */
  private startPolling(): void {
    // 清除现有定时器
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // 根据应用状态选择轮询间隔
    const interval = this.getPollingInterval();

    // 设置新的定时器
    this.intervalId = setInterval(() => {
      if (this.isRunning) {
        this.checkForUpdates();
      }
    }, interval);

    console.log(`🔄 Polling started with interval: ${interval}ms (${this.appState})`);
  }

  /**
   * 获取轮询间隔
   */
  private getPollingInterval(): number {
    switch (this.appState) {
      case 'active':
        return POLLING_INTERVALS.ACTIVE;
      case 'background':
        return POLLING_INTERVALS.BACKGROUND;
      case 'inactive':
      default:
        return POLLING_INTERVALS.INACTIVE;
    }
  }

  /**
   * 检查更新（新消息和新通知）
   */
  private async checkForUpdates(): Promise<void> {
    if (!this.isRunning) {
      console.log('⏭️ PollingService not running, skipping check');
      return;
    }

    try {
      // console.log('🔍 Checking for updates...');

      // 并行检查新消息和新通知
      await Promise.all([
        this.checkForNewMessages(),
        this.checkForNewNotifications(),
      ]);
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
    }
  }

  /**
   * 检查新消息（使用轻量级API）
   */
  private async checkForNewMessages(): Promise<void> {
    // 🔥 再次检查服务是否仍在运行
    if (!this.isRunning) {
      console.log('⏭️ PollingService stopped, skipping message check');
      return;
    }

    try {
      // 🔥 使用轻量级API一次性获取所有对话的最后消息信息（包含发送者信息和未读状态）
      const conversations = await messagesService.checkConversationsForNewMessages();

      for (const conv of conversations) {
        // 🔥 在每次循环中检查服务状态
        if (!this.isRunning) {
          console.log('⏭️ PollingService stopped during message check loop');
          return;
        }

        // 跳过当前打开的对话（避免重复通知）
        if (conv.conversationId === this.currentConversationId) {
          continue;
        }

        // 跳过自己发送的消息（不需要通知）
        if (conv.isFromMe) {
          // 更新记录但不通知
          this.lastCheckData.conversations[conv.conversationId] = {
            lastMessageId: conv.lastMessageId,
            lastMessageTime: new Date(conv.lastMessageTime).getTime(),
          };
          continue;
        }

        const lastCheck = this.lastCheckData.conversations[conv.conversationId];

        // 如果是第一次检查，记录当前状态但不通知
        if (!lastCheck) {
          this.lastCheckData.conversations[conv.conversationId] = {
            lastMessageId: conv.lastMessageId,
            lastMessageTime: new Date(conv.lastMessageTime).getTime(),
          };
          continue;
        }

        // 检查是否有新消息
        if (conv.lastMessageId !== lastCheck.lastMessageId) {
          // 更新记录
          this.lastCheckData.conversations[conv.conversationId] = {
            lastMessageId: conv.lastMessageId,
            lastMessageTime: new Date(conv.lastMessageTime).getTime(),
          };

          // 🔥 通知UI刷新（无论是否未读，只要有新消息就刷新）
          this.notifyConversationUpdate();

          // 检查对话是否有未读消息（仅在有新消息且未读时才获取完整消息详情并通知）
          if (conv.isUnread) {
            // 获取对话的最新消息详情（仅在有新消息且未读时才调用）
            try {
              const conversationDetail = await messagesService.getMessages(conv.conversationId);
              const messages = conversationDetail.messages || [];
              
              if (messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                
                // 显示通知
                await localNotificationService.showMessageNotification({
                  title: conv.senderUsername,
                  body: lastMessage.text || '新消息',
                  conversationId: conv.conversationId,
                  userId: lastMessage.senderInfo?.id?.toString(),
                  username: lastMessage.senderInfo?.username || conv.senderUsername,
                });
              }
            } catch (error) {
              // 🔥 只在服务运行时记录错误
              if (this.isRunning) {
                console.error(`❌ Error fetching messages for conversation ${conv.conversationId}:`, error);
              }
            }
          }
        }
      }
    } catch (error) {
      // 🔥 只在服务运行时记录错误
      if (this.isRunning) {
        console.error('❌ Error checking for new messages:', error);
      }
    }
  }

  // 🔥 已移除：checkConversationForNewMessages 方法
  // 现在使用轻量级API一次性检查所有对话，不再需要单独检查每个对话

  /**
   * 检查新通知
   */
  private async checkForNewNotifications(): Promise<void> {
    // 🔥 检查服务状态
    if (!this.isRunning) {
      console.log('⏭️ PollingService stopped, skipping notification check');
      return;
    }

    try {
      const notifications = await notificationService.getNotifications();
      const unreadNotifications = notifications.filter(n => !n.isRead);

      if (unreadNotifications.length === 0) {
        return;
      }

      // 获取最新的未读通知
      const latestNotification = unreadNotifications[0];

      // 检查是否已经通知过
      const lastCheck = this.lastCheckData.notifications;
      if (latestNotification.id === lastCheck.lastNotificationId) {
        return; // 已经通知过
      }

      // 显示通知
      await localNotificationService.showNotification({
        title: latestNotification.title,
        body: latestNotification.message || '',
        type: latestNotification.type,
        notificationId: latestNotification.id,
        orderId: latestNotification.orderId,
        listingId: latestNotification.listingId,
        userId: latestNotification.userId,
      });

      // 更新记录
      this.lastCheckData.notifications = {
        lastNotificationId: latestNotification.id,
        lastCheckTime: Date.now(),
      };
    } catch (error) {
      // 🔥 只在服务运行时记录错误
      if (this.isRunning) {
        console.error('❌ Error checking for new notifications:', error);
      }
    }
  }

  /**
   * 手动触发检查（用于测试或立即刷新）
   */
  async triggerCheck(): Promise<void> {
    await this.checkForUpdates();
  }

  /**
   * 重置检查数据（用于登出或重置状态）
   */
  reset(): void {
    this.lastCheckData = {
      conversations: {},
      notifications: {
        lastNotificationId: '',
        lastCheckTime: 0,
      },
    };
    this.currentConversationId = null;
    this.conversationUpdateCallbacks.clear();
    console.log('✅ PollingService data reset');
  }
}

export const pollingService = new PollingService();

