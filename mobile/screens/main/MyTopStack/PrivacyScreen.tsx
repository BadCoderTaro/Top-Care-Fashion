import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import { userService, type VisibilitySetting } from "../../../src/services/userService";

type PrivacyField = "likes" | "follows";

type PrivacyOption = {
  value: VisibilitySetting;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Icon>["name"];
};

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: "PUBLIC",
    title: "Public",
    description: "Everyone on TopCare can see this section.",
    icon: "earth-outline",
  },
  {
    value: "FOLLOWERS_ONLY",
    title: "Followers only",
    description: "Only people who follow you can view it.",
    icon: "people-outline",
  },
  {
    value: "PRIVATE",
    title: "Only me",
    description: "Hidden from everyone except you.",
    icon: "lock-closed-outline",
  },
];

const describeVisibility = (value: VisibilitySetting): string => {
  switch (value) {
    case "FOLLOWERS_ONLY":
      return "Followers only";
    case "PRIVATE":
      return "Only you can see this";
    default:
      return "Visible to everyone";
  }
};

export default function PrivacyScreen() {
  const [likesVisibility, setLikesVisibility] = useState<VisibilitySetting>("PUBLIC");
  const [followsVisibility, setFollowsVisibility] = useState<VisibilitySetting>("PUBLIC");
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<PrivacyField | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const profile = await userService.getProfile();
        if (!mounted || !profile) return;
        setLikesVisibility(profile.likesVisibility ?? "PUBLIC");
        setFollowsVisibility(profile.followsVisibility ?? "PUBLIC");
      } catch (error) {
        console.error("❌ Failed to load privacy settings:", error);
        Alert.alert("Unable to load privacy settings", "Please try again later.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdate = useCallback(
    async (field: PrivacyField, value: VisibilitySetting) => {
      setStatusMessage(null);
      if (field === "likes" && value === likesVisibility) return;
      if (field === "follows" && value === followsVisibility) return;

      setSavingField(field);
      try {
        if (field === "likes") {
          await userService.updateProfile({ likesVisibility: value });
          setLikesVisibility(value);
          setStatusMessage("Likes visibility updated.");
        } else {
          await userService.updateProfile({ followsVisibility: value });
          setFollowsVisibility(value);
          setStatusMessage("Follow list visibility updated.");
        }
      } catch (error) {
        console.error("❌ Failed to update privacy setting:", error);
        const message = error instanceof Error ? error.message : "Please try again later.";
        Alert.alert("Update failed", message);
      } finally {
        setSavingField(null);
      }
    },
    [likesVisibility, followsVisibility],
  );

  const likesSummary = useMemo(() => describeVisibility(likesVisibility), [likesVisibility]);
  const followsSummary = useMemo(
    () => describeVisibility(followsVisibility),
    [followsVisibility],
  );

  if (loading) {
    return (
      <View style={styles.fullScreenContainer}>
        <Header title="Privacy" showBack />
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color="#F54B3D" />
          <Text style={styles.loadingText}>Loading your preferences…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Header title="Privacy" showBack />
      <ScrollView contentContainerStyle={styles.container}>
        <PrivacySection
          title="Liked items visibility"
          summary={likesSummary}
          saving={savingField === "likes"}
        >
          {PRIVACY_OPTIONS.map((option) => (
            <PrivacyOptionRow
              key={`likes-${option.value}`}
              option={option}
              selected={likesVisibility === option.value}
              disabled={savingField !== null}
              onPress={() => handleUpdate("likes", option.value)}
            />
          ))}
        </PrivacySection>

        <PrivacySection
          title="Followers & following visibility"
          summary={followsSummary}
          saving={savingField === "follows"}
        >
          {PRIVACY_OPTIONS.map((option) => (
            <PrivacyOptionRow
              key={`follows-${option.value}`}
              option={option}
              selected={followsVisibility === option.value}
              disabled={savingField !== null}
              onPress={() => handleUpdate("follows", option.value)}
            />
          ))}
        </PrivacySection>

        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
      </ScrollView>
    </View>
  );
}

function PrivacySection({
  title,
  summary,
  saving,
  children,
}: {
  title: string;
  summary: string;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSummary}>{summary}</Text>
        </View>
        {saving ? <ActivityIndicator size="small" color="#F54B3D" /> : null}
      </View>
      <View style={styles.optionGroup}>{children}</View>
    </View>
  );
}

function PrivacyOptionRow({
  option,
  selected,
  disabled,
  onPress,
}: {
  option: PrivacyOption;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, selected && styles.optionRowActive, disabled && styles.optionRowDisabled]}
      activeOpacity={0.8}
      onPress={disabled ? undefined : onPress}
    >
      <View style={styles.optionIconWrapper}>
        <Icon name={option.icon} size={20} color={selected ? "#F54B3D" : "#888"} />
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionTitle, selected && styles.optionTitleActive]}>{option.title}</Text>
        <Text style={styles.optionDescription}>{option.description}</Text>
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    rowGap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#555",
  },
  container: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    rowGap: 24,
  },
  section: {
    backgroundColor: "#f9f9f9",
    borderRadius: 16,
    padding: 18,
    rowGap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  sectionSummary: {
    marginTop: 4,
    fontSize: 13,
    color: "#666",
  },
  optionGroup: {
    rowGap: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    columnGap: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  optionRowActive: {
    borderColor: "#F54B3D",
    backgroundColor: "#fff5f4",
  },
  optionRowDisabled: {
    opacity: 0.65,
  },
  optionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
  },
  optionContent: {
    flex: 1,
    rowGap: 4,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  optionTitleActive: {
    color: "#F54B3D",
  },
  optionDescription: {
    fontSize: 13,
    color: "#666",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#bbb",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: "#F54B3D",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F54B3D",
  },
  statusMessage: {
    fontSize: 13,
    color: "#28a745",
    textAlign: "center",
  },
});
