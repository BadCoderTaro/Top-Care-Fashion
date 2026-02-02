import React from "react";
import { View, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import InboxScreen from "./InboxScreen";
import ChatScreen from "./ChatScreen";
import ViewYourReviewScreen from "./ViewYourReviewScreen";
import MutualReviewScreen from "./MutualReviewScreen";
import Header from "../../../components/Header";

export type InboxStackParamList = {
  InboxMain: undefined;
  Chat: { sender: string; kind?: string; order?: any };
  LeaveReview: { orderId: string };
  ViewYourReview: { orderId: number; reviewId?: number };
  MutualReview: { orderId: number };
};

const Stack = createNativeStackNavigator<InboxStackParamList>();

function LeaveReviewScreen({ route }: any) {
  const { orderId } = route.params || {};
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Leave a review" showBack />
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 8 }}>Review for order #{orderId}</Text>
        <Text style={{ color: "#666" }}>(TODO) Put your rating form here.</Text>
      </View>
    </View>
  );
}

export default function InboxStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="InboxMain"
        component={InboxScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="LeaveReview" component={LeaveReviewScreen} />
      <Stack.Screen name="ViewYourReview" component={ViewYourReviewScreen} />
      <Stack.Screen name="MutualReview" component={MutualReviewScreen} />
    </Stack.Navigator>
  );
}
