import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type PlanOptionCardProps = {
  prefix: string;
  highlight: string;
  note?: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

const PlanOptionCard: React.FC<PlanOptionCardProps> = ({
  prefix,
  highlight,
  note,
  selected = false,
  onPress,
  disabled,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[styles.card, selected && styles.cardSelected, disabled && styles.cardDisabled]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.textCol}>
        <Text style={styles.label} numberOfLines={2}>
          {prefix}
          <Text style={styles.highlight}>{highlight}</Text>
        </Text>
        {note ? <Text style={styles.note} numberOfLines={2}>{note}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  cardSelected: {
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  cardDisabled: {
    opacity: 0.6,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  radioSelected: {
    borderColor: "#FFFFFF",
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FFFFFF",
  },
  label: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
    includeFontPadding: false,
  },
  highlight: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  textCol: {
    flex: 1,
  },
  note: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    lineHeight: 18,
    includeFontPadding: false,
  },
});

export default PlanOptionCard;