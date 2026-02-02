import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import PaymentMethodForm, { type PaymentFormValue } from './PaymentMethodForm';
import { paymentMethodsService, type PaymentMethod } from '../src/services';

export type PaymentSelectorProps = {
  selectedPaymentMethodId?: number | null;
  onSelect: (method: PaymentMethod | null) => void;
  style?: any;
};

/**
 * PaymentSelector - 显示已保存的支付方式 + 添加新卡
 * 
 * 功能：
 * 1. 列出所有已保存的支付方式（默认优先）
 * 2. 点击选中某个支付方式
 * 3. 添加新支付方式（弹窗表单）
 * 4. 删除支付方式
 * 5. 设为默认支付方式
 */
export default function PaymentSelector({
  selectedPaymentMethodId,
  onSelect,
  style,
}: PaymentSelectorProps) {
  const insets = useSafeAreaInsets();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newCardForm, setNewCardForm] = useState<PaymentFormValue>({
    label: '',
    paymentMethod: 'Visa',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  // Load payment methods on mount
  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const data = await paymentMethodsService.getPaymentMethods();
      setMethods(data);
      // Auto-select default if none selected
      if (!selectedPaymentMethodId && data.length > 0) {
        const defaultMethod = data.find(m => m.isDefault) ?? data[0];
        onSelect(defaultMethod);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    if (!newCardForm.paymentMethod || !newCardForm.cardNumber) {
      Alert.alert('Missing Info', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const expiryMonth = parseInt(newCardForm.expiryMonth, 10);
      const expiryYear = parseInt(newCardForm.expiryYear, 10);
      
      if (isNaN(expiryMonth) || isNaN(expiryYear)) {
        Alert.alert('Invalid Expiry', 'Please enter a valid expiry date');
        return;
      }

      const created = await paymentMethodsService.createPaymentMethod({
        type: 'card',
        label: newCardForm.label || `${newCardForm.paymentMethod} •••• ${newCardForm.cardNumber}`,
        brand: newCardForm.paymentMethod,
        last4: newCardForm.cardNumber,
        expiryMonth,
        expiryYear,
        isDefault: methods.length === 0, // First card is default
      });

      await loadPaymentMethods();
      onSelect(created);
      setShowAddModal(false);
      // Reset form
      setNewCardForm({
        label: '',
        paymentMethod: 'Visa',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
      });
    } catch (error) {
      console.error('Failed to add payment method:', error);
      Alert.alert('Error', 'Failed to add card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (methodId: number) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await paymentMethodsService.deletePaymentMethod(methodId);
              await loadPaymentMethods();
              if (selectedPaymentMethodId === methodId) {
                onSelect(null);
              }
            } catch (error) {
              console.error('Failed to delete payment method:', error);
              Alert.alert('Error', 'Failed to delete payment method');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (methodId: number) => {
    try {
      await paymentMethodsService.setDefaultPaymentMethod(methodId);
      await loadPaymentMethods();
      Alert.alert('Success', 'Default payment method updated');
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      Alert.alert('Error', 'Failed to set default payment method');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#2A7BF4" />
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Method</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          accessible
          accessibilityRole="button"
        >
          <Icon name="add-circle-outline" size={20} color="#2A7BF4" />
          <Text style={styles.addButtonText}>Add New Card</Text>
        </TouchableOpacity>
      </View>

      {methods.length === 0 && (
        <View style={styles.emptyState}>
          <Icon name="card-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No payment methods saved</Text>
          <Text style={styles.emptySubtext}>Add a card to get started</Text>
        </View>
      )}

      {methods.map((method) => {
        const isSelected = method.id === selectedPaymentMethodId;
        return (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodCard, isSelected && styles.methodCardSelected]}
            onPress={() => onSelect(method)}
            accessible
            accessibilityRole="button"
          >
            <View style={styles.methodLeft}>
              <Icon name="card" size={24} color={isSelected ? '#2A7BF4' : '#666'} />
              <View style={styles.methodInfo}>
                <Text style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}>
                  {method.label}
                </Text>
                <Text style={styles.methodDetails}>
                  {method.brand} •••• {method.last4}
                  {method.expiryMonth && method.expiryYear && (
                    <Text style={styles.methodExpiry}>
                      {' '}• Exp {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                    </Text>
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.methodRight}>
              {method.isDefault ? (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => handleSetDefault(method.id)}
                  style={styles.setDefaultButton}
                  accessible
                  accessibilityRole="button"
                >
                  <Text style={styles.setDefaultText}>Set Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handleDelete(method.id)}
                style={styles.deleteButton}
                accessible
                accessibilityRole="button"
              >
                <Icon name="trash-outline" size={18} color="#999" />
              </TouchableOpacity>
            </View>

            {isSelected && (
              <View style={styles.checkIcon}>
                <Icon name="checkmark-circle" size={22} color="#2A7BF4" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Add New Card Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
          edges={['top', 'bottom']}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Card</Text>
            <TouchableOpacity
              onPress={handleAddCard}
              disabled={saving}
            >
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <PaymentMethodForm
              value={newCardForm}
              onChange={setNewCardForm}
              showLabel
              showNote
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E6F0FF',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A7BF4',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#999',
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  methodCardSelected: {
    borderColor: '#2A7BF4',
    backgroundColor: '#F0F7FF',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  methodLabelSelected: {
    color: '#2A7BF4',
  },
  methodDetails: {
    marginTop: 2,
    fontSize: 13,
    color: '#666',
  },
  methodExpiry: {
    fontSize: 12,
    color: '#999',
  },
  methodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  setDefaultButton: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
  },
  setDefaultText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1976D2',
  },
  deleteButton: {
    padding: 4,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  modalSave: {
    fontSize: 16,
    color: '#2A7BF4',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
});
