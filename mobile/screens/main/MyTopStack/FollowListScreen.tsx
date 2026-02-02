import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import Header from "../../../components/Header";
import { DEFAULT_AVATAR } from "../../../constants/assetUrls";
import { userService, type FollowListEntry } from "../../../src/services/userService";
import { ApiError } from "../../../src/config/api";

type FollowListRouteParams = {
  FollowList: { type: "followers" | "following"; username?: string };
};

const DEFAULT_EMPTY_MESSAGE = {
  followers: "You don't have any followers yet.",
  following: "You're not following anyone yet.",
} as const;

export default function FollowListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<FollowListRouteParams, "FollowList">>();
  const listType = route.params?.type ?? "followers";
  const targetUsername = route.params?.username ?? null;

  const [entries, setEntries] = useState<FollowListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowList = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const data = targetUsername
          ? await userService.getUserFollowList(targetUsername, listType)
          : await userService.getMyFollowList(listType);
        setEntries(data);
      } catch (err) {
        console.error("❌ Failed to load follow list", err);
        if (err instanceof ApiError && err.status === 403) {
          const message = targetUsername
            ? listType === "followers"
              ? "Only followers can view this list."
              : "Only followers can view who this user follows."
            : "Your privacy settings prevent displaying this list.";
          setError(err.response?.error ?? message);
        } else {
          setError("Unable to load list. Please try again.");
        }
      } finally {
        if (mode === "initial") {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [listType, targetUsername],
  );

  useFocusEffect(
    useCallback(() => {
      fetchFollowList("initial");
    }, [fetchFollowList]),
  );

  const handleRefresh = useCallback(() => {
    fetchFollowList("refresh");
  }, [fetchFollowList]);

  const handlePressUser = useCallback(
    (username: string | null) => {
      if (!username) {
        return;
      }

      const currentRoutes = navigation.getState?.()?.routeNames ?? [];
      const canPushUserProfile = currentRoutes.includes("UserProfile");

      if (targetUsername && canPushUserProfile) {
        navigation.push("UserProfile", { username });
        return;
      }

      const parentNavigator = navigation.getParent();
      const rootNavigator = parentNavigator?.getParent?.() ?? parentNavigator;

      if (rootNavigator) {
        rootNavigator.navigate("Buy", {
          screen: "UserProfile",
          params: { username },
        });
      }
    },
    [navigation, targetUsername],
  );

  const renderItem = useCallback(
    ({ item }: { item: FollowListEntry }) => {
      const avatarSource = item.avatarUrl && item.avatarUrl.startsWith("http")
        ? { uri: item.avatarUrl }
        : DEFAULT_AVATAR;

      return (
        <TouchableOpacity style={styles.card} onPress={() => handlePressUser(item.username)}>
          <Image source={avatarSource} style={styles.avatar} />
          <View style={styles.cardContent}>
            <Text style={styles.username}>{item.username || "Unknown"}</Text>
            {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{item.followersCount} followers</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText}>{item.followingCount} following</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handlePressUser],
  );

  if (loading) {
    return (
      <View style={styles.fullScreen}>
  <Header title={listType === "followers" ? "Followers" : "Following"} showBack />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      </View>
    );
  }

  const title = listType === "followers" ? "Followers" : "Following";

  const emptyMessage = targetUsername
    ? listType === "followers"
      ? `${targetUsername} doesn't have any followers yet.`
      : `${targetUsername} isn't following anyone yet.`
    : DEFAULT_EMPTY_MESSAGE[listType];

  return (
    <View style={styles.fullScreen}>
      <Header title={title} showBack />
      {error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchFollowList("initial")}> 
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={entries.length === 0 ? styles.emptyListContainer : styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <Text style={styles.stateTitle}>{listType === "followers" ? "No followers yet" : "No following yet"}</Text>
              <Text style={styles.stateText}>{emptyMessage}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyListContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e3e3e6",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f4f4f4",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
    rowGap: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  bio: {
    fontSize: 13,
    color: "#555",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#777",
    textTransform: "uppercase",
  },
  metaDot: {
    fontSize: 12,
    color: "#777",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  stateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#111",
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
