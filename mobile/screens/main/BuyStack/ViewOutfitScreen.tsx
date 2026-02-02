import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import SaveOutfitModal from "../../../src/components/SaveOutfitModal";
import { outfitService } from "../../../src/services/outfitService";
import { cartService } from "../../../src/services/cartService";
import { API_BASE_URL } from "../../../src/config/api";
import { useAuth } from "../../../contexts/AuthContext";
import type { BuyStackParamList } from "./index";
import type { BagItem, ListingItem, ListingCategory } from "../../../types/shop";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AIAnalysis {
  rating: number;
  styleName: string;
  colorHarmony: {
    score: number;
    feedback: string;
  };
  feedback: string;
  vibe: string;
}

const PLACEHOLDER_MESSAGE = "Select an item";

function PreviewCard({
  item,
  imageMode = "contain",
  onPress,
}: {
  item: ListingItem | null;
  imageMode?: "contain" | "cover";
  onPress?: (item: ListingItem) => void;
}) {
  const [aspect, setAspect] = useState(3 / 4);

  useEffect(() => {
    if (!item?.images?.length) return;
    let mounted = true;
    Image.getSize(
      item.images[0],
      (width, height) => {
        if (!mounted || !height) return;
        setAspect(width / height);
      },
      () => {}
    );
    return () => {
      mounted = false;
    };
  }, [item?.images]);

  if (!item) {
    return (
      <View style={styles.previewPlaceholder}>
        <Text style={styles.previewPlaceholderText}>{PLACEHOLDER_MESSAGE}</Text>
      </View>
    );
  }

  const handlePress = () => {
    if (onPress && item) {
      onPress(item);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.previewBlock} 
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <View style={styles.previewImageWrap}>
        <Image
          source={{ uri: item.images[0] }}
          resizeMode={imageMode}
          style={[styles.previewCardImage, { aspectRatio: aspect }]}
        />
        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText}>${item.price.toFixed(0)}</Text>
        </View>
      </View>
      <Text style={styles.previewItemTitle}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}

