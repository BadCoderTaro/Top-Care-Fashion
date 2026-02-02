import React, { useCallback, useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import type { MyTopStackParamList } from "./index";
import { apiClient } from "../../../src/services/api";
import { useAuth } from "../../../contexts/AuthContext";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const FAQ_CATEGORIES = [
  { value: "General", label: "General" },
  { value: "Account", label: "Account" },
  { value: "Products", label: "Products" },
  { value: "Orders", label: "Orders" },
  { value: "Shipping", label: "Shipping" },
  { value: "Returns", label: "Returns" },
  { value: "Technical", label: "Technical" },
  { value: "Other", label: "Other" },
];

type HelpSupportNavigation = NativeStackNavigationProp<MyTopStackParamList>;

export default function HelpSupportScreen() {
  const navigation = useNavigation<HelpSupportNavigation>();
  const { user, isAuthenticated } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const response = await apiClient.get<{ faqs: FAQ[] }>("/api/faq", { status: "answered" });
      if (response.data) {
        setFaqs(response.data.faqs || []);
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatNow = useCallback(() => {
    const chatParams = {
      sender: "TOP Support",
      kind: "support" as const,
      conversationId: "support-1",
    };

    // Navigate via the root stack so the user returns to HelpSupport when backing out of chat
    let rootNavigation: any = navigation;
    while (rootNavigation?.getParent?.()) {
      rootNavigation = rootNavigation.getParent();
    }

    if (rootNavigation?.navigate) {
      rootNavigation.navigate("ChatStandalone", chatParams);
      return;
    }

    Alert.alert("Navigation unavailable", "Please open the Inbox tab to chat with support.");
  }, [navigation]);

  const handleSubmitQuestion = async () => {
    if (!question.trim()) {
      Alert.alert("Error", "Please enter your question");
      return;
    }

    if (!isAuthenticated) {
      Alert.alert("Error", "Please sign in to ask a question");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post("/api/faq", {
        question: question.trim(),
        category: selectedCategory || null,
      });

      Alert.alert("Success", "Your question has been submitted. We'll get back to you soon!");
      setQuestion("");
      setSelectedCategory("");
      await fetchFaqs();
    } catch (error) {
      console.error("Error submitting question:", error);
      Alert.alert("Error", "Failed to submit question. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Help & Support" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Icon name="chatbubbles-outline" size={22} color="#FF4D4F" />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Need fast help?</Text>
            <Text style={styles.cardDescription}>
              We're online 9am – 6pm SGT, Monday to Friday. Drop us a message and we'll get back quickly.
            </Text>
          </View>
          <TouchableOpacity style={styles.cardButton} onPress={handleChatNow}>
            <Text style={styles.cardButtonText}>Chat now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>FAQs</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF4D4F" />
          </View>
        ) : faqs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No FAQs available at the moment.</Text>
          </View>
        ) : (
          <View style={styles.faqList}>
            {faqs.map((faq) => (
              <View key={faq.id} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqQuestion}
                  onPress={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  <Icon
                    name={expandedFaqId === faq.id ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
                {expandedFaqId === faq.id && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {isAuthenticated ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Ask Anything</Text>
            <Text style={styles.formDescription}>
              Can't find what you're looking for? Submit your question below.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Question</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Type your question here..."
                value={question}
                onChangeText={setQuestion}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category (Optional)</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() => {
                    Alert.alert(
                      "Select Category",
                      "",
                      [
                        ...FAQ_CATEGORIES.map((cat) => ({
                          text: cat.label,
                          onPress: () => setSelectedCategory(cat.value),
                        })),
                        { text: "Cancel", style: "cancel" },
                      ],
                      { cancelable: true }
                    );
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.pickerText}>
                    {selectedCategory || "Select a category"}
                  </Text>
                  <Icon name="chevron-down" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmitQuestion}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Question</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.signInCard}>
            <Text style={styles.signInText}>Please sign in to ask a question.</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    rowGap: 24,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    columnGap: 12,
    backgroundColor: "#fff5f5",
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  cardDescription: {
    fontSize: 13,
    color: "#555",
    marginTop: 6,
    lineHeight: 18,
  },
  cardButton: {
    backgroundColor: "#FF4D4F",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: "center",
  },
  cardButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center" as const,
    backgroundColor: "#f8f8f8",
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
  },
  faqList: {
    borderRadius: 16,
    backgroundColor: "#f8f8f8",
    overflow: "hidden",
  },
  faqItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswerText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "android" ? 0 : 12,
    fontSize: 14,
    color: "#111",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    minHeight: 46,
    includeFontPadding: false,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: "#FF4D4F",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center" as const,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  picker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 14,
    color: "#111",
  },
  signInCard: {
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 16,
    alignItems: "center" as const,
  },
  signInText: {
    fontSize: 14,
    color: "#666",
  },
});
