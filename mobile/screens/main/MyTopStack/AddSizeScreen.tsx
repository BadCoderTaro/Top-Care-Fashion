import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Header from "../../../components/Header";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { MyTopStackParamList } from "./index";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { userService } from "../../../src/services/userService";
import { useAuth } from "../../../contexts/AuthContext";

type AddSizeNav = NativeStackNavigationProp<MyTopStackParamList, "AddSize">;
type AddSizeRoute = RouteProp<MyTopStackParamList, "AddSize">;

export default function AddSizeScreen() {
  const navigation = useNavigation<AddSizeNav>();
  const route = useRoute<AddSizeRoute>();
  const { updateUser } = useAuth();
  const initialSizes = useMemo(
    () => route.params?.selectedSizes ?? {},
    [route.params]
  );

  // Size states
  const [shoeSize, setShoeSize] = useState(initialSizes.shoe ?? "Select");
  const [topSize, setTopSize] = useState(initialSizes.top ?? "Select");
  const [bottomSize, setBottomSize] = useState(initialSizes.bottom ?? "Select");

  // Picker visibility
  const [showShoePicker, setShowShoePicker] = useState(false);
  const [showTopPicker, setShowTopPicker] = useState(false);
  const [showBottomPicker, setShowBottomPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SIZE_OPTIONS_CLOTHES = [
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
    "Free Size",
    "Other",
  ];

  const SIZE_OPTIONS_SHOES = [
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "Other",
  ];

  const OptionPicker = ({
    title,
    visible,
    options,
    value,
    onClose,
    onSelect,
  }: {
    title: string;
    visible: boolean;
    options: string[];
    value: string;
    onClose: () => void;
    onSelect: (value: string) => void;
  }) => (
    <Modal transparent animationType="slide" visible={visible}>
      <Pressable style={styles.sheetMask} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 360 }}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionRow,
                value === opt && {
                  backgroundColor: "#F3E8FF",
                  borderColor: "#5B21B6",
                },
              ]}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
            >
              <Text style={styles.optionText}>{opt}</Text>
              {value === opt ? <Text style={{ color: "#5B21B6" }}>✓</Text> : null}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
          <Text style={{ fontWeight: "600" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const buildPayload = () => ({
    shoe: shoeSize !== "Select" ? shoeSize : null,
    top: topSize !== "Select" ? topSize : null,
    bottom: bottomSize !== "Select" ? bottomSize : null,
  });

  const handleSave = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const updatedUser = await userService.updateProfile({
        preferredSizes: buildPayload(),
      });
      updateUser(updatedUser);
      navigation.goBack();
    } catch (e) {
      console.error("Failed to save sizes:", e);
      setError("Failed to save sizes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Sizes" showBack />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.helperText}>
          This will help you see items that are more relevant
        </Text>

        {/* Shoe size */}
        <Text style={styles.label}>Shoe Size</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowShoePicker(true)}
        >
          <Text style={styles.selectText}>{shoeSize}</Text>
        </TouchableOpacity>

        {/* Top size */}
        <Text style={styles.label}>Top Size</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowTopPicker(true)}
        >
          <Text style={styles.selectText}>{topSize}</Text>
        </TouchableOpacity>

        {/* Bottom size */}
        <Text style={styles.label}>Bottom Size</Text>
        <TouchableOpacity
          style={styles.selectBtn}
          onPress={() => setShowBottomPicker(true)}
        >
          <Text style={styles.selectText}>{bottomSize}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: saving ? "#ccc" : "#000",
            },
          ]}
          disabled={saving}
          onPress={handleSave}
        >
          {saving ? (
            <View style={styles.saveLoadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.saveLoadingText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Pickers */}
      <OptionPicker
        title="Select Shoe Size"
        visible={showShoePicker}
        options={SIZE_OPTIONS_SHOES}
        value={shoeSize}
        onClose={() => setShowShoePicker(false)}
        onSelect={setShoeSize}
      />
      <OptionPicker
        title="Select Top Size"
        visible={showTopPicker}
        options={SIZE_OPTIONS_CLOTHES}
        value={topSize}
        onClose={() => setShowTopPicker(false)}
        onSelect={setTopSize}
      />
      <OptionPicker
        title="Select Bottom Size"
        visible={showBottomPicker}
        options={SIZE_OPTIONS_CLOTHES}
        value={bottomSize}
        onClose={() => setShowBottomPicker(false)}
        onSelect={setBottomSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: { color: "#555", fontSize: 14, marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  selectBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  selectText: { fontSize: 15, color: "#111" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  saveBtn: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  saveLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveLoadingText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    color: "#B91C1C",
    marginBottom: 8,
    fontSize: 13,
  },
  sheetMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DDD",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: { fontSize: 15, color: "#111" },
  sheetCancel: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F6F6F6",
    alignItems: "center",
  },
});
