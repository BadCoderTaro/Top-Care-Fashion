import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import { useAuth } from "../../../contexts/AuthContext";
import { userService } from "../../../src/services/userService";

type ReviewItem = {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  comment: string;
  time: string;
  date: string;
  type: "buyer" | "seller";
  hasPhoto: boolean;
  photos: string[];
};

const REVIEW_FILTERS = {
  ROLE: ["All", "From Buyer", "From Seller"],
  RATING: ["All", "Positive", "Negative"],
} as const;

const mockReviews: ReviewItem[] = [
  {
    id: "mock-1",
    name: "Alexandra",
    avatar: "https://i.pravatar.cc/100?img=5",
    rating: 5,
    comment: "Fast shipping and the item is exactly as described. Thank you!",
    time: "2 days ago",
    date: new Date().toISOString(),
    type: "buyer",
    hasPhoto: false,
    photos: [],
  },
  {
    id: "mock-2",
    name: "Marcus",
    avatar: "https://i.pravatar.cc/100?img=11",
    rating: 4,
    comment: "Great communication throughout the sale. Would recommend!",
    time: "1 week ago",
    date: new Date().toISOString(),
    type: "seller",
    hasPhoto: true,
    photos: ["https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600"],
  },
];

export default function MyReviewsScreen() {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLatest, setShowLatest] = useState(false);
  const [showWithPhotos, setShowWithPhotos] = useState(false);
  const [reviewRole, setReviewRole] = useState<string>("All");
  const [reviewRating, setReviewRating] = useState<string>("All");
  const [useMockData, setUseMockData] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!user?.username) {
      setError("You need to be signed in to view reviews.");
      setLoading(false);
      setUseMockData(true);
      setReviews([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetched = await userService.getUserReviews(user.username);
      const formatted = fetched.map((review) => {
        const photos = Array.isArray(review.images)
          ? review.images.filter((url: unknown): url is string => typeof url === "string" && url.length > 0)
          : [];

        return {
          id: `r-${review.id ?? Math.random().toString(36).slice(2)}`,
          name:
            review.reviewer?.name ||
            review.reviewer?.username ||
            review.reviewer?.email ||
            "Anonymous",
          avatar:
            review.reviewer?.avatar && typeof review.reviewer.avatar === "string"
              ? review.reviewer.avatar
              : "https://i.pravatar.cc/100?img=1",
          rating: Number(review.rating) || 0,
          comment: review.comment || "",
          time: review.time || "",
          date: review.date || new Date().toISOString(),
          type: (review.type as "buyer" | "seller") || "buyer",
          hasPhoto: photos.length > 0,
          photos,
        } satisfies ReviewItem;
      });
      setUseMockData(false);
      setReviews(formatted);
    } catch (err) {
      console.error("❌ Error loading my reviews:", err);
      setError("Unable to load reviews right now. Showing recent activity instead.");
      setUseMockData(true);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
    }, [fetchReviews]),
  );

  const dataSource = useMockData ? mockReviews : reviews;

  const filteredReviews = useMemo(() => {
    let results = dataSource;

    if (reviewRole === "From Buyer") {
      results = results.filter((review) => review.type === "buyer");
    } else if (reviewRole === "From Seller") {
      results = results.filter((review) => review.type === "seller");
    }

    if (reviewRating === "Positive") {
      results = results.filter((review) => review.rating >= 4);
    } else if (reviewRating === "Negative") {
      results = results.filter((review) => review.rating < 4);
    }

    if (showWithPhotos) {
      results = results.filter((review) => review.hasPhoto);
    }

    if (showLatest) {
      results = [...results].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    return results;
  }, [dataSource, reviewRole, reviewRating, showWithPhotos, showLatest]);

  const activeFilters = useMemo(() => {
    let count = 0;
    if (showLatest) count += 1;
    if (showWithPhotos) count += 1;
    if (reviewRole !== "All") count += 1;
    if (reviewRating !== "All") count += 1;
    return count;
  }, [showLatest, showWithPhotos, reviewRole, reviewRating]);

  const handleClearFilters = useCallback(() => {
    setShowLatest(false);
    setShowWithPhotos(false);
    setReviewRole("All");
    setReviewRating("All");
  }, []);

  const renderReview = useCallback(({ item }: { item: ReviewItem }) => {
    return (
      <View style={styles.reviewCard}>
        <Image source={{ uri: item.avatar }} style={styles.reviewAvatar} />
        <View style={styles.reviewContent}>
          <View style={styles.reviewHeaderRow}>
            <Text style={styles.reviewName}>{item.name}</Text>
            <View style={styles.reviewStars}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Icon
                  key={index}
                  name={index < Math.round(item.rating) ? "star" : "star-outline"}
                  size={16}
                  color={index < Math.round(item.rating) ? "#FFB800" : "#CFCFCF"}
                />
              ))}
            </View>
          </View>
          {item.time ? <Text style={styles.reviewTime}>{item.time}</Text> : null}
          {item.comment ? <Text style={styles.reviewComment}>{item.comment}</Text> : null}
          {item.photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reviewPhotosRow}
            >
              {item.photos.map((photo, index) => (
                <Image
                  key={`${item.id}-photo-${index}`}
                  source={{ uri: photo }}
                  style={styles.reviewPhoto}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      <Header title="Reviews" showBack />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          keyExtractor={(item) => item.id}
          renderItem={renderReview}
          contentContainerStyle={styles.listContentContainer}
          ListHeaderComponent={
            <View style={styles.filtersContainer}>
              <Text style={styles.sectionTitle}>{`${dataSource.length} reviews`}</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersScroll}
              >
                <TouchableOpacity
                  style={[styles.filterChip, showLatest && styles.filterChipActive]}
                  onPress={() => setShowLatest((prev) => !prev)}
                >
                  <Text
                    style={[styles.filterChipText, showLatest && styles.filterChipTextActive]}
                  >
                    Latest
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, showWithPhotos && styles.filterChipActive]}
                  onPress={() => setShowWithPhotos((prev) => !prev)}
                >
                  <Text
                    style={[styles.filterChipText, showWithPhotos && styles.filterChipTextActive]}
                  >
                    With photos
                  </Text>
                </TouchableOpacity>
                {REVIEW_FILTERS.ROLE.slice(1).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.filterChip,
                      reviewRole === role && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setReviewRole((current) => (current === role ? "All" : role))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        reviewRole === role && styles.filterChipTextActive,
                      ]}
                    >
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
                {REVIEW_FILTERS.RATING.slice(1).map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.filterChip,
                      reviewRating === rating && styles.filterChipActive,
                    ]}
                    onPress={() =>
                      setReviewRating((current) =>
                        current === rating ? "All" : rating,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        reviewRating === rating && styles.filterChipTextActive,
                      ]}
                    >
                      {rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {activeFilters > 0 ? (
                <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
                  <Text style={styles.clearButtonText}>{`Reset filters (${activeFilters})`}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyStateWrapper}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No reviews yet</Text>
                <Text style={styles.emptyText}>
                  Reviews you receive from buyers and sellers will show up here.
                </Text>
              </View>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  errorText: {
    fontSize: 13,
    color: "#F54B3D",
  },
  filtersScroll: {
    columnGap: 10,
    paddingRight: 16,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f2f2f2",
  },
  filterChipActive: {
    backgroundColor: "#111",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  clearButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#111",
    marginTop: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  listContentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 0,
  },
  reviewCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 12,
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  reviewContent: {
    flex: 1,
  },
  reviewHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  reviewStars: {
    flexDirection: "row",
    columnGap: 2,
  },
  reviewTime: {
    fontSize: 12,
    color: "#7A7A7A",
    marginTop: 4,
  },
  reviewComment: {
    fontSize: 14,
    color: "#333",
    marginTop: 8,
    lineHeight: 20,
  },
  reviewPhotosRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingRight: 4,
  },
  reviewPhoto: {
    width: 96,
    height: 96,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#f2f2f2",
  },
  emptyStateWrapper: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});
