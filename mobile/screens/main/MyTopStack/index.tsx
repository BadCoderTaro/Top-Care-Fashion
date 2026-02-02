import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MyTopScreen from "./MyTopScreen";
import SettingScreen from "./SettingScreen";
import EditProfileScreen from "./EditProfileScreen";
import OrderDetailScreen from "./OrderDetailScreen";
import SecurityScreen from "./SecurityScreen";
import ChangePasswordScreen from "./ChangePasswordScreen";
import NotificationsScreen from "./NotificationsScreen";
import PrivacyScreen from "./PrivacyScreen";
import HelpSupportScreen from "./HelpSupportScreen";
import FlagScreen from "./FlagScreen";
import FeedbackScreen from "./FeedbackScreen";
import ActiveListingDetailScreen from "./ActiveListingDetailScreen";
import ManageListingScreen from "./ManageListingScreen";
import EditListingScreen from "./EditListingScreen";
import PromotionPlansScreen from "./PromotionPlansScreen";
import MyBoostListingScreen from "./MyBoostListingScreen";
import BoostedListingScreen from "./BoostedListingScreen";
import MyPreferenceScreen from "./MyPreferenceScreen";
import AddSizeScreen from "./AddSizeScreen";
import AddStyleScreen from "./AddStyleScreen";
import EditBrandScreen from "./EditBrandScreen";
import ManagePaymentsScreen from "./ManagePaymentsScreen";
import ConfirmSellScreen from "./ConfirmSellScreen";
import type { ListingItem } from "../../../types/shop";
import type { UserBenefitsPayload } from "../../../src/services";
import type { CreateListingRequest } from "../../../src/services/listingsService";
import FollowListScreen from "./FollowListScreen";
import MyReviewsScreen from "./MyReviewsScreen";
import ReviewScreen from "./ReviewScreen";

export type PreferenceSizes = {
  shoe?: string;
  top?: string;
  bottom?: string;
};

export type MyTopStackParamList = {
  MyTopMain:
    | {
        initialTab?: "Shop" | "Sold" | "Purchases" | "Likes";
        refreshTS?: number;
        scrollToTopTS?: number;
        tabPressTS?: number;
        brandPickerRequest?: {
          ts: number;
          availableBrands?: string[];
          selectedBrands?: string[];
          source?: "discover" | "mytop";
        };
      }
    | undefined;
  EditProfile: undefined;
  Settings: undefined;
  Security: undefined;
  ChangePassword: undefined;
  Notifications: undefined;
  Privacy: undefined;
  HelpSupport: undefined;
  Flag: undefined;
  Feedback: undefined;
  OrderDetail: { id: string; source: "purchase" | "sold"; conversationId?: string };
  Review: { orderId: string };
  ActiveListingDetail: { listingId: string };
  ManageListing: { listingId: string };
  EditListing: { listingId: string };
  PromotionPlans:
    | {
        selectedListingIds?: string[];
        selectedListings?: ListingItem[];
        benefitsSnapshot?: UserBenefitsPayload["benefits"] | null;
      }
    | undefined;
  MyBoostListings: undefined;
  BoostedListing: undefined;
  ConfirmSell:
    | {
        mode: "markSold";
        listingId: string;
        listingSnapshot?: ListingItem;
      }
    | {
        mode: "create";
        draft: CreateListingRequest;
        benefitsSnapshot?: UserBenefitsPayload["benefits"] | null;
      }
    | {
        mode: "update";
        listingId: string;
        draft: Partial<CreateListingRequest>;
        listingSnapshot?: ListingItem;
        benefitsSnapshot?: UserBenefitsPayload["benefits"] | null;
      };
  MyPreference:
    | {
        selectedStyles?: string[];
        selectedBrands?: string[];
        selectedSizes?: PreferenceSizes;
      }
    | undefined;
  AddSize:
    | {
        selectedSizes?: PreferenceSizes;
      }
    | undefined;
  AddStyle:
    | {
        selectedStyles?: string[];
      }
    | undefined;
  EditBrand:
    | {
        selectedBrands?: string[];
        availableBrands?: string[];
        source?: "discover" | "mytop";
      }
    | undefined;
  ManagePayments: undefined;
  FollowList: { type: "followers" | "following"; username?: string };
  MyReviews: undefined;
};

const Stack = createNativeStackNavigator<MyTopStackParamList>();

export default function MyTopStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true, // ✅ 默认启用手势返回
      }}
    >
      <Stack.Screen
        name="MyTopMain"
        component={MyTopScreen}
        options={{ gestureEnabled: false }} // ✅ 主页面禁用手势，防止意外退出
      />
      <Stack.Screen name="Settings" component={SettingScreen} /> 
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        // cast to any because NativeStackNavigationOptions doesn't include tabBarStyle
        options={{ 
          tabBarStyle: { display: "none" },
          // ✅ 确保 OrderDetail 在返回时被卸载，避免来回跳转
          detachInactiveScreens: true 
        } as any}
      />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Flag" component={FlagScreen} />
      <Stack.Screen name="ActiveListingDetail" component={ActiveListingDetailScreen} />
      <Stack.Screen name="ManageListing" component={ManageListingScreen} />
      <Stack.Screen name="EditListing" component={EditListingScreen} />
    <Stack.Screen name="PromotionPlans" component={PromotionPlansScreen} />
    <Stack.Screen name="MyBoostListings" component={MyBoostListingScreen} />
    <Stack.Screen name="BoostedListing" component={BoostedListingScreen} />
    <Stack.Screen name="ConfirmSell" component={ConfirmSellScreen} />
      <Stack.Screen name="MyPreference" component={MyPreferenceScreen} />
      <Stack.Screen name="AddSize" component={AddSizeScreen} />
      <Stack.Screen name="AddStyle" component={AddStyleScreen} />
      <Stack.Screen name="EditBrand" component={EditBrandScreen} />
      <Stack.Screen name="ManagePayments" component={ManagePaymentsScreen} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
      <Stack.Screen name="MyReviews" component={MyReviewsScreen} />
      <Stack.Screen name="Review" component={ReviewScreen} />
    </Stack.Navigator>
  );
}

