import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import DiscoverMainScreen from "./DiscoverMainScreen";
import DiscoverCategoryScreen from "./DiscoverCategoryScreen";

export type DiscoverStackParamList = {
  DiscoverMain: { refreshTS?: number; focusSearch?: number } | undefined;
  DiscoverCategory: { gender: "men" | "women" | "unisex" };
};

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export default function DiscoverStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="DiscoverMain"
        component={DiscoverMainScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="DiscoverCategory" component={DiscoverCategoryScreen} />
    </Stack.Navigator>
  );
}
