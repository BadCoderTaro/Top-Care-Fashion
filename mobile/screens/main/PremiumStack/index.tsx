import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MyPremiumScreen from "../MyTopStack/MyPremiumScreen";
import PromotionPlansScreen from "../MyTopStack/PromotionPlansScreen";
import PremiumPlansScreen from "../MyTopStack/PremiumPlansScreen";
import BoostCheckoutScreen from "../MyTopStack/BoostCheckoutScreen";
import type { ListingItem } from "../../../types/shop";
import type { UserBenefitsPayload } from "../../../src/services";

export type PremiumStackParamList = {
  MyPremium: undefined;
  PromotionPlans:
    | {
        selectedListingIds?: string[];
        selectedListings?: ListingItem[];
        benefitsSnapshot?: UserBenefitsPayload["benefits"] | null;
      }
    | undefined;
  PremiumPlans: undefined;
  BoostCheckout: {
    plan: "free" | "premium";
    listings: ListingItem[];
    listingIds: string[];
    benefitsSnapshot?: UserBenefitsPayload["benefits"] | null;
  };
};

const Stack = createNativeStackNavigator<PremiumStackParamList>();

export default function PremiumStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyPremium" component={MyPremiumScreen} />
  <Stack.Screen name="PromotionPlans" component={PromotionPlansScreen} />
  <Stack.Screen name="PremiumPlans" component={PremiumPlansScreen} />
  <Stack.Screen name="BoostCheckout" component={BoostCheckoutScreen} />
    </Stack.Navigator>
  );
}


