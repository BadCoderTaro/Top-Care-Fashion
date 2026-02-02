import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Header from "../../../components/Header";
import {
  feedbackService,
  type FeedbackPriority,
  type FeedbackType,
} from "../../../src/services";
import type { MyTopStackParamList } from "./index";

type FeedbackNavigation = NativeStackNavigationProp<MyTopStackParamList>;

const TYPE_OPTIONS: Array<{ label: string; value: FeedbackType }> = [
  { label: "General", value: "general" },
  { label: "Feature", value: "feature" },
  { label: "Bug", value: "bug" },
];

const PRIORITY_OPTIONS: Array<{ label: string; value: FeedbackPriority }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default function FeedbackScreen() {
  const navigation = useNavigation<FeedbackNavigation>();
  const [type, setType] = useState<FeedbackType>("general");
  const [priority, setPriority] = useState<FeedbackPriority>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [loadingTags, setLoadingTags] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => description.trim().length >= 10 && rating > 0 && !submitting,
    [description, rating, submitting],
  );

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoadingTags(true);
        const tags = await feedbackService.getFeedbackTags();
        setAvailableTags(tags);
      } catch (error) {
        console.error("Failed to load feedback tags:", error);
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, []);

  const toggleTag = useCallback(
    (tag: string) => {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
      );
    },
    [setSelectedTags],
  );

  const handleAddTag = useCallback(() => {
    const trimmed = tagDraft.trim();
    if (!trimmed) return;
    if (!availableTags.includes(trimmed)) {
      setAvailableTags((prev) => [...prev, trimmed]);
    }
    setSelectedTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setTagDraft("");
  }, [availableTags, tagDraft]);

  const handleSubmit = useCallback(async () => {
    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10) {
      Alert.alert("Add more detail", "Tell us a little more so our team can help.");
      return;
    }
    if (rating < 1) {
      Alert.alert("Add a rating", "Please rate your experience so we can prioritise fixes.");
      return;
    }

    setSubmitting(true);
    try {
      await feedbackService.createFeedback({
        type,
        priority,
        title: title.trim() || undefined,
        description: trimmedDescription,
        rating,
        tags: selectedTags.length ? selectedTags : undefined,
      });

      Alert.alert("Feedback sent", "Thanks for letting us know!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
      setTitle("");
      setDescription("");
      setRating(0);
      setSelectedTags([]);
      setTagDraft("");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      Alert.alert(
        "Something went wrong",
        "We couldn't send your feedback. Please try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [description, navigation, priority, rating, selectedTags, title, type]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Share feedback" showBack />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardHeading}>What’s on your mind?</Text>
            <Text style={styles.cardDescription}>
              Tell us about issues, feature ideas or anything else that would improve your TOP
              experience.
            </Text>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Feedback type</Text>
              <View style={styles.segment}>
                {TYPE_OPTIONS.map((option) => {
                  const active = option.value === type;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.segmentItem, active && styles.segmentItemActive]}
                      onPress={() => setType(option.value)}
                    >
                      <Text
                        style={[styles.segmentText, active && styles.segmentTextActive]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Priority</Text>
              <View style={styles.segment}>
                {PRIORITY_OPTIONS.map((option) => {
                  const active = option.value === priority;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.segmentItem, active && styles.segmentItemActive]}
                      onPress={() => setPriority(option.value)}
                    >
                      <Text
                        style={[styles.segmentText, active && styles.segmentTextActive]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Rating</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= rating;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={styles.starButton}
                      onPress={() => setRating(value)}
                      disabled={submitting}
                      accessibilityRole="button"
                      accessibilityLabel={`Rate ${value} star${value > 1 ? "s" : ""}`}
                    >
                      <Text style={[styles.starIcon, active ? styles.starIconActive : undefined]}>
                        {active ? "★" : "☆"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.helperText}>Tap to rate your experience (1 = poor, 5 = great).</Text>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Subject (optional)</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Summarize your feedback"
                placeholderTextColor="#999"
                style={styles.input}
                returnKeyType="next"
                editable={!submitting}
              textAlignVertical="center"
              />
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Details</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Share what happened or the improvement you'd like to see"
                placeholderTextColor="#999"
                style={[styles.input, styles.multilineInput]}
                textAlignVertical="top"
                multiline
                numberOfLines={6}
                editable={!submitting}
              />
              <Text style={styles.helperText}>
                At least 10 characters so we can take action quickly.
              </Text>
            </View>

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Tags (optional)</Text>
              <View style={styles.tagInputRow}>
                <TextInput
                  value={tagDraft}
                  onChangeText={setTagDraft}
                  placeholder="Add a tag, e.g. checkout"
                  placeholderTextColor="#999"
                  style={[styles.input, styles.tagInput]}
                  editable={!submitting}
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                textAlignVertical="center"
                />
                <TouchableOpacity
                  style={[
                    styles.addTagButton,
                    (!tagDraft.trim() || submitting) && styles.addTagButtonDisabled,
                  ]}
                  onPress={handleAddTag}
                  disabled={!tagDraft.trim() || submitting}
                >
                  <Text style={styles.addTagButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              {loadingTags ? (
                <Text style={styles.helperText}>Loading suggestions…</Text>
              ) : (
                <View style={styles.tagsContainer}>
                  {availableTags.length === 0 ? (
                    <Text style={styles.helperText}>No suggestions yet. Add your own above.</Text>
                  ) : (
                    availableTags.map((tag) => {
                      const active = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.tagChip, active && styles.tagChipActive]}
                          onPress={() => toggleTag(tag)}
                          disabled={submitting}
                        >
                          <Text style={[styles.tagText, active && styles.tagTextActive]}>
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              disabled={!canSubmit}
              onPress={handleSubmit}
            >
              <Text style={styles.submitText}>
                {submitting ? "Sending…" : "Send feedback"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 20,
    gap: 20,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  cardDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e5ea",
    overflow: "hidden",
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: "#111",
  },
  segmentText: {
    fontSize: 14,
    color: "#555",
    fontWeight: "500",
  },
  segmentTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 28,
    color: "#ccc",
  },
  starIconActive: {
    color: "#f5a623",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e5ea",
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "android" ? 0 : 12,
    fontSize: 15,
    color: "#111",
    minHeight: 46,
    includeFontPadding: false,
  },
  multilineInput: {
    minHeight: 132,
  },
  helperText: {
    fontSize: 12,
    color: "#888",
  },
  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tagInput: {
    flex: 1,
  },
  addTagButton: {
    backgroundColor: "#111",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addTagButtonDisabled: {
    backgroundColor: "#ccc",
  },
  addTagButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d7d7d7",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  tagChipActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  tagText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "500",
  },
  tagTextActive: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#111",
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
