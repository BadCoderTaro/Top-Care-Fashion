import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
// Keep SafeAreaView inside Header only; avoid double SafeArea padding here
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { SellStackParamList } from "./SellStackNavigator";
import { useFocusEffect, CommonActions } from "@react-navigation/native";
import { listingsService } from "../../../src/services/listingsService";
import type { ListingItem } from "../../../types/shop";

type DraftsScreenProps = {
  navigation: NativeStackNavigationProp<SellStackParamList, "Drafts">;
};

export default function DraftsScreen({ navigation }: DraftsScreenProps) {
  const [drafts, setDrafts] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDrafts = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!silent) {
        setLoading(true);
      }
      try {
        const data = await listingsService.getDrafts();
        setDrafts(data);
      } catch (error) {
        console.error("Failed to load drafts:", error);
        Alert.alert("Error", "Failed to load drafts. Pull to refresh to try again.");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      fetchDrafts();
    }, [fetchDrafts])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDrafts({ silent: true });
    setRefreshing(false);
  }, [fetchDrafts]);

  const handleDeleteDraft = useCallback((draft: ListingItem) => {
    Alert.alert("Delete draft?", "This will permanently remove the draft.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await listingsService.deleteListing(draft.id);
            setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
          } catch (error) {
            console.error("Failed to delete draft:", error);
            Alert.alert("Error", "Could not delete the draft. Please try again.");
          }
        },
      },
    ]);
  }, []);

  const formatTimestamp = (value?: string | null) => {
    if (!value) {
      return "Not yet saved";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header
        title="Drafts"
        showBack
        onBackPress={() => {
          // 重置导航栈到 SellMain（新建模式），避免在编辑模式和草稿箱之间来回跳转
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "SellMain" }],
            })
          );
        }}
        rightAction={
          <TouchableOpacity onPress={() => fetchDrafts()} disabled={loading || refreshing}>
            <Icon
              name="refresh"
              size={22}
              color={loading || refreshing ? "#ccc" : "#111"}
            />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={drafts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#111" />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.emptyText}>No drafts yet</Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const thumbnail = item.images?.[0];
          const summary = item.title || item.description || "Untitled draft";
          const timestamp = formatTimestamp(item.updatedAt ?? item.createdAt);

          return (
            <TouchableOpacity
              style={styles.draftRow}
              onPress={() => {
                // 重置导航栈，确保 SellMain 在栈底，Drafts 在中间，编辑模式在顶部
                // 这样返回时从左边滑入
                navigation.dispatch(
                  CommonActions.reset({
                    index: 2,
                    routes: [
                      { name: "SellMain" },
                      { name: "Drafts" },
                      { name: "SellMain", params: { draftId: item.id } },
                    ],
                  })
                );
              }}
              onLongPress={() => handleDeleteDraft(item)}
              delayLongPress={250}
            >
              {thumbnail ? (
                <Image source={{ uri: thumbnail }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Icon name="image-outline" size={22} color="#aaa" />
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={styles.desc}>
                  {summary}
                </Text>
                <Text style={styles.date}>{timestamp}</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  draftRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  thumb: { width: 50, height: 50, borderRadius: 6, backgroundColor: "#eee" },
  thumbPlaceholder: { justifyContent: "center", alignItems: "center" },
  desc: { fontSize: 15, fontWeight: "500", marginBottom: 2 },
  date: { fontSize: 12, color: "#777" },
  emptyBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16, color: "#999" },
});
