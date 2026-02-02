import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import Header from "../../../components/Header"; // ✅ 你刚刚重构的 Header
import Icon from "../../../components/Icon";
import type { IconProps } from "../../../components/Icon"; // Add this import if IconProps is exported
import type { MyTopStackParamList } from "./index";
import { useNavigation as useRootNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp as RootStackNav } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../../App";
import { useAuth } from "../../../contexts/AuthContext";

export default function SettingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MyTopStackParamList>>();
  const rootNavigation =
    useRootNavigation<RootStackNav<RootStackParamList>>();
  const { logout } = useAuth();

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="Settings" showBack />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionBox}>
          <SettingItem icon="person-outline" label="Edit profile" onPress={() => { console.log('Edit profile pressed'); navigation.navigate("EditProfile"); }} />
          <SettingItem icon="card-outline" label="Payment and Address" onPress={() => navigation.navigate("ManagePayments")} />
          <SettingItem icon="shield-outline" label="Security" onPress={() => { console.log('Security pressed - about to navigate'); navigation.navigate("Security"); setTimeout(() => console.log('After navigate call - current route should change if registered'), 50); }} />
          <SettingItem
            icon="notifications-outline"
            label="Notifications"
            onPress={() => navigation.navigate("Notifications")}
          />
          <SettingItem
            icon="lock-closed-outline"
            label="Privacy"
            onPress={() => navigation.navigate("Privacy")}
          />
        </View>

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support & About</Text>
        <View style={styles.sectionBox}>
          <SettingItem
            icon="card-outline"
            label="My Premium"
            onPress={() => rootNavigation.navigate("Premium")}
          />
            <SettingItem
            icon="flash-outline"
            label="My Boost Listings"
            onPress={() => navigation.navigate("MyBoostListings")}
          />
          <SettingItem
           icon="heart-outline"
           label="My Preference"
           onPress={() => navigation.navigate("MyPreference")}
          />

          <SettingItem
            icon="help-circle-outline"
            label="Help & Support"
            onPress={() => navigation.navigate("HelpSupport")}
          />
        </View>

        {/* Actions Section */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.sectionBox}>
          <SettingItem
            icon="chatbox-ellipses-outline"
            label="Leave feedback"
            onPress={() => navigation.navigate("Feedback")}
          />
          <SettingItem
            icon="flag-outline"
            label="My Flags"
            onPress={() => navigation.navigate("Flag")}
          />
          <SettingItem
            icon="log-out-outline"
            label="Log out"
            onPress={async () => {
              console.log("Logout pressed - clearing tokens");
              await logout();
              console.log("Logout complete - navigation reset triggered");
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const SettingItem = ({
  icon,
  label,
  onPress,
}: {
  icon: IconProps["name"];
  label: string;
  onPress?: () => void;
}) => {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Icon name={icon} size={22} color="#444" style={{ marginRight: 12 }} />
      <Text style={styles.itemText}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    rowGap: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 0.005,
  },
  sectionBox: {
    backgroundColor: "#f5f5f7", // ✅ 浅灰背景
    borderRadius: 12,
    paddingVertical: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  itemText: {
    fontSize: 16,
    color: "#000",
  },
});
