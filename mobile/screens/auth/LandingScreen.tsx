import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LOGO_FULL_COLOR } from "../../constants/assetUrls";

type RootStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Login: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Landing">;

export default function LandingScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoWrapper}>
        <LOGO_FULL_COLOR width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />
      </View>

      {/* 标语 */}
      <Text style={styles.tagline}>
        Circular Fashion, Infinite Possibilities
      </Text>
      <Text style={styles.tagline}>
        Circular Wardrobe, Smarter Style
      </Text>

      {/* 按钮 */}
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.replace("Login")}
      >
        <Text style={styles.btnText}>Get started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 160,
    height: 120,
    marginBottom: 24,
  },
  tagline: {
    fontSize: 16,
    color: "#111",
    textAlign: "center",
    marginBottom: 6,
  },
  btn: {
    marginTop: 40,
    backgroundColor: "#000",
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});
