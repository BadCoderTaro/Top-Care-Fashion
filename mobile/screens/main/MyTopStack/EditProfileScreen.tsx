// EditProfileScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from "../../../components/Header";
import Icon from "../../../components/Icon";
import Avatar from "../../../components/Avatar";
import { DEFAULT_AVATAR } from "../../../constants/assetUrls";
import { userService, UpdateProfileRequest } from "../../../src/services/userService";
import { useAuth } from "../../../contexts/AuthContext";

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // 日期选择器状态
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dobDate, setDobDate] = useState<Date | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    location: user?.location || '',
    dob: user?.dob || '',
    gender: user?.gender || null,
  });

  // 当 formData.dob 发生变更时，同步 dobDate
  useEffect(() => {
    if (formData.dob) {
      const d = new Date(formData.dob);
      if (!isNaN(d.getTime())) {
        setDobDate(d);
      }
    } else {
      setDobDate(null);
    }
  }, [formData.dob]);
  
  // 头像状态
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url || null);
  const [avatarAsset, setAvatarAsset] = useState<any>(null);

  // 更新表单数据
  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (d: Date | null) => {
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // ✅ 检查当前权限状态（调试用）
  const checkPermissions = async () => {
    try {
      const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
      const mediaStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
      console.log("🔍 Current camera permission:", cameraStatus);
      console.log("🔍 Current media permission:", mediaStatus);
    } catch (error) {
      console.error("Error checking permissions:", error);
    }
  };

  // ✅ 组件加载时检查权限状态
  useEffect(() => {
    checkPermissions();
  }, []);

  // 选择头像
  const handleAvatarPress = async () => {
    try {
      // 请求权限
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access camera roll is required!");
        return;
      }

      // 显示选择选项
      Alert.alert(
        "Select Avatar",
        "Choose how you want to select your avatar",
        [
          { text: "Camera", onPress: () => openCamera() },
          { text: "Photo Library", onPress: () => openImagePicker() },
          { text: "Cancel", style: "cancel" }
        ]
      );
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Alert.alert("Error", "Failed to request permissions");
    }
  };

  // 打开相机
  const openCamera = async () => {
    try {
      // ✅ 主动请求相机权限
      console.log("🔍 Requesting camera permissions...");
      const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
      const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      console.log("🔍 Camera permission:", cameraPerm.status);
      console.log("🔍 Media permission:", mediaPerm.status);

      if (cameraPerm.status !== "granted" || mediaPerm.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please enable camera and photo library permissions in your device settings to take photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => {
              // 在iOS上可以打开设置页面
              console.log("User should manually open Settings");
            }}
          ]
        );
        return;
      }

      console.log("✅ Permissions granted, opening camera...");
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setAvatarAsset(asset);
        console.log("📸 Camera asset info:", asset);
      }
    } catch (error) {
      console.error("Error opening camera:", error);
      Alert.alert("Error", "Failed to open camera. Please check your camera permissions.");
    }
  };

  // 打开图片选择器
  const openImagePicker = async () => {
    try {
      // ✅ 主动请求相册权限
      console.log("🔍 Requesting media library permissions...");
      const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();

      console.log("🔍 Media permission:", mediaPerm.status);

      if (mediaPerm.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please enable photo library permissions in your device settings to select photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => {
              console.log("User should manually open Settings");
            }}
          ]
        );
        return;
      }

      console.log("✅ Permissions granted, opening image picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setAvatarAsset(asset);
        console.log("📸 Image picker asset info:", asset);
      }
    } catch (error) {
      console.error("Error opening image picker:", error);
      Alert.alert("Error", "Failed to open image picker. Please check your photo library permissions.");
    }
  };

  // 保存资料
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // 准备更新数据
      const updateData: UpdateProfileRequest = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone?.trim() || null,
        bio: formData.bio?.trim() || null,
        location: formData.location?.trim() || null,
        dob: formData.dob?.trim() || null,
        gender: formData.gender as "Male" | "Female" | null,
      };

      // 如果有新头像，先上传头像
      if (avatarUri && avatarUri !== user?.avatar_url) {
        try {
          console.log("📸 Uploading avatar with asset info:", avatarAsset);
          const uploadedAvatarUrl = await userService.uploadAvatar(avatarUri, avatarAsset);
          updateData.avatar_url = uploadedAvatarUrl;
        } catch (error) {
          console.error("Avatar upload failed:", error);
          Alert.alert("Warning", "Profile saved but avatar upload failed. Please try again.");
        }
      }

      // 更新用户资料
      console.log("📝 Updating profile with data:", JSON.stringify(updateData, null, 2));
      const updatedUser = await userService.updateProfile(updateData);
      console.log("✅ Profile update successful:", updatedUser);
      
      // 更新本地用户状态
      updateUser(updatedUser);
      
      Alert.alert("Success", "Profile updated successfully!");
      
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // 获取头像源
  const getAvatarSource = () => {
    if (avatarUri) {
      return { uri: avatarUri };
    }
    return DEFAULT_AVATAR;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Edit Profile" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* 头像 */}
        <View style={styles.avatarWrapper}>
          <Avatar source={getAvatarSource()} style={styles.avatar} isPremium={user?.isPremium} self />
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={handleAvatarPress}
            disabled={loading}
          >
            <Icon name="camera-outline" size={22} color="#FF4D4F" />
          </TouchableOpacity>
        </View>

        {/* 表单 */}
        <Text style={styles.label}>Username</Text>
        <TextInput 
          style={styles.input} 
          value={formData.username}
          onChangeText={(text) => updateFormData('username', text)}
          placeholder="Enter username"
          textAlignVertical="center"
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.bio}
          onChangeText={(text) => updateFormData('bio', text)}
          placeholder="Tell us about yourself"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput 
          style={styles.input} 
          value={formData.email}
          onChangeText={(text) => updateFormData('email', text)}
          placeholder="Enter email"
          keyboardType="email-address"
          autoCapitalize="none"
          textAlignVertical="center"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput 
          style={styles.input} 
          value={formData.phone}
          onChangeText={(text) => updateFormData('phone', text)}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          textAlignVertical="center"
        />

        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity
          style={[styles.input, styles.dateInput]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: formData.dob ? '#000' : '#999' }}>
            {formData.dob ? formData.dob : 'YYYY-MM-DD'}
          </Text>
        </TouchableOpacity>

        {/* 系统日期选择器 */}
        {showDatePicker && (
          <DateTimePicker
            value={dobDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(event: any, selectedDate?: Date) => {
              // Android: selectedDate undefined when dismissed
              const currentDate = selectedDate || dobDate || null;
              if (Platform.OS === 'android') {
                setShowDatePicker(false);
              }
              if (currentDate) {
                setDobDate(currentDate);
                const formatted = formatDate(currentDate);
                updateFormData('dob', formatted);
              }
            }}
          />
        )}

        <Text style={styles.label}>Country/Region</Text>
        <TextInput 
          style={styles.input} 
          value={formData.location}
          onChangeText={(text) => updateFormData('location', text)}
          placeholder="Enter location"
          textAlignVertical="center"
        />

        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


const AVATAR_SIZE = 120;

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, rowGap: 12 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 12 },

  avatarWrapper: { alignItems: "center", marginBottom: 16 },
  avatar: { 
    width: AVATAR_SIZE, 
    height: AVATAR_SIZE, 
    borderRadius: AVATAR_SIZE / 2, 
    backgroundColor: "#eee" 
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: (AVATAR_SIZE - 10) / 2, // 让按钮靠右下
    width: 36,
    height: 36,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  label: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 10,
    marginTop: 6,
    backgroundColor: "#fff",
    minHeight: 46,
  },
  dateInput: {
    height: 44,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  saveBtn: {
    backgroundColor: "#FF4D4F",
    padding: 14,
    borderRadius: 30,
    marginTop: 20,
    alignItems: "center",
  },
  saveBtnDisabled: {
    backgroundColor: "#ccc",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
