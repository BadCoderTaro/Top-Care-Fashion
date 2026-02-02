import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { BuyStackParamList } from "./index";
import type { HomeStackParamList } from "../HomeStack";

export default function PurchaseScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BuyStackParamList>>();
  const {
    params: { orderId, total, estimatedDelivery, items },
  } = useRoute<RouteProp<BuyStackParamList, "Purchase">>();

  const reviewTarget = items[0]?.item;

  return (
    <View style={styles.screen}>
      <Header title="Order confirmed" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.checkIcon}>
            <Icon name="checkmark" size={26} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Thanks for your purchase!</Text>
          <Text style={styles.heroSubtitle}>
            Order {orderId} is confirmed. You will receive tracking details once it ships.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <Text style={styles.sectionMeta}>Total paid: ${total.toFixed(2)}</Text>
          <Text style={styles.sectionMeta}>Est. delivery: {estimatedDelivery}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Items</Text>
          {items.map(({ item, quantity }) => (
            <View key={item.id} style={styles.itemRow}>
              <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>Qty {quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>
                ${(item.price * quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            // 回退到 Home：优先通过父导航器导航到 HomeMain 根路由，
            // 如果没有父导航器则在当前栈中回到根（popToTop）。
            const parent = (navigation as any).getParent?.();
            if (parent && typeof parent.reset === "function") {
              // Reset root stack so back gesture won't return to Purchase
              parent.reset({
                index: 0,
                routes: [
                  { name: "Main", params: { screen: "Home", params: { screen: "HomeMain" } } },
                ],
              });
            } else if (parent && typeof parent.navigate === "function") {
              // Fallback: navigate without reset
              parent.navigate("Main", { screen: "Home", params: { screen: "HomeMain" } });
            } else if (typeof navigation.popToTop === "function") {
              navigation.popToTop();
            } else if (typeof navigation.goBack === "function") {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.primaryText}>Continue shopping</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: {
    padding: 16,
    rowGap: 16,
    paddingBottom: 140,
  },
  heroCard: {
    borderRadius: 18,
    backgroundColor: "#111",
    padding: 24,
    alignItems: "center",
    rowGap: 12,
  },
  checkIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#2ecc71",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#f7f7f7",
    textAlign: "center",
    lineHeight: 20,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    padding: 18,
    rowGap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionMeta: {
    fontSize: 14,
    color: "#555",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 14,
    marginTop: 12,
  },
  itemImage: {
    width: 64,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#f4f4f4",
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "600" },
  itemMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  itemPrice: { fontSize: 14, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    columnGap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },

  primaryButton: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  primaryDisabled: {
    backgroundColor: "#bbb",
  },
  primaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
