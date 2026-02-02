// App.tsx
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import React from 'react';
import { Text, LogBox } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute, type NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 🔥 临时忽略 LogBox 渲染错误（由于日志包含特殊字符导致）
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component',
]);

import { AuthProvider } from './contexts/AuthContext'; // <-- make sure this path is correct
import { navigationRef } from './src/services/navigationService';
import NotificationHandler from './components/NotificationHandler';

// Auth / entry screens
import SplashScreen from './screens/auth/SplashScreen';
import LandingScreen from './screens/auth/LandingScreen';
import LoginScreen from './screens/auth/LoginScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import OnboardingPreferenceScreen from './screens/auth/OnboardingPreferenceScreen';

// Main stacks
import HomeStackNavigator from './screens/main/HomeStack';
import DiscoverStackNavigator from './screens/main/DiscoverStack';
import SellStackNavigator from './screens/main/SellStack/SellStackNavigator';
import InboxStackNavigator from './screens/main/InboxStack/InboxStackNavigator';
import MyTopStackNavigator from './screens/main/MyTopStack';
import PremiumStackNavigator, { type PremiumStackParamList } from './screens/main/PremiumStack';
import BuyStackNavigator from './screens/main/BuyStack';

// Standalone screens
import ReviewScreen from './screens/main/MyTopStack/ReviewScreen';
import MutualReviewScreen from './screens/main/InboxStack/MutualReviewScreen';
import ViewYourReviewScreen from './screens/main/InboxStack/ViewYourReviewScreen';
import NotificationScreen from "./screens/main/InboxStack/NotificationScreen";
import ChatScreen from './screens/main/InboxStack/ChatScreen';

// UI
import Icon from './components/Icon';

enableScreens();

export type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OnboardingPreference: undefined;
  Main: undefined;
  Premium: NavigatorScreenParams<PremiumStackParamList> | undefined;
  Buy: undefined;
  Review: { orderId: string; reviewType?: "buyer" | "seller" };
  ViewReview: { orderId: string };
  Notification: undefined;
  MutualReview: { orderId: string };
  // Standalone chat screen (opened outside the Inbox tab). Params are optional.
  ChatStandalone?: {
    sender?: string;
    kind?: string;
    order?: any;
    conversationId?: string | null;
    autoSendPaidMessage?: boolean;
  } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const HIDDEN_TAB_SCREENS: string[] = [];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff' },
        tabBarLabel: ({ focused, color }) => (
          <Text
            style={{
              fontSize: 12,
              color,
              fontWeight: focused ? '700' : '500',
              letterSpacing: -0.25,
            }}
          >
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ focused, color }) => {
          switch (route.name) {
            case 'Home':
              return <Icon name={focused ? 'home' : 'home-outline'} size={22} color={color} />;
            case 'Discover':
              return <Icon name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />;
            case 'Sell':
              return <Icon name={focused ? 'add-circle' : 'add-circle-outline'} size={22} color={color} />;
            case 'Inbox':
              return <Icon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={22} color={color} />;
            case 'My TOP':
              return <Icon name={focused ? 'person' : 'person-outline'} size={22} color={color} />;
            default:
              return null;
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const now = Date.now();
            if (navigation.isFocused && navigation.isFocused()) {
              const currentRoute = getFocusedRouteNameFromRoute(route);
              const state = (route as any).state;
              const stackRoutes = state?.routes || [];

              // 如果在子页面（stack 中有多个路由）
              if (currentRoute && currentRoute !== "HomeMain" && stackRoutes.length > 1) {
                // 阻止默认的 tab 切换
                e.preventDefault();

                // 弹出到栈顶（HomeMain）
                const target = state.key;
                navigation.dispatch({
                  type: 'POP_TO_TOP',
                  target,
                });
              } else {
                // 在 HomeMain 时，传递 tabPressTS 交给屏幕判断是刷新还是滚动
                navigation.navigate("Home", {
                  screen: "HomeMain",
                  params: { tabPressTS: now },
                });
              }
            }
          },
        })}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const shouldHide = routeName ? HIDDEN_TAB_SCREENS.includes(routeName) : false;
          return {
            tabBarStyle: shouldHide ? { display: 'none' } : { backgroundColor: '#fff' },
          };
        }}
      />
      <Tab.Screen name="Discover" component={DiscoverStackNavigator} />
      <Tab.Screen name="Sell" component={SellStackNavigator} />
      <Tab.Screen name="Inbox" component={InboxStackNavigator} />
      <Tab.Screen
        name="My TOP"
        component={MyTopStackNavigator}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const now = Date.now();
            if (navigation.isFocused && navigation.isFocused()) {
              const currentRoute = getFocusedRouteNameFromRoute(route);
              const state = (route as any).state;
              const stackRoutes = state?.routes || [];

              // 如果在子页面（stack 中有多个路由）
              if (currentRoute && currentRoute !== "MyTopMain" && stackRoutes.length > 1) {
                // 阻止默认的 tab 切换
                e.preventDefault();

                // 弹出到栈顶（MyTopMain）
                const target = state.key;
                navigation.dispatch({
                  type: 'POP_TO_TOP',
                  target,
                });
              } else {
                // 在 MyTopMain 时，传递 tabPressTS
                navigation.navigate("My TOP", {
                  screen: "MyTopMain",
                  params: { tabPressTS: now },
                });
              }
            }
          },
        })}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route);
          const shouldHide = routeName ? HIDDEN_TAB_SCREENS.includes(routeName) : false;
          return {
            tabBarStyle: shouldHide ? { display: 'none' } : undefined,
          };
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  return (
    <NavigationContainer ref={navigationRef}>
      <NotificationHandler />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen
          name="OnboardingPreference"
          component={OnboardingPreferenceScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Review" component={ReviewScreen} />
        <Stack.Screen name="MutualReview" component={MutualReviewScreen} />
        <Stack.Screen name="ViewReview" component={ViewYourReviewScreen} />
        <Stack.Screen name="Notification" component={NotificationScreen} />
        <Stack.Screen
          name="ChatStandalone"
          component={ChatScreen}
          options={{ headerShown: false }}
        />
        {/* Premium stack lives on root; entering it hides the bottom tab by design */}
        <Stack.Screen name="Premium" component={PremiumStackNavigator} />
        {/* Buy stack mirrors Premium: lives on root to avoid tab flicker */}
        <Stack.Screen name="Buy" component={BuyStackNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
