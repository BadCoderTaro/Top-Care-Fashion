import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  Pressable,
  StatusBar,
  BackHandler,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import Icon from "../../components/Icon";
import { userService } from "../../src/services/userService";
import DateTimePicker from "@react-native-community/datetimepicker";

type OnboardingNav = NativeStackNavigationProp<RootStackParamList, "Main">;

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

// Style options with images
const STYLE_OPTIONS = [
  {
    name: "Streetwear",
    img: "https://tse1.mm.bing.net/th/id/OIP.VzaAIQ7keKtETkQY3XiR7QHaLG?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3",
  },
  {
    name: "90s/Y2K",
    img: "https://image-cdn.hypb.st/https://hypebeast.com/image/2023/05/diesel-resort-2024-collection-008.jpg?q=75&w=800&cbr=1&fit=max",
  },
  {
    name: "Vintage",
    img: "https://cdn.mos.cms.futurecdn.net/whowhatwear/posts/291781/vintage-inspired-fashion-brands-291781-1614100119475-image-768-80.jpg",
  },
  {
    name: "Sportswear",
    img: "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/734a943f-8d74-4841-be22-e6076816ea44/sportswear-tech-fleece-windrunner-mens-full-zip-hoodie-rznlBf.png",
  },
  {
    name: "Independent Brands",
    img: "https://tse3.mm.bing.net/th/id/OIP.zfm0Md_lr-4tMhh7v1W6vAHaKC?cb=12&w=756&h=1024&rs=1&pid=ImgDetMain&o=7&rm=3",
  },
  {
    name: "Luxury Designer",
    img: "https://assets.vogue.com/photos/633c1b5fd3985aae1bd1bd97/master/w_2560%2Cc_limit/00004-chanel-spring-2023-ready-to-wear-credit-gorunway.jpg",
  },
];

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

const SIZE_OPTIONS_ACCESSORIES = [
  "N/A",
  "One Size",
  "Small",
  "Medium", 
  "Large",
  "Other",
];

const SIZE_OPTIONS_BAGS = [
  "N/A",
  "Small",
  "Medium",
  "Large",
  "Extra Large",
  "Other",
];