function AccessoryGrid({
  items,
  onItemPress,
}: {
  items: ListingItem[];
  onItemPress?: (item: ListingItem) => void;
}) {
  if (!items.length) {
    return (
      <View style={styles.previewPlaceholder}>
        <Text style={styles.previewPlaceholderText}>
          Add accessories to complete the look
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.accessoryColumn}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.accessoryBlock}
          onPress={() => onItemPress?.(item)}
          activeOpacity={0.8}
          disabled={!onItemPress}
        >
          <View style={styles.accessoryImageWrap}>
            <Image
              source={{ uri: item.images[0] }}
              style={styles.accessoryImage}
              resizeMode="cover"
            />
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>${item.price.toFixed(0)}</Text>
            </View>
          </View>
          <Text style={styles.accessoryTitle}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function ViewOutfitScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<BuyStackParamList>>();
  const route = useRoute<RouteProp<BuyStackParamList, "ViewOutfit">>();
  const { user } = useAuth();
  const { 
    baseItem, 
    top, 
    bottom, 
    shoe, 
    accessories, 
    selection, 
    outfitName, 
    outfitId, 
    aiRating, 
    styleName,
    colorHarmonyScore,
    colorHarmonyFeedback,
    styleTips,
    vibe,
  } = route.params;
  const insets = useSafeAreaInsets();
  const captureViewRef = useRef<View | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveOutfitModalVisible, setSaveOutfitModalVisible] = useState(false);
  const [isSavingOutfit, setIsSavingOutfit] = useState(false);
  const [isAddingToBag, setIsAddingToBag] = useState(false);
  
  // ⭐ NEW: Store AI analysis in memory
  // ✅ 如果从保存的 outfit 打开且有 AI 数据，从数据库加载完整的 aiAnalysis 对象
  const initialAiAnalysis = useMemo<AIAnalysis | null>(() => {
    if (aiRating !== null && aiRating !== undefined && styleName) {
      // ✅ 从数据库加载完整的 AI Analysis 数据（不再硬编码）
      return {
        rating: aiRating,
        styleName: styleName,
        colorHarmony: {
          score: colorHarmonyScore ?? Math.round((aiRating / 10) * 100), // 使用数据库中的值，如果没有则基于 rating 估算
          feedback: colorHarmonyFeedback || "Color harmony analysis is available for newly generated outfits.",
        },
        feedback: styleTips || `This ${styleName} outfit has a rating of ${aiRating}/10.`,
        vibe: vibe || styleName.toLowerCase(),
      };
    }
    return null;
  }, [aiRating, styleName, colorHarmonyScore, colorHarmonyFeedback, styleTips, vibe]);
  
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(initialAiAnalysis);
  
  // ✅ 如果传入了 outfitName，说明是从 Saved Outfits 打开的，不需要显示 Save 按钮
  const isSavedOutfit = !!outfitName;

  // ✅ AI Toast 状态
  // ✅ 如果是从保存的 outfit 打开或有 AI 分析，不显示 toast
  const [aiToastVisible, setAiToastVisible] = useState(!isSavedOutfit && !initialAiAnalysis);
  // ✨ 对齐 MixMatchScreen 的悬浮窗动画
  const aiToastOpacity = useRef(new Animated.Value(0)).current;
  const aiToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const composedSelection: BagItem[] = useMemo(() => {
    const unique = new Map<string, ListingItem>();
    selection.forEach((entry) => unique.set(entry.item.id, entry.item));
    return Array.from(unique.values()).map((item) => ({ item, quantity: 1 }));
  }, [selection]);

  // ✨ Prepare outfit items for AI analysis
  const outfitItems = useMemo(() => {
    const items = [];
    
    const normalizeCategory = (category?: ListingCategory | null) =>
      category ? String(category) : undefined;

    if (top) {
      items.push({
        type: 'top' as const,
        title: top.title,
        category: normalizeCategory(top.category),
        tags: top.tags || [],
      });
    }
    
    if (bottom) {
      items.push({
        type: 'bottom' as const,
        title: bottom.title,
        category: normalizeCategory(bottom.category),
        tags: bottom.tags || [],
      });
    }
    
    if (shoe) {
      items.push({
        type: 'shoes' as const,
        title: shoe.title,
        category: normalizeCategory(shoe.category),
        tags: shoe.tags || [],
      });
    }
    
    accessories.forEach(acc => {
      items.push({
        type: 'accessory' as const,
        title: acc.title,
        category: normalizeCategory(acc.category),
        tags: acc.tags || [],
      });
    });
    
    return items;
  }, [top, bottom, shoe, accessories]);

  const handleShare = useCallback(async () => {
    if (!captureViewRef.current) return;
    
    try {
      setIsSaving(true);
      
      // 等待布局完成，确保内容已完全渲染
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uri = await captureRef(captureViewRef, {
        format: "png",
        quality: 0.95,
        result: "tmpfile", // 使用临时文件，更可靠
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Share your outfit",
          mimeType: "image/png",
        });
      } else {
        Alert.alert("Unable to share", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("handleShare", error);
      Alert.alert("Error", "Unable to export image, please try again later");
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ✅ 真正将商品添加到购物车
  const handleAddToBag = useCallback(async () => {
    if (isAddingToBag || composedSelection.length === 0) return;

    try {
      setIsAddingToBag(true);

      // 获取当前购物车中的商品
      const cartItems = await cartService.getCartItems();
      const cartItemIds = new Set(
        cartItems.map(cartItem => 
          cartItem.item.id.toString() || 
          cartItem.item.listing_id?.toString()
        ).filter(Boolean)
      );

      // 收集要添加的商品和已存在的商品
      const itemsToAdd: ListingItem[] = [];
      const alreadyInCart: ListingItem[] = [];
      const ownListingItems: ListingItem[] = [];

      composedSelection.forEach(({ item }) => {
        const itemId = item.id.toString();
        const sellerId = (item as ListingItem).sellerId ?? item.seller?.id;
        const userId = user?.id;
        const sellerIdNumber = sellerId !== undefined && sellerId !== null ? Number(sellerId) : null;
        const userIdNumber = userId !== undefined && userId !== null ? Number(userId) : null;

        if (
          sellerIdNumber !== null &&
          userIdNumber !== null &&
          !Number.isNaN(sellerIdNumber) &&
          !Number.isNaN(userIdNumber) &&
          sellerIdNumber === userIdNumber
        ) {
          ownListingItems.push(item);
          return;
        }

        if (cartItemIds.has(itemId)) {
          alreadyInCart.push(item);
          return;
        }

        itemsToAdd.push(item);
      });

      if (itemsToAdd.length === 0) {
        const noticeParts: string[] = [];
        if (alreadyInCart.length > 0) {
          noticeParts.push(`${alreadyInCart.length} item(s) are already in your cart.`);
        }
        if (ownListingItems.length > 0) {
          noticeParts.push(`${ownListingItems.length} item(s) are your own listings and cannot be added.`);
        }

        Alert.alert(
          noticeParts.length > 0 ? 'Heads up' : 'Notice',
          noticeParts.join(' ') || 'No items available to add to your cart.',
          [{ text: 'OK', style: 'default' }]
        );
        setIsAddingToBag(false);
        return;
      }

      // 添加新商品到购物车
      const addPromises = itemsToAdd.map((item) =>
        cartService.addToCart(item.id.toString(), 1).catch((error) => {
          console.error(`Error adding item ${item.id} to cart:`, error);
          return null;
        })
      );

      const results = await Promise.all(addPromises);
      const successful = results.filter(r => r !== null).length;
      const failed = itemsToAdd.length - successful;

      // 显示结果提示
      if (successful > 0) {
        let message = `${successful} item(s) added to cart successfully!`;
        if (alreadyInCart.length > 0) {
          message += ` ${alreadyInCart.length} item(s) were already in your cart.`;
        }
        if (ownListingItems.length > 0) {
          message += ` ${ownListingItems.length} item(s) are your own listings and were skipped.`;
        }
        if (failed > 0) {
          message += ` ${failed} item(s) failed to add.`;
        }

        Alert.alert('Success', message, [
          { text: 'Continue Shopping', style: 'cancel' },
          {
            text: 'View Cart',
            style: 'default',
            onPress: () => navigation.navigate('Bag'),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to add items to cart. Please try again.');
      }
    } catch (error) {
      console.error('Error adding items to cart:', error);
      Alert.alert('Error', 'Failed to add items to cart. Please try again.');
    } finally {
      setIsAddingToBag(false);
    }
  }, [navigation, composedSelection, isAddingToBag, user?.id]);

  // ✅ AI 分析函数
  const analyzeOutfit = useCallback(async () => {
    if (outfitItems.length === 0) {
      setAnalysisError('No items to analyze');
      return;
    }

    setLoadingAnalysis(true);
    setAnalysisError(null);

    try {
      const token = await AsyncStorage.getItem('authToken');
      console.log('🤖 Analyzing outfit with AI...');

      const response = await fetch(`${API_BASE_URL}/api/outfits/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ items: outfitItems }),
      });

      if (!response.ok) {
        console.error('❌ AI API error:', response.status, response.statusText);
        setAnalysisError(`AI analysis failed: ${response.status}`);
        return;
      }

      let result;
      try {
        const text = await response.text();
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        setAnalysisError('Invalid response from AI service');
        return;
      }

      if (result.success && result.analysis) {
        console.log('✅ AI Analysis completed:', result.analysis);
        setAiAnalysis(result.analysis);
        setShowFeedbackModal(true);
      } else {
        setAnalysisError('Failed to analyze outfit');
      }
    } catch (error) {
      console.error('❌ Error analyzing outfit:', error);
      setAnalysisError('Network error. Please try again.');
    } finally {
      setLoadingAnalysis(false);
    }
  }, [outfitItems]);

  // ✅ 显示 AI Toast
  const showAiToast = useCallback(() => {
    if (aiToastTimerRef.current) {
      clearTimeout(aiToastTimerRef.current);
      aiToastTimerRef.current = null;
    }
    setAiToastVisible(true);
    Animated.parallel([
      Animated.timing(aiToastOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [aiToastOpacity]);

  // ✅ 隐藏 AI Toast
  const hideAiToast = useCallback(
    ({ delay = 240 }: { delay?: number } = {}) => {
    if (aiToastTimerRef.current) {
      clearTimeout(aiToastTimerRef.current);
      aiToastTimerRef.current = null;
    }
      aiToastTimerRef.current = setTimeout(() => {
        Animated.timing(aiToastOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          setAiToastVisible(false);
        });
        aiToastTimerRef.current = null;
      }, delay);
    },
    [aiToastOpacity]
  );

  // ✅ 点击 Toast 触发分析
  const handleAiToastPress = useCallback(() => {
    hideAiToast();
    analyzeOutfit();
  }, [hideAiToast, analyzeOutfit]);

  // ✅ 点击 Header 按钮打开已存储的 feedback
  const handleHeaderButtonPress = useCallback(() => {
    if (aiAnalysis) {
      setShowFeedbackModal(true);
    }
  }, [aiAnalysis]);

  // ✅ 滚动处理
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // 滚动时隐藏 toast
    if (aiToastVisible && !aiAnalysis && !isSavedOutfit) {
      hideAiToast();
    }
    
    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 停止滚动 500ms 后显示 toast（如果还没有分析过）
    scrollTimeoutRef.current = setTimeout(() => {
      if (!aiAnalysis && !isSavedOutfit && !aiToastVisible) {
        showAiToast();
      }
    }, 500);
  }, [aiToastVisible, hideAiToast, aiAnalysis, isSavedOutfit, showAiToast]);

  // ✅ 初始化：如果是保存的 outfit 或有分析结果，隐藏 toast
  useEffect(() => {
    if (isSavedOutfit || aiAnalysis) {
      hideAiToast();
    } else {
      showAiToast();
    }
  }, [isSavedOutfit, aiAnalysis, showAiToast, hideAiToast]);

  // ✅ 清理
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (aiToastTimerRef.current) {
        clearTimeout(aiToastTimerRef.current);
      }
    };
  }, []);

  const handleSaveOutfit = async (outfitName: string) => {
    try {
      setIsSavingOutfit(true);
      
      await outfitService.createOutfit({
        outfit_name: outfitName,
        base_item_id: baseItem.id,
        top_item_id: top?.id || null,
        bottom_item_id: bottom?.id || null,
        shoe_item_id: shoe?.id || null,
        accessory_ids: accessories.map(acc => acc.id),
        
        // ⭐ Save complete AI analysis from memory to database
        ai_rating: aiAnalysis?.rating || null,
        style_name: aiAnalysis?.styleName || null,
        color_harmony_score: aiAnalysis?.colorHarmony?.score || null,
        color_harmony_feedback: aiAnalysis?.colorHarmony?.feedback || null,
        style_tips: aiAnalysis?.feedback || null,
        vibe: aiAnalysis?.vibe || null,
      });

      Alert.alert('Success', `"${outfitName}" saved successfully!`);
      setSaveOutfitModalVisible(false);
    } catch (error) {
      console.error('Error saving outfit:', error);
      throw error;
    } finally {
      setIsSavingOutfit(false);
    }
  };

  // ✅ 获取星级评分
  const getStarRating = (rating: number) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 >= 1;
    const stars = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Icon key={`full-${i}`} name="star" size={16} color="#FFD700" />);
    }
    if (hasHalfStar) {
      stars.push(<Icon key="half" name="star-half" size={16} color="#FFD700" />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Icon key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />);
    }
    
    return stars;
  };

  // ✅ 获取 Vibe Emoji
  const getVibeEmoji = (vibe: string) => {
    const vibeMap: Record<string, string> = {
      'casual': '😎',
      'formal': '👔',
      'sporty': '⚽',
      'elegant': '✨',
      'edgy': '🔥',
      'bohemian': '🌸',
      'minimalist': '⚪',
      'vintage': '🕰️',
      'streetwear': '🛹',
    };
    return vibeMap[vibe.toLowerCase()] || '👕';
  };

  // ✅ 动态计算底部 padding：底栏高度 + SafeArea bottom inset + 额外间距
  const bottomBarHeight = useMemo(() => {
    // 底栏 paddingTop: 16
    // 按钮高度：paddingVertical(16*2) + 文字高度(约14-16) = 约46-48px
    const barPaddingTop = 16;
    const buttonHeight = 16 * 2 + 16; // paddingVertical * 2 + 文字高度估算
    const barPaddingBottom = insets.bottom; // paddingBottom 已包含 SafeArea inset
    // 底栏总高度 = paddingTop + 按钮高度 + paddingBottom + 额外安全间距
    return barPaddingTop + buttonHeight + barPaddingBottom + 12; // 额外12px作为安全间距
  }, [insets.bottom]);

  const leftItems: Array<{ item: ListingItem | null }> = [
    { item: top || baseItem },
    { item: bottom || baseItem },
    ...(shoe ? [{ item: shoe }] : []),
  ];
  
  const rightItems = accessories;

  // ✅ 处理商品卡片点击，导航到商品详情页
  const handleItemPress = useCallback((item: ListingItem) => {
    // ✅ Use lazy loading: only pass listingId
    if (!item?.id) {
      console.warn("⚠️ Cannot navigate: invalid listing item");
      return;
    }
    navigation.navigate("ListingDetail", { listingId: String(item.id) });
  }, [navigation]);

  // 计算 Toast 显示条件
  const shouldShowToast = !aiAnalysis && !isSavedOutfit && aiToastVisible;

  // ✅ Header 右侧按钮：AI Feedback
  const headerRightAction = aiAnalysis ? (
    <TouchableOpacity
      onPress={handleHeaderButtonPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      <Icon name="sparkles" size={24} color="#FFD700" />
    </TouchableOpacity>
  ) : undefined;

  return (
    <View style={styles.container}>
      <Header 
        title={outfitName || "View Outfit"} 
        showBack 
        rightAction={headerRightAction}
      />
      
      {/* ✅ AI Toast - 底部显示 */}
      {shouldShowToast && (
        <Animated.View
          style={[
            styles.aiToast,
            {
              bottom: insets.bottom + 96, // Bottom bar 高度约 80px + padding，Toast 在其上方
              opacity: aiToastOpacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleAiToastPress}
            style={styles.aiToastTouchable}
            disabled={loadingAnalysis}
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.92)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiToastGradient}
            >
              {loadingAnalysis ? (
                <>
                  <ActivityIndicator size="small" color="#FFD700" />
                  <Text style={styles.aiToastText}>Analyzing...</Text>
                </>
              ) : (
                <>
                  <Icon name="sparkles" size={16} color="#FFD700" />
                  <Text style={styles.aiToastText}>Tap for AI outfit analysis</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ✅ AI Feedback Modal - 黑色半透明悬浮窗 */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowFeedbackModal(false)}
          />
          <View
            style={styles.feedbackPanelTouchable}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.feedbackPanel}>
              {/* Header */}
              <View style={styles.panelHeader}>
                <View style={styles.panelHeaderLeft}>
                  <Icon name="sparkles" size={24} color="#FFD700" />
                  <Text style={styles.panelTitle}>AI Feedback</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowFeedbackModal(false)}
                  style={styles.panelCloseButton}
                >
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Content - 使用 ScrollView 确保内容不被截断 */}
              {aiAnalysis ? (
                <ScrollView
                  style={styles.panelScrollView}
                  contentContainerStyle={styles.panelContent}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  {/* Rating */}
                  <View style={styles.panelSection}>
                    <Text style={styles.panelSectionTitle}>Outfit Rating</Text>
                    <View style={styles.ratingRow}>
                      <View style={styles.stars}>{getStarRating(aiAnalysis.rating)}</View>
                      <Text style={styles.ratingScore}>{aiAnalysis.rating}/10</Text>
                    </View>
                  </View>

                  {/* Style Name */}
                  <View style={styles.panelSection}>
                    <View style={styles.styleNameHeader}>
                      <Text style={styles.panelSectionTitle}>Style Name</Text>
                      <Text style={styles.vibe}>
                        {getVibeEmoji(aiAnalysis.vibe)} {aiAnalysis.vibe}
                      </Text>
                    </View>
                    <View style={styles.styleNameContainer}>
                      <Text style={styles.styleName}>{aiAnalysis.styleName}</Text>
                    </View>
                  </View>

                  {/* Color Harmony */}
                  <View style={styles.panelSection}>
                    <Text style={styles.panelSectionTitle}>Color Harmony</Text>
                    <View style={styles.colorHarmonyRow}>
                      <View style={styles.colorScore}>
                        <Text style={styles.colorScoreText}>
                          {aiAnalysis.colorHarmony.score}/10
                        </Text>
                      </View>
                      <Text style={styles.colorFeedback}>
                        {aiAnalysis.colorHarmony.feedback}
                      </Text>
                    </View>
                  </View>

                  {/* General Feedback */}
                  <View style={styles.panelSection}>
                    <Text style={styles.panelSectionTitle}>Style Tips</Text>
                    <Text style={styles.feedback}>{aiAnalysis.feedback}</Text>
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.panelContent}>
                  <Text style={styles.loadingText}>No analysis available</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.body} edges={["left", "right"]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight }]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.content}>
            <View
              ref={captureViewRef}
              collapsable={false}
              style={styles.captureCanvas}
            >
              <View style={styles.previewRow}>
                <View style={styles.leftColumn}>
                  {leftItems.map((section, index) => (
                    <PreviewCard 
                      key={index} 
                      item={section.item} 
                      onPress={section.item ? handleItemPress : undefined}
                    />
                  ))}
                </View>
                <View style={styles.rightColumn}>
                  <Text style={styles.sectionLabel}>ACCESSORIES</Text>
                  <AccessoryGrid 
                    items={rightItems} 
                    onItemPress={handleItemPress}
                  />
                </View>
              </View>
            </View>

          </View>
        </ScrollView>

        <View style={styles.bottomSafe}>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
            {!isSavedOutfit && (
              <TouchableOpacity
                style={styles.saveOutfitButton}
                onPress={() => setSaveOutfitModalVisible(true)}
              >
                <Icon name="bookmark" size={20} color="#111" />
                <Text style={styles.saveOutfitButtonText}>Save</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleShare}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <Icon name="refresh" size={18} color="#111" />
              ) : (
                <>
                  <Icon name="share" size={18} color="#111" />
                  <Text style={styles.secondaryText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (isAddingToBag || composedSelection.length === 0) && styles.primaryButtonDisabled,
              ]}
              onPress={handleAddToBag}
              activeOpacity={0.9}
              disabled={isAddingToBag || composedSelection.length === 0}
            >
              {isAddingToBag ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.primaryText}>Adding...</Text>
                </>
              ) : (
                <Text style={styles.primaryText}>Add To Bag</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!isSavedOutfit && (
          <SaveOutfitModal
            visible={saveOutfitModalVisible}
            onClose={() => setSaveOutfitModalVisible(false)}
            onSave={handleSaveOutfit}
            isLoading={isSavingOutfit}
            defaultName={aiAnalysis?.styleName} // ✅ 自动填入 AI 生成的 styleName
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  body: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // paddingBottom 现在通过动态计算设置
  },
  content: {
    paddingHorizontal: 8,
    paddingTop: 0,
    rowGap: 20,
  },
  captureCanvas: {
    width: "100%",
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 24,
    minHeight: 400, // 最小高度确保基本显示
  },
  previewRow: {
    flexDirection: "row",
    columnGap: 20,
    alignItems: "flex-start", // 顶部对齐，让内容自然扩展
  },
  leftColumn: {
    flex: 3,
    rowGap: 12,
  },
  rightColumn: {
    flex: 2,
    rowGap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#6a6a6a",
  },
  previewBlock: {
    rowGap: 6,
  },
  previewImageWrap: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#f4f4f4",
  },
  previewCardImage: {
    width: "100%",
    height: undefined,
  },
  priceBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
  },
  previewItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6a6a6a",
    textAlign: "left",
    paddingHorizontal: 6,
  },
  previewPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    backgroundColor: "#f4f4f4",
    borderRadius: 20,
    padding: 32,
  },
  previewPlaceholderText: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
  },
  accessoryColumn: {
    rowGap: 24,
  },
  accessoryBlock: {
    rowGap: 6,
  },
  accessoryImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#f4f4f4",
  },
  accessoryImage: {
    width: "100%",
    height: "100%",
  },
  accessoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6a6a6a",
    textAlign: "center",
  },
  bottomSafe: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingHorizontal: 16,
    columnGap: 8,
  },
  saveOutfitButton: {
    flex: 1,
    marginRight: 0,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#111',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    flexDirection: 'row',
    columnGap: 8,
  },
  saveOutfitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 8,
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#111",
    marginRight: 0,
    backgroundColor: "#fff",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#111",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    flexDirection: "row",
    gap: 8,
    opacity: 1,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  // ✅ AI Toast - 底部显示
  aiToast: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 9999,
    left: 20,
    right: 20,
    elevation: 10, // Android shadow
  },
  aiToastTouchable: {
    borderRadius: 24,
  },
  aiToastGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  aiToastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  // ✅ AI Feedback Modal 样式
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  feedbackPanelTouchable: {
    width: "100%",
    maxWidth: 500,
  },
  feedbackPanel: {
    width: "100%",
    backgroundColor: "rgba(17, 17, 17, 0.95)",
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "column",
    alignSelf: "center",
    maxHeight: Math.min(SCREEN_HEIGHT * 0.8, 600),
  },
  panelScrollView: {
    flexGrow: 0,
    maxHeight: Math.min(SCREEN_HEIGHT * 0.6, 480),
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  panelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  panelCloseButton: {
    padding: 4,
  },
  panelContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
  },
  loadingText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    padding: 20,
  },
  panelSection: {
    marginBottom: 24,
  },
  panelSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stars: {
    flexDirection: "row",
    gap: 4,
  },
  ratingScore: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFD700",
  },
  styleNameHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  vibe: {
    fontSize: 14,
    color: "#999",
  },
  styleNameContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  styleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  colorHarmonyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  colorScore: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  colorScoreText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4CAF50",
  },
  colorFeedback: {
    flex: 1,
    fontSize: 14,
    color: "#ddd",
    lineHeight: 20,
  },
  feedback: {
    fontSize: 14,
    color: "#ddd",
    lineHeight: 22,
  },
});
