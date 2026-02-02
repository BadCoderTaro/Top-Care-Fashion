import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { RootStackParamList } from "../../../App";
import { reviewsService, ordersService } from "../../../src/services";
import { useAuth } from "../../../contexts/AuthContext";

type ReviewSide = {
  name: string;
  avatar: string;
  role: "Buyer" | "Seller";
  rating: number;
  comment: string;
  images?: string[];
};

export default function ViewYourReviewScreen() {
  const {
    params: { orderId },
  } = useRoute<RouteProp<RootStackParamList, "ViewReview">>();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewSide | null>(null);
  const [hasOtherReview, setHasOtherReview] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log("📊 ViewYourReviewScreen - Loading data for order:", orderId);
        console.log("📊 ViewYourReviewScreen - Current user:", user);
        
        const [reviewsData, order] = await Promise.all([
          reviewsService.getOrderReviews(parseInt(orderId, 10)),
          ordersService.getOrder(parseInt(orderId, 10)),
        ]);

        console.log("📊 ViewYourReviewScreen - Reviews data:", reviewsData);
        console.log("📊 ViewYourReviewScreen - Order data:", order);
        console.log("📊 ViewYourReviewScreen - User ID:", user?.id);

        // 🔥 确保所有 ID 都转换为 Number 类型再比较
        const orderBuyerId = Number(order.buyer_id);
        const orderSellerId = Number(order.seller_id);
        
        const buyerReview = reviewsData.find((r: any) => Number(r.reviewer_id) === orderBuyerId);
        const sellerReview = reviewsData.find((r: any) => Number(r.reviewer_id) === orderSellerId);

        console.log("📊 ViewYourReviewScreen - Buyer review:", buyerReview);
        console.log("📊 ViewYourReviewScreen - Seller review:", sellerReview);
        console.log("📊 ViewYourReviewScreen - All reviews:", reviewsData);
        
        // 🔥 详细日志：检查每个评论的 reviewer_id
        reviewsData.forEach((r: any, index: number) => {
          console.log(`📊 Review ${index}:`, {
            reviewer_id: r.reviewer_id,
            reviewer_id_type: typeof r.reviewer_id,
            reviewer_id_number: Number(r.reviewer_id),
            reviewee_id: r.reviewee_id,
            rating: r.rating,
            comment: r.comment?.substring(0, 20)
          });
        });

        // 🔥 根据当前用户ID找到自己的评论
        let myReviewRaw = null;
        let otherReviewRaw = null;

        const currentUserId = Number(user?.id);

        console.log("📊 ViewYourReviewScreen - Current user ID:", currentUserId, typeof currentUserId);
        console.log("📊 ViewYourReviewScreen - Order buyer ID:", orderBuyerId, typeof orderBuyerId);
        console.log("📊 ViewYourReviewScreen - Order seller ID:", orderSellerId, typeof orderSellerId);
        console.log("📊 ViewYourReviewScreen - User is buyer?", currentUserId === orderBuyerId);
        console.log("📊 ViewYourReviewScreen - User is seller?", currentUserId === orderSellerId);

        if (currentUserId === orderBuyerId) {
          // 当前用户是买家
          myReviewRaw = buyerReview;
          otherReviewRaw = sellerReview;
          console.log("📊 ViewYourReviewScreen - User role: BUYER");
        } else if (currentUserId === orderSellerId) {
          // 当前用户是卖家
          myReviewRaw = sellerReview;
          otherReviewRaw = buyerReview;
          console.log("📊 ViewYourReviewScreen - User role: SELLER");
        } else {
          console.log("⚠️ ViewYourReviewScreen - User ID doesn't match buyer or seller");
        }

        console.log("📊 ViewYourReviewScreen - My review:", myReviewRaw);
        console.log("📊 ViewYourReviewScreen - Other review:", otherReviewRaw);

        if (!myReviewRaw) {
          setReview(null);
          return;
        }

        setHasOtherReview(!!otherReviewRaw);
        setReview({
          name: myReviewRaw.reviewer.username,
          avatar: myReviewRaw.reviewer.avatar_url || myReviewRaw.reviewer.avatar_path || "https://via.placeholder.com/44x44",
          role: myReviewRaw.reviewer_id === order.buyer_id ? "Buyer" : "Seller",
          rating: myReviewRaw.rating,
          comment: myReviewRaw.comment || "",
          images: myReviewRaw.images || [],
        });
      } catch (err) {
        console.error("❌ Error loading review:", err);
        setError("Failed to load your review");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderId, user]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Your Review" showBack />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : review ? (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.summary}>
            <Icon name="checkmark-circle" size={18} color="#2d7ef0" />
            <Text style={styles.summaryText}>
              {hasOtherReview
                ? `Order ${orderId}: both reviews are now visible to each other.`
                : `Order ${orderId}: your review is waiting for the other person.`}
            </Text>
          </View>

          <ReviewCard side={review} />

          {!hasOtherReview && (
            <View style={styles.emptyState}>
              <Icon name="chatbubble-ellipses-outline" size={36} color="#c2c7d1" />
              <Text style={styles.emptyTitle}>Their review is still pending</Text>
              <Text style={styles.emptyText}>
                Once the other person submits their review, you'll both be able to see each other's feedback.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="chatbubble-ellipses-outline" size={36} color="#c2c7d1" />
          <Text style={styles.emptyTitle}>No review yet</Text>
          <Text style={styles.emptyText}>
            It looks like you haven't left a review for this order yet.
          </Text>
        </View>
      )}
    </View>
  );
}

function ReviewCard({ side }: { side: ReviewSide }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Image source={{ uri: side.avatar }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{side.name}</Text>
          <Text style={styles.role}>{side.role}</Text>
        </View>
        <View style={styles.ratingRow}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Icon
              key={`${side.name}-star-${index}`}
              name={index < side.rating ? "star" : "star-outline"}
              size={14}
              color="#f5a623"
            />
          ))}
        </View>
      </View>
      <Text style={styles.comment}>{side.comment}</Text>
      {side.images && side.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {side.images.map((imageUrl, index) => (
            <Image
              key={`${side.name}-image-${index}`}
              source={{ uri: imageUrl }}
              style={styles.reviewImage}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
    rowGap: 16,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 10,
    backgroundColor: "#f5f8ff",
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d9e4ff",
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: "#2b3c66",
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e5e5",
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    rowGap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: "#eee",
  },
  name: { fontSize: 16, fontWeight: "700", color: "#111" },
  role: { fontSize: 12, color: "#666", marginTop: 2 },
  ratingRow: {
    flexDirection: "row",
    columnGap: 2,
  },
  comment: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    rowGap: 10,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  emptyText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
  },
});
