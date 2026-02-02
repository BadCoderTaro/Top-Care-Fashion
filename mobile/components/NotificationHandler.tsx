import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { localNotificationService, pollingService } from '../src/services';
import { useAuth } from '../contexts/AuthContext';

/**
 * 通知处理器组件
 * 负责：
 * 1. 初始化通知服务
 * 2. 处理通知点击事件
 * 3. 处理前台通知
 * 4. 管理轮询服务
 */
export default function NotificationHandler() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<any>>();

  // 初始化通知服务和权限
  useEffect(() => {
    async function initializeNotifications() {
      try {
        await localNotificationService.initialize();
        await localNotificationService.requestPermissions();
        console.log('✅ NotificationHandler initialized');
      } catch (error) {
        console.error('❌ Error initializing NotificationHandler:', error);
      }
    }

    initializeNotifications();
  }, []);

  // 处理通知点击事件
  useEffect(() => {
    const subscription = localNotificationService
      .getNotificationResponseHandler()((response: Notifications.NotificationResponse) => {
        const { notification } = response;
        const data = notification.request.content.data;

        console.log('📱 Notification clicked:', data);

        try {
          // 根据通知类型进行导航
          if (data.type === 'message' && data.conversationId) {
            // ✅ 使用 ChatStandalone 避免嵌套导航问题
            navigation.navigate('ChatStandalone', {
              conversationId: data.conversationId,
              sender: data.username || 'User',
              kind: 'order',
            });
          } else if (data.type === 'notification') {
            // 导航到通知页面
            navigation.navigate('Notification');
          }
        } catch (error) {
          console.error('❌ Error handling notification click:', error);
        }
      });

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  // 处理应用在前台时收到的通知
  useEffect(() => {
    const subscription = localNotificationService
      .getForegroundNotificationHandler()((notification: Notifications.Notification) => {
        console.log('📱 Foreground notification received:', notification.request.content.data);
        // 应用在前台时，通知会自动显示，这里可以添加额外的处理逻辑
      });

    return () => {
      subscription.remove();
    };
  }, []);

  // 管理轮询服务
  useEffect(() => {
    if (user) {
      // 用户登录后启动轮询
      console.log('🚀 Starting polling service for user:', user.id);
      pollingService.start();
    } else {
      // 用户登出后停止轮询
      console.log('🛑 Stopping polling service');
      pollingService.stop();
      pollingService.reset();
    }

    return () => {
      // 组件卸载时停止轮询
      pollingService.stop();
    };
  }, [user]);

  return null; // 此组件不渲染任何UI
}

