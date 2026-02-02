import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import Icon from "../../../components/Icon";
import PaymentSelector from "../../../components/PaymentSelector";
import type { PremiumStackParamList } from "../PremiumStack";
import {
  benefitsService,
  listingsService,
  type UserBenefitsPayload,
} from "../../../src/services";
import type { BoostedListingSummary } from "../../../src/services/listingsService";
import type { PaymentMethod } from "../../../src/services/paymentMethodsService";
import { ApiError } from "../../../src/config/api";

const BOOST_DURATION_DAYS = 3;

export default function BoostCheckoutScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PremiumStackParamList, "BoostCheckout">>();
  const route = useRoute<RouteProp<PremiumStackParamList, "BoostCheckout">>();
  const { plan, listings, listingIds, benefitsSnapshot } = route.params;

  const [benefits, setBenefits] = useState<UserBenefitsPayload["benefits"] | null>(
    benefitsSnapshot ?? null
  );
  const [benefitsLoading, setBenefitsLoading] = useState(!benefitsSnapshot);
  const [benefitsError, setBenefitsError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [processing, setProcessing] = useState(false);
  const [boostedListings, setBoostedListings] = useState<BoostedListingSummary[]>([]);
  const [checkingBoosted, setCheckingBoosted] = useState(true);

  useEffect(() => {
    if (benefitsSnapshot) {
      return;
    }
    let mounted = true;
    const load = async () => {
      try {
        setBenefitsLoading(true);
        const payload = await benefitsService.getUserBenefits();
        if (!mounted) return;
        setBenefits(payload.benefits);
      } catch (error) {
        console.warn("Failed to refresh benefits for boost checkout", error);
        if (mounted) {
          setBenefitsError(
            "Unable to refresh benefits. Totals may be outdated."
          );
        }
      } finally {
        if (mounted) {
          setBenefitsLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [benefitsSnapshot]);

  // ✅ 检查是否有已boosted的listings
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const checkBoosted = async () => {
        try {
          setCheckingBoosted(true);
          const boosted = await listingsService.getBoostedListings();
          if (!isMounted) return;
          setBoostedListings(boosted);
        } catch (error) {
          console.error("❌ Error checking boosted listings:", error);
          if (isMounted) {
            setBoostedListings([]);
          }
        } finally {
          if (isMounted) {
            setCheckingBoosted(false);
          }
        }
      };
      checkBoosted();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const listingNames = useMemo(() => {
    if (listings.length > 0) {
      return listings.map((item) => item.title || `Listing ${item.id}`);
    }
    return listingIds.map((id) => `Listing ${id}`);
  }, [listingIds, listings]);

  const listingCount = useMemo(() => {
    if (listings.length > 0) {
      return listings.length;
    }
    return listingIds.length;
  }, [listingIds, listings]);

  const pricePerBoost = useMemo(() => {
    const defaultPrice = plan === "premium" ? 2.0 : 2.9;
    if (!benefits) {
      return defaultPrice;
    }
    if (plan === "premium") {
      return (
        benefits.promotionPricing?.price ??
        benefits.promotionPrice ??
        defaultPrice
      );
    }
    return benefits.promotionPricing?.regularPrice ?? 2.9;
  }, [benefits, plan]);

  const freeCreditsInfo = useMemo(() => {
    if (!benefits || plan !== "premium") {
      return {
        available: 0,
        used: 0,
      };
    }
    const available = Math.max(0, benefits.freePromotionsRemaining ?? 0);
    const used = Math.min(available, listingCount);
    return { available, used };
  }, [benefits, listingCount, plan]);

  const paidBoostCount = Math.max(0, listingCount - freeCreditsInfo.used);
  const totalDue = Number((paidBoostCount * pricePerBoost).toFixed(2));
  const requiresPaymentMethod = totalDue > 0;

  // ✅ 检查是否有已boosted的listings
  const alreadyBoostedListings = useMemo(() => {
    if (checkingBoosted || boostedListings.length === 0) return [];
    
    const activeOrScheduled = boostedListings.filter(
      (item) => item.status === "ACTIVE" || item.status === "SCHEDULED"
    );
    
    return listingIds.filter((id) =>
      activeOrScheduled.some((boosted) => String(boosted.listingId) === String(id))
    );
  }, [boostedListings, listingIds, checkingBoosted]);

  const hasAlreadyBoosted = alreadyBoostedListings.length > 0;
  const allAlreadyBoosted = alreadyBoostedListings.length === listingCount && listingCount > 0;

  const confirmLabel = useMemo(() => {
    if (allAlreadyBoosted) {
      return "Already Boosted";
    }
    if (hasAlreadyBoosted) {
      return "Some Already Boosted";
    }
    if (processing) {
      return "Scheduling…";
    }
    if (totalDue > 0) {
      return `Pay $${totalDue.toFixed(2)} & Boost`;
    }
    return "Boost with free credits";
  }, [allAlreadyBoosted, hasAlreadyBoosted, processing, totalDue]);

  const disableConfirm =
    processing || 
    listingCount === 0 || 
    (requiresPaymentMethod && !selectedPaymentMethod) ||
    allAlreadyBoosted ||
    checkingBoosted;

  const handleConfirm = async () => {
    if (disableConfirm) {
      return;
    }

    // ✅ 最后检查一次是否有已boosted的listings
    if (hasAlreadyBoosted) {
      const boostedNames = listings
        .filter((listing) => alreadyBoostedListings.includes(listing.id))
        .map((listing) => listing.title || `Listing ${listing.id}`)
        .slice(0, 3);
      
      const message = allAlreadyBoosted
        ? `All selected listings are already being boosted. Please wait for the current boost to expire before boosting again.`
        : `Some listings are already being boosted:\n\n${boostedNames.join(", ")}${boostedNames.length < alreadyBoostedListings.length ? ` and ${alreadyBoostedListings.length - boostedNames.length} more` : ""}\n\nPlease wait for the current boost to expire before boosting again.`;

      Alert.alert(
        "Already Boosted",
        message,
        [
          {
            text: "OK",
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    try {
      setProcessing(true);
      const response = await listingsService.boostListings({
        listingIds,
        plan,
        paymentMethodId: requiresPaymentMethod
          ? selectedPaymentMethod?.id
          : undefined,
        useFreeCredits: plan === "premium",
      });

      Alert.alert(
        "Boost scheduled",
        `Successfully boosted ${response.createdCount} listing${
          response.createdCount === 1 ? "" : "s"
        }.`,
        [
          {
            text: "OK",
            onPress: () => {
              navigation.popToTop();
              navigation.getParent()?.goBack();
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      let message = "Failed to boost listings. Please try again.";
      if (error instanceof ApiError) {
        message =
          (typeof error.response?.error === "string" && error.response.error) ||
          error.message ||
          message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      Alert.alert("Boost failed", message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#101010" }}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
            accessible
            accessibilityRole="button"
          >
            <Icon name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Boost</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              {listingCount} listing{listingCount === 1 ? "" : "s"} selected
            </Text>
            <Text style={styles.summarySubtitle}>
              {BOOST_DURATION_DAYS}-day boost • {plan === "premium" ? "Premium pricing" : "Standard pricing"}
            </Text>
            {listingNames.length > 0 ? (
              <Text style={styles.summaryMeta} numberOfLines={2}>
                {listingNames.slice(0, 3).join(", ")}
                {listingNames.length > 3
                  ? ` +${listingNames.length - 3} more`
                  : ""}
              </Text>
            ) : null}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Price per boost</Text>
              <Text style={styles.summaryValue}>${pricePerBoost.toFixed(2)}</Text>
            </View>

            {plan === "premium" ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Free credits applied</Text>
                <Text style={styles.summaryValue}>
                  {freeCreditsInfo.used} / {freeCreditsInfo.available}
                </Text>
              </View>
            ) : null}

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.totalLabel]}>Total due today</Text>
              <Text style={[styles.summaryValue, styles.totalValue]}>
                {totalDue > 0 ? `$${totalDue.toFixed(2)}` : "No charge"}
              </Text>
            </View>
          </View>

          {/* ✅ 显示已boosted警告 */}
          {hasAlreadyBoosted && !checkingBoosted ? (
            <View style={styles.errorBanner}>
              <Icon name="warning" size={18} color="#FF6B6B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Already Boosted</Text>
                <Text style={styles.errorText}>
                  {allAlreadyBoosted
                    ? "All selected listings are already being boosted. Please wait for the current boost to expire."
                    : `${alreadyBoostedListings.length} of ${listingCount} listing${listingCount === 1 ? "" : "s"} already boosted. Please remove them or wait for the current boost to expire.`}
                </Text>
              </View>
            </View>
          ) : null}

          {checkingBoosted ? (
            <View style={styles.infoBanner}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.infoText}>Checking boost status…</Text>
            </View>
          ) : null}

          {benefitsLoading ? (
            <Text style={styles.infoText}>Refreshing membership benefits…</Text>
          ) : null}
          {benefitsError ? (
            <Text style={styles.warningText}>{benefitsError}</Text>
          ) : null}

          {requiresPaymentMethod ? (
            <PaymentSelector
              selectedPaymentMethodId={selectedPaymentMethod?.id ?? null}
              onSelect={setSelectedPaymentMethod}
              style={styles.paymentSelector}
            />
          ) : (
            <View style={styles.noChargeBanner}>
              <Icon name="sparkles-outline" size={18} color="#FFD166" />
              <Text style={styles.noChargeText}>
                Free credits cover this boost. No payment method required.
              </Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.confirmButton, disableConfirm && { opacity: 0.6 }]}
          onPress={handleConfirm}
          disabled={disableConfirm}
        >
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    paddingBottom: 32,
    gap: 24,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 10,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summarySubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  summaryMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 6,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  totalLabel: {
    fontSize: 15,
  },
  totalValue: {
    fontSize: 16,
  },
  infoText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  warningText: {
    fontSize: 12,
    color: "#FFD166",
    textAlign: "center",
  },
  paymentSelector: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },
  noChargeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,209,102,0.1)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noChargeText: {
    fontSize: 13,
    color: "#FFD166",
    flex: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(255,107,107,0.15)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B6B",
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: "rgba(255,107,107,0.9)",
    lineHeight: 16,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  confirmButton: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#141414",
  },
});
