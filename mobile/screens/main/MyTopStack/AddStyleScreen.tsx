import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MyTopStackParamList } from "./index";
import { userService } from "../../../src/services/userService";
import { useAuth } from "../../../contexts/AuthContext";
import { STYLE_OPTIONS } from "./styleOptions";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2; // 两列卡片留边距

type AddStyleNav = NativeStackNavigationProp<MyTopStackParamList, "AddStyle">;
type AddStyleRoute = RouteProp<MyTopStackParamList, "AddStyle">;

export default function AddStyleScreen() {
  const navigation = useNavigation<AddStyleNav>();
  const route = useRoute<AddStyleRoute>();
  const { updateUser } = useAuth();
  const initialSelected = useMemo(
    () => route.params?.selectedStyles ?? [],
    [route.params]
  );
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelect = (name: string) => {
    if (selected.includes(name)) {
      setSelected(selected.filter((n) => n !== name));
    } else if (selected.length < 3) {
      setSelected([...selected, name]);
    }
  };

  const remaining = 3 - selected.length;
  const tipText =
    remaining > 0
      ? `Pick ${remaining} more style${remaining > 1 ? "s" : ""}`
      : "You’re all set";

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const updatedUser = await userService.updateProfile({
        preferredStyles: selected,
      });
      updateUser(updatedUser);
      navigation.goBack();
    } catch (e) {
      console.error("Failed to save styles:", e);
      setError("Failed to save styles. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Styles" showBack />

      <FlatList
        data={STYLE_OPTIONS}
        numColumns={2}
        keyExtractor={(item) => item.name}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <Text style={styles.subtitle}>
            We’ll use this info to recommend items to you
          </Text>
        )}
        ListFooterComponent={() => (
          <Text style={styles.tipText}>{tipText}</Text>
        )}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item.name);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => toggleSelect(item.name)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.image }}
                style={[styles.image, isSelected && { opacity: 0.4 }]}
              />
              {isSelected && (
                <View style={styles.heartOverlay}>
                  <Icon name="heart" size={36} color="#fff" />
                </View>
              )}
              <Text style={styles.styleName}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* 底部 Save 按钮 */}
      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: saving ? "#ccc" : "#000" },
          ]}
          disabled={saving}
          onPress={handleSave}
        >
          {saving ? (
            <View style={styles.saveLoadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.saveLoadingText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    textAlign: "center",
    color: "#444",
    fontSize: 15,
    marginTop: 6,
    marginBottom: 8,
  },
  card: {
    width: CARD_WIDTH,
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f6f6f6",
  },
  image: {
    width: "100%",
    height: CARD_WIDTH * 1.1,
    borderRadius: 10,
  },
  styleName: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
    marginVertical: 8,
    color: "#111",
  },
  heartOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  saveBtn: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  saveLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveLoadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  errorText: {
    color: "#B91C1C",
    marginBottom: 8,
    fontSize: 13,
  },
});
