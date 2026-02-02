import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "./HomeScreen";
// Home stack only renders Home; buy flow is a root-level stack

export type HomeStackParamList = {
  HomeMain: { refreshTS?: number; scrollToTopTS?: number; tabPressTS?: number } | undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
