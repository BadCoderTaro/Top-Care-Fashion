import React from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "./Icon";

export type FilterOptionValue = string | number;

export type FilterOption = {
  label: string;
  value: FilterOptionValue;
};

export type FilterSection = {
  key: string;
  title: string;
  options: FilterOption[];
  selectedValue: FilterOptionValue;
  onSelect: (value: FilterOptionValue) => void;
  type?: "chip"; // Default is chip
};

export type RangeFilterSection = {
  key: string;
  title: string;
  type: "range";
  minValue: number;
  maxValue: number;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
};

type AllFilterSection = FilterSection | RangeFilterSection;

type FilterModalProps = {
  visible: boolean;
  title?: string;
  sections: AllFilterSection[];
  onClose: () => void;
  onApply: () => void;
  onClear?: () => void;
  applyButtonLabel?: string;
};

function FilterModal({
  visible,
  title = "Filters",
  sections,
  onClose,
  onApply,
  onClear,
  applyButtonLabel = "Apply Filters",
}: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const isRangeSection = (section: AllFilterSection): section is RangeFilterSection => {
    return section.type === "range";
  };
  
  // 计算底部安全区域高度，确保内容不被遮挡
  const bottomSafeAreaHeight = Math.max(insets.bottom, 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose} accessibilityRole="button">
                <Icon name="close" size={24} color="#111" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{title}</Text>
              {onClear ? (
                <TouchableOpacity onPress={onClear} accessibilityRole="button">
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 48 }} />
              )}
            </View>

            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              alwaysBounceVertical={false}
            >
              {sections && sections.length > 0 ? (
                sections.map((section) => {
                  // Handle range section
                  if (isRangeSection(section)) {
                    // Display empty string if value is 0 or invalid, otherwise display the value
                    const minValue = section.minValue && section.minValue > 0 ? String(section.minValue) : '';
                    const maxValue = section.maxValue && section.maxValue > 0 ? String(section.maxValue) : '';
                    
                    return (
                      <View key={section.key} style={{ marginBottom: 16 }}>
                        <Text style={styles.filterSectionTitle}>{section.title}</Text>
                        <View style={styles.rangeContainer}>
                          <TextInput
                            style={[styles.rangeInput, { marginRight: 12 }]}
                            placeholder={section.minPlaceholder || "Min"}
                            placeholderTextColor="#999"
                            value={minValue}
                            onChangeText={section.onMinChange}
                            keyboardType="decimal-pad"
                            textAlignVertical="center"
                          />
                          <Text style={styles.rangeSeparator}>-</Text>
                          <TextInput
                            style={[styles.rangeInput, { marginLeft: 12 }]}
                            placeholder={section.maxPlaceholder || "Max"}
                            placeholderTextColor="#999"
                            value={maxValue}
                            onChangeText={section.onMaxChange}
                            keyboardType="decimal-pad"
                            textAlignVertical="center"
                          />
                        </View>
                      </View>
                    );
                  }

                  // Handle regular filter section with options
                  const filterSection = section as FilterSection;
                  
                  // Safety check: ensure options array exists and has items
                  if (!filterSection.options || filterSection.options.length === 0) {
                    return null;
                  }

                  return (
                    <View key={section.key} style={{ marginBottom: 0}}>
                      <Text style={styles.filterSectionTitle}>{filterSection.title}</Text>
                      <View style={styles.filterOptions}>
                        {filterSection.options.map((option, index) => {
                          const isActive = filterSection.selectedValue === option.value;
                          return (
                            <TouchableOpacity
                              key={`${section.key}-${option.value}-${index}`}
                              style={[
                                styles.filterChip,
                                isActive && styles.filterChipActive,
                                { margin: 5 },
                              ]}
                              onPress={() => filterSection.onSelect(option.value)}
                              accessibilityRole="button"
                              accessibilityLabel={option.label}
                            >
                              <Text
                                style={[
                                  styles.filterChipText,
                                  isActive && styles.filterChipTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#999', fontSize: 14 }}>No filter options available</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={[styles.footerContentWrapper, { paddingBottom: bottomSafeAreaHeight }]}>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={onApply}
                  accessibilityRole="button"
                >
                  <Text style={styles.applyButtonText}>{applyButtonLabel}</Text>
                </TouchableOpacity>
              </View>
              {/* Android safe area fill - ensures white background covers transparent safe area */}
              {Platform.OS === 'android' && bottomSafeAreaHeight > 0 && (
                <View style={[styles.androidSafeAreaFill, { height: bottomSafeAreaHeight }]} />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default FilterModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%", // Increased height to show more content
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e5e5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  clearText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  modalContent: {
    flex: 1, // Take all available space between header and footer
  },
  modalContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 20 // Reduced bottom padding
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginTop: 16,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  rangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#f9f9f9",
    minHeight: 44,
  },
  rangeSeparator: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  modalFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#fff", // Ensure background covers safe area on Android
    position: "relative",
  },
  footerContentWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    // paddingBottom will be set dynamically based on safe area
  },
  applyButton: {
    backgroundColor: "#111",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  androidSafeAreaFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff", // Fill safe area with white background on Android to prevent transparency
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
