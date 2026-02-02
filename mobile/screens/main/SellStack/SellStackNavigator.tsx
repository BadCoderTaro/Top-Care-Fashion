// SellStackNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SellScreen from "./SellScreen";
import DraftsScreen from "./DraftsScreen";

export type SellStackParamList = {
  SellMain: { draftId?: string } | undefined; // 发布页面
  Drafts: undefined;                          // 草稿箱页面
};

const Stack = createNativeStackNavigator<SellStackParamList>();

export default function SellStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="SellMain"
        component={SellScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Drafts" component={DraftsScreen} />
    </Stack.Navigator>
  );
}
