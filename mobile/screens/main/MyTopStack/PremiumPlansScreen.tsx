import React, { useState, useEffect } from "react";
import {
  ImageBackground,  
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Icon from "../../../components/Icon";
import PlanOptionCard from "../../../components/PlanOptionCard";
import type { PremiumStackParamList } from "../PremiumStack";
import { PREMIUM_BG } from "../../../constants/assetUrls";
import { LOGO_FULL_COLOR } from "../../../constants/assetUrls";
import PaymentSelector from "../../../components/PaymentSelector";
import { premiumService, paymentMethodsService, type PaymentMethod } from "../../../src/services";
import { useAuth } from "../../../contexts/AuthContext";

const BACKGROUND_IMAGE = PREMIUM_BG;

const BENEFITS = [
  "Reduced commission fee to 5%",
  "Reduced 30% of Boost fee",
  "Free Boost per month (3 times/month)",
  "Unlimited Listing",
  "Unlimited Mix & Match Advice",
];

export default function PremiumPlansScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<PremiumStackParamList>>();
  const [selectedPlan, setSelectedPlan] = useState<"1m" | "3m" | "1y">("1m");
  const [showPayment, setShowPayment] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const { user, updateUser } = useAuth();

  // 🔥 从后端加载默认支付方式
  useEffect(() => {
    let mounted = true;
    const loadDefaultPayment = async () => {
      try {
        const def = await paymentMethodsService.getDefaultPaymentMethod();
        if (!mounted) return;
        if (def) {
          setSelectedPaymentMethod(def);
        }
      } catch (err) {
        console.warn('Failed to load default payment method', err);
      }
    };
    loadDefaultPayment();
    return () => { mounted = false; };
  }, []);

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.background}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={{ alignItems: "flex-start", marginBottom: -10 }}>
              <LOGO_FULL_COLOR width={150} height={60} />
            </View>

            <Text style={styles.heading}>What Premium User can enjoy?</Text>

            <View style={styles.benefitsList}>
              {BENEFITS.map((benefit) => (
                <View key={benefit} style={styles.benefitItem}>
                  <Icon name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            <View style={styles.planGroup}>
              <PlanOptionCard
                prefix="1 Month / "
                highlight="$ 6.9"
                selected={selectedPlan === "1m"}
                onPress={() => setSelectedPlan("1m")}
              />
              <PlanOptionCard
                prefix="3 Month / "
                highlight="$ 18.9"
                selected={selectedPlan === "3m"}
                onPress={() => setSelectedPlan("3m")}
              />
              <PlanOptionCard
                prefix="1 Year / "
                highlight="$ 59.9"
                selected={selectedPlan === "1y"}
                onPress={() => setSelectedPlan("1y")}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={() => setShowPayment(true)}>
            <Text style={styles.ctaText}>GET IT NOW!</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPayment}
        animationType="slide"
        onRequestClose={() => setShowPayment(false)}
        transparent
      >
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Purchase</Text>
              <TouchableOpacity onPress={() => setShowPayment(false)}>
                <Icon name="close" size={22} color="#111" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Plan: {selectedPlan === '1m' ? '1 Month' : selectedPlan === '3m' ? '3 Months' : '1 Year'}</Text>
            <PaymentSelector
              selectedPaymentMethodId={selectedPaymentMethod?.id ?? null}
              onSelect={setSelectedPaymentMethod}
            />
            <TouchableOpacity
              style={[styles.payButton, (processing || !selectedPaymentMethod) && { opacity: 0.6 }]}
              disabled={processing || !selectedPaymentMethod}
              onPress={async () => {
                try {
                  setProcessing(true);
                  const res = await premiumService.upgrade(selectedPlan, {
                    brand: selectedPaymentMethod?.brand,
                    last4: selectedPaymentMethod?.last4,
                  });
                  if (res?.user) {
                    updateUser({
                      ...(user as any),
                      isPremium: res.user.isPremium,
                      premiumUntil: res.user.premiumUntil,
                    });
                  } else {
                    updateUser({ ...(user as any), isPremium: true, premiumUntil: null });
                  }
                  setShowPayment(false);
                  // 返回并刷新 MyPremium 页面
                  navigation.goBack();
                } catch (e) {
                  console.error('Upgrade failed', e);
                  // lightweight alert substitute
                } finally {
                  setProcessing(false);
                }
              }}
            >
              <Text style={styles.payText}>{processing ? 'Processing...' : 'Confirm & Pay'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  closeButton: {
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  content: {
    paddingBottom: 40,
    rowGap: 28,
  },
  logoText: {
    fontSize: 56,
    fontWeight: "800",
    color: "#FF3B2F",
    letterSpacing: 2,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  benefitsList: {
    rowGap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  planGroup: {
    rowGap: 16,
  },
  ctaButton: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#141414",
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  modalSubtitle: { fontSize: 14, color: '#555', marginBottom: 8 },
  payButton: {
    marginTop: 8,
    backgroundColor: '#111',
    borderRadius: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
