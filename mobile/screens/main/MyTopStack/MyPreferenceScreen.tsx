import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Header from "../../../components/Header";
import { userService } from "../../../src/services/userService";
import { useAuth } from "../../../contexts/AuthContext";
import type { MyTopStackParamList, PreferenceSizes } from "./index";
import { DEFAULT_STYLE_IMAGE, STYLE_OPTIONS } from "./styleOptions";

type PrefNav = NativeStackNavigationProp<MyTopStackParamList, "MyPreference">;

const STYLE_IMAGE_MAP = STYLE_OPTIONS.reduce<Record<string, string>>(
  (acc, style) => {
    acc[style.name] = style.image;
    return acc;
  },
  {}
);

type GenderOption = "Female" | "Male" | "Non-binary / Prefer not to say";

export default function MyPreferenceScreen() {
  const navigation = useNavigation<PrefNav>();
  const { user, updateUser, loading: authLoading } = useAuth();
  const [selectedGender, setSelectedGender] = useState<GenderOption>("Non-binary / Prefer not to say");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<PreferenceSizes>({});
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [genderSaving, setGenderSaving] = useState(false);
  const [genderError, setGenderError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setLoadingPreferences(false);
  }, [authLoading]);

  useEffect(() => {
    if (!user) {
      setSelectedGender("Non-binary / Prefer not to say");
      setSelectedStyles([]);
      setSelectedBrands([]);
      setSelectedSizes({});
      return;
    }
    const preferredStyles = Array.isArray(user.preferred_styles)
      ? user.preferred_styles.filter((item): item is string => typeof item === "string")
      : [];
    const preferredBrands = Array.isArray(user.preferred_brands)
      ? user.preferred_brands.filter((item): item is string => typeof item === "string")
      : [];

    setSelectedGender(
      user.gender === "Male"
        ? "Male"
        : user.gender === "Female"
        ? "Female"
        : "Non-binary / Prefer not to say"
    );
    setSelectedStyles(preferredStyles);
    setSelectedBrands(preferredBrands);
    setSelectedSizes({
      shoe: user.preferred_size_shoe ?? undefined,
      top: user.preferred_size_top ?? undefined,
      bottom: user.preferred_size_bottom ?? undefined,
    });
  }, [user]);

  const handleSelectGender = async (option: GenderOption) => {
    if (option === selectedGender || genderSaving) return;
    const prev = selectedGender;
    setGenderError(null);
    setSelectedGender(option);
    setGenderSaving(true);
    try {
      const apiGender =
        option === "Male" ? "Male" : option === "Female" ? "Female" : null;
      const updatedUser = await userService.updateProfile({
        // Map to API-compatible values
        gender: apiGender,
      });
      updateUser(updatedUser);
    } catch (error) {
      console.error("Failed to update gender interest:", error);
      setSelectedGender(prev);
      setGenderError("Failed to save gender interest. Please try again.");
    } finally {
      setGenderSaving(false);
    }
  };

  const hasSizes = useMemo(
    () => Boolean(selectedSizes.shoe || selectedSizes.top || selectedSizes.bottom),
    [selectedSizes]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Preference" showBack />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loadingPreferences && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#111" />
            <Text style={styles.loadingText}>Loading your preferences...</Text>
          </View>
        )}
        {!user && !authLoading && (
          <Text style={styles.errorText}>
            We couldn&apos;t load your preferences. Please try again later.
          </Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gender</Text>
          {genderSaving && <Text style={styles.genderSavingText}>Saving...</Text>}
        </View>
        {genderError && <Text style={styles.errorText}>{genderError}</Text>}
        {["Female", "Male", "Non-binary / Prefer not to say"].map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.genderRow,
              selectedGender === opt && styles.genderRowSelected,
            ]}
            onPress={() => handleSelectGender(opt as GenderOption)}
          >
            <Text
              style={[
                styles.genderText,
                selectedGender === opt && styles.genderTextSelected,
              ]}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Sizes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sizes</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("AddSize", {
                selectedSizes,
              })
            }
          >
            <Text style={styles.editRed}>
              {hasSizes ? "Edit sizes" : "Add sizes"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sizeLabel}>Footwear</Text>
        <Text style={hasSizes && selectedSizes.shoe ? styles.sizeValue : styles.sizeEmpty}>
          {selectedSizes.shoe ?? "No footwear sizes picked"}
        </Text>
        <Text style={styles.sizeLabel}>Tops</Text>
        <Text style={hasSizes && selectedSizes.top ? styles.sizeValue : styles.sizeEmpty}>
          {selectedSizes.top ?? "No top sizes picked"}
        </Text>
        <Text style={styles.sizeLabel}>Bottoms</Text>
        <Text style={hasSizes && selectedSizes.bottom ? styles.sizeValue : styles.sizeEmpty}>
          {selectedSizes.bottom ?? "No bottom sizes picked"}
        </Text>

        {/* Styles */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Styles</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("AddStyle", {
                selectedStyles,
              })
            }
          >
            <Text style={styles.editRed}>
              {selectedStyles.length > 0 ? "Edit styles" : "Add styles"}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedStyles.length === 0 ? (
          <Text style={styles.sizeEmpty}>No styles picked</Text>
        ) : (
          <View style={styles.styleGrid}>
            {selectedStyles.map((styleName) => {
              const image = STYLE_IMAGE_MAP[styleName] ?? DEFAULT_STYLE_IMAGE;
              return (
                <View key={styleName} style={styles.styleCard}>
                  <Image
                    source={{ uri: image }}
                    style={styles.styleImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.styleName}>{styleName}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Brands */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Brands</Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("EditBrand", {
                selectedBrands,
              })
            }
          >
            <Text style={styles.editRed}>
              {selectedBrands.length > 0 ? "Edit brands" : "Add brands"}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedBrands.length === 0 ? (
          <Text style={styles.sizeEmpty}>No brands picked</Text>
        ) : (
          <View style={styles.brandWrap}>
            {selectedBrands.map((brand) => (
              <View key={brand} style={styles.brandChip}>
                <Text style={styles.brandText}>{brand}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  subHeading: { fontSize: 15, fontWeight: "600", marginTop: 8 },
  editRed: { color: "#F54B3D", fontWeight: "600" },
  errorText: { color: "#B91C1C", fontSize: 13, marginBottom: 8 },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  loadingText: { marginLeft: 8, color: "#555", fontSize: 13 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
  },
  genderRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
    paddingVertical: 12,
  },
  genderRowSelected: { backgroundColor: "#f9f9f9" },
  genderText: { fontSize: 15, color: "#111" },
  genderTextSelected: { fontWeight: "700", color: "#111" },
  sizeLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  sizeValue: {
    fontSize: 14,
    color: "#111",
    fontWeight: "600",
    marginBottom: 6,
  },
  sizeEmpty: { fontSize: 14, color: "#777", marginBottom: 6 },
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
    marginTop: 10,
  },
  styleCard: { width: "48%", alignItems: "center" },
  styleImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  styleName: {
    marginTop: 6,
    fontWeight: "700",
    color: "#111",
  },
  brandWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  brandChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandText: { color: "#fff", fontWeight: "600" },
  genderSavingText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
});
