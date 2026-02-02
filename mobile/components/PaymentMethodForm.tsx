import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ViewStyle, Platform } from 'react-native';

export type PaymentBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Other';

export type PaymentFormValue = {
  label: string; // e.g., "My Visa Card"
  paymentMethod: PaymentBrand | '';
  cardNumber: string; // last 4 digits
  expiryMonth: string; // MM
  expiryYear: string; // YYYY or YY
  cvv: string; // 3 digits
};

export type PaymentMethodFormProps = {
  value: PaymentFormValue;
  onChange: (next: PaymentFormValue) => void;
  style?: ViewStyle;
  showNote?: boolean;
  showLabel?: boolean;
};

const brands: PaymentBrand[] = ['Visa', 'Mastercard', 'Amex', 'Discover', 'Other'];

export default function PaymentMethodForm({ 
  value, 
  onChange, 
  style, 
  showNote = true,
  showLabel = true,
}: PaymentMethodFormProps) {
  const set = (patch: Partial<PaymentFormValue>) => onChange({ ...value, ...patch });

  // Auto-format expiry: MM/YY
  const handleExpiryChange = (text: string) => {
    // Remove non-digits
    const digits = text.replace(/\D/g, '');
    if (digits.length <= 2) {
      set({ expiryMonth: digits, expiryYear: '' });
    } else {
      const mm = digits.slice(0, 2);
      const yy = digits.slice(2, 4);
      set({ expiryMonth: mm, expiryYear: yy });
    }
  };

  const expiryDisplay = value.expiryMonth + (value.expiryYear ? `/${value.expiryYear}` : '');

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <>
          <Text style={styles.inputLabel}>Card Nickname (Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={value.label}
            onChangeText={(text) => set({ label: text })}
            placeholder="e.g., My Visa Card"
            textAlignVertical="center"
          />
        </>
      )}

      <Text style={styles.inputLabel}>Card Brand</Text>
      <View style={styles.paymentOptions}>
        {brands.map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.paymentOption, value.paymentMethod === b && styles.paymentOptionSelected]}
            onPress={() => set({ paymentMethod: b })}
            accessible
            accessibilityRole="button"
          >
            <Text style={[styles.paymentOptionText, value.paymentMethod === b && styles.paymentOptionTextSelected]}>
              {b}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.inputLabel}>Card Number (Last 4 digits)</Text>
      <TextInput
        style={styles.textInput}
        value={value.cardNumber}
        onChangeText={(text) => set({ cardNumber: text.replace(/\D/g, '').slice(0, 4) })}
        placeholder="1234"
        keyboardType="numeric"
        maxLength={4}
        textAlignVertical="center"
      />

      <Text style={styles.inputLabel}>Expiry Date (MM/YY)</Text>
      <TextInput
        style={styles.textInput}
        value={expiryDisplay}
        onChangeText={handleExpiryChange}
        placeholder="MM/YY"
        keyboardType="numeric"
        maxLength={5}
        textAlignVertical="center"
      />

      <Text style={styles.inputLabel}>CVV (for verification only)</Text>
      <TextInput
        style={styles.textInput}
        value={value.cvv}
        onChangeText={(text) => set({ cvv: text.replace(/\D/g, '').slice(0, 3) })}
        placeholder="123"
        keyboardType="numeric"
        maxLength={3}
        secureTextEntry
        textAlignVertical="center"
      />

      {showNote && (
        <View style={styles.paymentNote}>
          <Text style={styles.paymentNoteText}>
            🔒 This is a demo payment system. Card details are mocked and not processed.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 0 : 12,
    minHeight: 46,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    includeFontPadding: false,
  },
  paymentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  paymentOptionSelected: {
    borderColor: '#2A7BF4',
    backgroundColor: '#E6F0FF',
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  paymentOptionTextSelected: {
    color: '#2A7BF4',
  },
  paymentNote: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  paymentNoteText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 16,
  },
});