export default function OnboardingPreferenceScreen() {
  const navigation = useNavigation<OnboardingNav>();
  const [currentStep, setCurrentStep] = useState(0);

  // User preferences state
  const [selectedGender, setSelectedGender] = useState<string>("Prefer not to say");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [shoeSize, setShoeSize] = useState<string | null>(null);
  const [topSize, setTopSize] = useState<string | null>(null);
  const [bottomSize, setBottomSize] = useState<string | null>(null);

  // Modal states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempBirthday, setTempBirthday] = useState<Date>(new Date(2000, 0, 1));
  const [showShoePicker, setShowShoePicker] = useState(false);
  const [showTopPicker, setShowTopPicker] = useState(false);
  const [showBottomPicker, setShowBottomPicker] = useState(false);

  const totalSteps = 3;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 禁用 Android 返回键
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // 如果在第一步，阻止返回
        if (currentStep === 0) {
          return true; // 阻止默认行为
        }
        // 否则返回上一步
        handleBack();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [currentStep]);

  const handleFinish = async () => {
    // 将 Onboarding 偏好保存到后端（当前后端仅支持 gender 字段；size/style 可在后续扩展）
    const genderValue: "Female" | "Male" | null =
      selectedGender === "Female"
        ? "Female"
        : selectedGender === "Male"
        ? "Male"
        : null;

    // 格式化生日为 ISO 字符串
    const dobValue = birthday ? birthday.toISOString().split('T')[0] : null;

    try {
      console.log("Saving preferences:", {
        gender: selectedGender,
        birthday: dobValue,
        sizes: { shoe: shoeSize, top: topSize, bottom: bottomSize },
        styles: selectedStyles,
      });
      await userService.updateProfile({
        gender: genderValue,
        dob: dobValue,
        preferredStyles: selectedStyles.length ? selectedStyles : [],
        preferredSizes: {
          shoe: shoeSize ?? null,
          top: topSize ?? null,
          bottom: bottomSize ?? null,
        },
      });
    } catch (e) {
      console.warn('Failed to persist preferences, proceeding anyway:', e);
    }
    // 使用 replace 导航，防止用户返回到引导页面
    navigation.replace("Main");
  };

  const toggleStyle = (name: string) => {
    if (selectedStyles.includes(name)) {
      setSelectedStyles(selectedStyles.filter((n) => n !== name));
    } else if (selectedStyles.length < 3) {
      setSelectedStyles([...selectedStyles, name]);
    }
  };

  const canProceedCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return selectedGender !== null && birthday !== null;
      case 1:
        return selectedStyles.length > 0;
      case 2:
        // All three sizes must be filled
        return shoeSize !== null && topSize !== null && bottomSize !== null;
      default:
        return false;
    }
  };

  // Size Picker Modal Component
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
    value: string | null;
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

  // Step 1: Gender & Birthday
  const renderGenderStep = () => {
    const formatDate = (date: Date | null) => {
      if (!date) return "Select your birthday";
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Tell us about yourself</Text>
        <Text style={styles.stepSubtitle}>
          This helps us show you the right recommendations
        </Text>

        <View style={styles.genderContainer}>
          <Text style={styles.sectionLabel}>Gender</Text>
          {["Female", "Male", "Non-binary / Prefer not to say"].map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.genderCard,
                selectedGender === option && styles.genderCardSelected,
              ]}
              onPress={() => setSelectedGender(option)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.radioOuter,
                  selectedGender === option && styles.radioOuterSelected,
                ]}
              >
                {selectedGender === option && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[
                  styles.genderText,
                  selectedGender === option && styles.genderTextSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Birthday</Text>
          <TouchableOpacity
            style={styles.sizeButton}
            onPress={() => {
              setTempBirthday(birthday || new Date(2000, 0, 1));
              setShowDatePicker(true);
            }}
          >
            <Text style={[styles.sizeButtonText, birthday && styles.sizeButtonTextSelected]}>
              {formatDate(birthday)}
            </Text>
            <Icon name="calendar-outline" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Step 2: Style Preferences
  const renderStyleStep = () => {
    const remaining = 3 - selectedStyles.length;
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Pick your favorite styles</Text>
        <Text style={styles.stepSubtitle}>
          Choose up to 3 styles you love (select at least 1)
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.stylesGrid}
        >
          {STYLE_OPTIONS.map((style) => {
            const isSelected = selectedStyles.includes(style.name);
            return (
              <TouchableOpacity
                key={style.name}
                style={styles.styleCard}
                onPress={() => toggleStyle(style.name)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: style.img }}
                  style={[styles.styleImage, isSelected && { opacity: 0.5 }]}
                />
                {isSelected && (
                  <View style={styles.styleCheckOverlay}>
                    <Icon name="checkmark-circle" size={40} color="#000" />
                  </View>
                )}
                <Text style={styles.styleName}>{style.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedStyles.length > 0 && (
          <Text style={styles.tipText}>
            {remaining > 0
              ? `You can pick ${remaining} more style${remaining > 1 ? "s" : ""}`
              : "Perfect! You're all set"}
          </Text>
        )}
      </View>
    );
  };

  // Step 3: Size Preferences
  const renderSizeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What are your sizes?</Text>
      <Text style={styles.stepSubtitle}>
        Please provide all three sizes to help us recommend items that fit you
      </Text>

      <View style={styles.sizesContainer}>
        <Text style={styles.sizeLabel}>Shoe Size</Text>
        <TouchableOpacity
          style={styles.sizeButton}
          onPress={() => setShowShoePicker(true)}
        >
          <Text style={[styles.sizeButtonText, shoeSize && styles.sizeButtonTextSelected]}>
            {shoeSize || "Select your shoe size"}
          </Text>
          <Icon name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>

        <Text style={styles.sizeLabel}>Top Size</Text>
        <TouchableOpacity
          style={styles.sizeButton}
          onPress={() => setShowTopPicker(true)}
        >
          <Text style={[styles.sizeButtonText, topSize && styles.sizeButtonTextSelected]}>
            {topSize || "Select your top size"}
          </Text>
          <Icon name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>

        <Text style={styles.sizeLabel}>Bottom Size</Text>
        <TouchableOpacity
          style={styles.sizeButton}
          onPress={() => setShowBottomPicker(true)}
        >
          <Text style={[styles.sizeButtonText, bottomSize && styles.sizeButtonTextSelected]}>
            {bottomSize || "Select your bottom size"}
          </Text>
          <Icon name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header with progress */}
      <View style={styles.header}>
        {currentStep > 0 ? (
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        
        <View style={styles.progressContainer}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index <= currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <View style={{ width: 24 }} />
      </View>

      {/* Step Content */}
      <View style={{ flex: 1 }}>
        {currentStep === 0 && renderGenderStep()}
        {currentStep === 1 && renderStyleStep()}
        {currentStep === 2 && renderSizeStep()}
      </View>

      {/* Footer with navigation buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceedCurrentStep() && styles.nextButtonDisabled,
          ]}
          onPress={currentStep === totalSteps - 1 ? handleFinish : handleNext}
          disabled={!canProceedCurrentStep()}
        >
          <Text style={styles.nextButtonText}>
            {currentStep === totalSteps - 1 ? "Get Started" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <Modal transparent animationType="slide" visible={showDatePicker}>
          <Pressable style={styles.sheetMask} onPress={() => setShowDatePicker(false)} />
          <View style={styles.datePickerSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Your Birthday</Text>

            <DateTimePicker
              value={tempBirthday}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setTempBirthday(selectedDate);
                }
              }}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              style={{ height: 200 }}
            />

            <View style={styles.datePickerButtons}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  setBirthday(tempBirthday);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Size Pickers */}
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e6e6e6",
  },
  progressContainer: {
    flexDirection: "row",
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e6e6e6",
  },
  progressDotActive: {
    backgroundColor: "#111",
    width: 24,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
    lineHeight: 22,
  },
  // Gender Step Styles
  genderContainer: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 12,
  },
  genderCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e6e6e6",
    backgroundColor: "#fff",
  },
  genderCardSelected: {
    borderColor: "#111",
    backgroundColor: "#f9f9f9",
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: "#111",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#111",
  },
  genderText: {
    fontSize: 17,
    color: "#111",
    fontWeight: "500",
  },
  genderTextSelected: {
    fontWeight: "700",
  },
  // Style Step Styles
  stylesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 80,
  },
  styleCard: {
    width: CARD_WIDTH,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  styleImage: {
    width: "100%",
    height: CARD_WIDTH * 1.2,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  styleCheckOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  styleName: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
  },
  tipText: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  // Size Step Styles
  sizesContainer: {
    gap: 16,
  },
  sizeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  sizeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e6e6e6",
    backgroundColor: "#fff",
  },
  sizeButtonText: {
    fontSize: 15,
    color: "#999",
  },
  sizeButtonTextSelected: {
    color: "#111",
    fontWeight: "600",
  },
  // Footer Styles
  footer: {
    padding: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e6e6e6",
    backgroundColor: "#fff",
  },
  nextButton: {
    backgroundColor: "#111",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#ccc",
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  // Modal Styles
  sheetMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#DDD",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#111",
  },
  optionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  optionText: {
    fontSize: 15,
    color: "#111",
  },
  sheetCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F6F6F6",
    alignItems: "center",
  },
  // Date Picker Styles
  datePickerSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  datePickerButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  datePickerCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F6F6F6",
    alignItems: "center",
  },
  datePickerConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#111",
    alignItems: "center",
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

