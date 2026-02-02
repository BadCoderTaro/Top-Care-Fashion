import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Header from "../../../components/Header";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "../../../App";
import { Ionicons } from "@expo/vector-icons";
import { reviewsService, ordersService, listingsService } from "../../../src/services";
import { useAuth } from "../../../contexts/AuthContext";
import Avatar from "../../../components/Avatar";

export default function ReviewScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "Review">>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { orderId, reviewType } = route.params;

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [reviewee, setReviewee] = useState<any>(null);
  const [photos, setPhotos] = useState<{ id: string; uri: string; uploadedUrl?: string }[]>([]);

  // 🔥 加载订单和用户信息
  useEffect(() => {
    const loadOrderData = async () => {
      if (!user?.id) {
        Alert.alert("Error", "Please log in to leave a review");
        navigation.goBack();
        return;
      }

      try {
        setLoading(true);
        const orderData = await ordersService.getOrder(parseInt(orderId));
        setOrder(orderData);
        
        // 🔥 确定被评论的用户（买家评论卖家，卖家评论买家）
        const currentUserId = user.id;
        const revieweeData = orderData.buyer_id === currentUserId ? orderData.seller : orderData.buyer;
        setReviewee(revieweeData);
        
        console.log('🔍 Review Screen - Current user ID:', currentUserId);
        console.log('🔍 Review Screen - Order buyer ID:', orderData.buyer_id);
        console.log('🔍 Review Screen - Order seller ID:', orderData.seller_id);
        console.log('🔍 Review Screen - Reviewee:', revieweeData);
      } catch (error) {
        console.error("Error loading order data:", error);
        Alert.alert("Error", "Failed to load order data");
      } finally {
        setLoading(false);
      }
    };

    loadOrderData();
  }, [orderId, user]);

  // 🔥 添加图片
  const handleAddPhoto = async () => {
    if (photos.length >= 9) {
      Alert.alert("Maximum Images", "You can only upload up to 9 images.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const newPhotos = result.assets.map((asset, index) => ({
        id: `${Date.now()}-${index}`,
        uri: asset.uri,
      }));

      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (error) {
      console.error("Error selecting photo:", error);
      Alert.alert("Error", "Failed to select photo. Please try again.");
    }
  };

  // 🔥 删除图片
  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // 🔥 上传所有图片
  const uploadAllPhotos = async () => {
    const uploadedUrls: string[] = [];
    
    for (const photo of photos) {
      if (!photo.uploadedUrl) {
        try {
          console.log('📸 Uploading photo:', photo.uri);
          const remoteUrl = await listingsService.uploadListingImage(photo.uri);
          uploadedUrls.push(remoteUrl);
          console.log('✅ Photo uploaded:', remoteUrl);
        } catch (error) {
          console.error('❌ Error uploading photo:', error);
          throw new Error('Failed to upload photos');
        }
      } else {
        uploadedUrls.push(photo.uploadedUrl);
      }
    }

    return uploadedUrls;
  };

  // 🔥 提交评论
  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    try {
      setSubmitting(true);
      console.log('🔍 Submitting review for order:', orderId);
      console.log('🔍 Rating:', rating);
      console.log('🔍 Comment:', review);
      
      // 🔥 上传所有图片
      let imageUrls: string[] = [];
      if (photos.length > 0) {
        console.log('📸 Uploading photos...');
        imageUrls = await uploadAllPhotos();
        console.log('✅ All photos uploaded:', imageUrls);
      }

      const result = await reviewsService.createReview(parseInt(orderId), {
        rating,
        comment: review.trim() || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined
      });
      
      console.log('✅ Review submitted successfully:', result);
      
      Alert.alert("Success", "Review submitted successfully!", [
        { text: "OK", onPress: () => {
          navigation.goBack();
        }}
      ]);
    } catch (error) {
      console.error("Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Leave Review" showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!order || !reviewee) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Leave Review" showBack />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load order data</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header (内部已经有 SafeArea) */}
      <Header title="Leave Review" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* 用户信息 */}
          <View style={styles.userSection}>
            <Avatar
              source={{
                uri:
                  reviewee.avatar_url ||
                  reviewee.avatar_path ||
                  "https://via.placeholder.com/60x60",
              }}
              style={styles.avatar}
              isPremium={reviewee?.isPremium}
            />
            <Text style={styles.userName}>{reviewee.username}</Text>
          </View>

          {/* 星星评分 */}
          <View style={styles.ratingSection}>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} onPress={() => setRating(i)}>
                  <Ionicons
                    name={i <= rating ? "star" : "star-outline"}
                    size={32}
                    color={i <= rating ? "#FFD700" : "#ccc"}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.subText}>
              Tap on a star to rate your experience with this user
            </Text>
          </View>

          {/* 评论框 */}
          <Text style={styles.label}>REVIEW</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe your experience with the product and the seller/buyer"
            placeholderTextColor="#999"
            value={review}
            onChangeText={setReview}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{review.length}/300</Text>

          {/* 上传图片 */}
          <View style={styles.uploadSection}>
            <Text style={styles.label}>PHOTOS (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.uploadRow}>
                {/* 显示已选中的图片 */}
                {photos.map((photo) => (
                  <View key={photo.id} style={styles.photoContainer}>
                    <Image source={{ uri: photo.uri }} style={styles.selectedPhoto} />
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemovePhoto(photo.id)}
                      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    >
                      <Ionicons name="close" size={16} color="#F54B3D" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {/* 添加图片按钮 */}
                {photos.length < 9 && (
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={handleAddPhoto}
                  >
                    <Ionicons name="camera-outline" size={28} color="#555" />
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            {photos.length > 0 && (
              <Text style={styles.photoHint}>
                {photos.length}/9 photos • Tap to remove
              </Text>
            )}
          </View>
        </ScrollView>

        {/* 固定底部按钮 */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.sendBtn, submitting && styles.sendBtnDisabled]}
            onPress={handleSubmitReview}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  userSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, marginBottom: 8 },
  userName: { fontSize: 16, fontWeight: "600", color: "#333" },
  ratingSection: { alignItems: "center", marginBottom: 20 },
  starRow: { flexDirection: "row", marginBottom: 8 },
  subText: { fontSize: 13, color: "#888", textAlign: "center" },
  label: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 10,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
    includeFontPadding: false,
  },
  counter: { textAlign: "right", fontSize: 12, color: "#999", marginTop: 4 },
  uploadSection: {
    marginTop: 16,
  },
  uploadRow: {
    flexDirection: "row",
    columnGap: 12,
  },
  uploadBox: {
    width: 90,
    height: 90,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  photoContainer: {
    position: "relative",
    marginRight: 12,
  },
  selectedPhoto: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  removeBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  photoHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 12,
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingBottom: 40,
  },
  sendBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  sendText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sendBtnDisabled: { backgroundColor: "#ccc" },
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
