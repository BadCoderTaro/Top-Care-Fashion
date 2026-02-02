import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ActionSheetIOS,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Header from '../../../components/Header';
import Icon from '../../../components/Icon';
import PaymentSelector from '../../../components/PaymentSelector';
import { 
  paymentMethodsService, 
  addressService,
  type PaymentMethod,
  type ShippingAddress,
  type CreateAddressRequest,
} from '../../../src/services';
import type { MyTopStackParamList } from './index';

type ManagePaymentsScreenNavigationProp = NativeStackNavigationProp<
  MyTopStackParamList,
  'ManagePayments'
>;

export default function ManagePaymentsScreen() {
  const navigation = useNavigation<ManagePaymentsScreenNavigationProp>();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // Address states
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [selectedAddressForAction, setSelectedAddressForAction] = useState<ShippingAddress | null>(null);
  
  // Address form state
  const [addressForm, setAddressForm] = useState<CreateAddressRequest>({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    isDefault: false,
  });

  // Load addresses on mount
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const data = await addressService.getAddresses();
      setAddresses(data);
    } catch (error) {
      console.error('Failed to load addresses:', error);
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      isDefault: false,
    });
    setShowAddressModal(true);
  };

  const handleEditAddress = (address: ShippingAddress) => {
    setEditingAddress(address);
    setAddressForm({
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async () => {
    // Validate required fields
    if (!addressForm.name || !addressForm.phone || !addressForm.line1 || !addressForm.city || 
        !addressForm.state || !addressForm.country || !addressForm.postalCode) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingAddress) {
        // Update existing address
        await addressService.updateAddress(editingAddress.id, addressForm);
      } else {
        // Create new address
        await addressService.createAddress(addressForm);
      }
      
      setShowAddressModal(false);
      loadAddresses();
      Alert.alert('Success', `Address ${editingAddress ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error('Failed to save address:', error);
      Alert.alert('Error', `Failed to ${editingAddress ? 'update' : 'add'} address`);
    }
  };

  const handleAddressPress = (address: ShippingAddress) => {
    setSelectedAddressForAction(address);
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit address', 'Remove address'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleEditAddress(address);
          } else if (buttonIndex === 2) {
            handleDeleteAddress(address);
          }
        }
      );
    } else {
      // For Android, show custom modal
      Alert.alert(
        'Manage Address',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Edit address', onPress: () => handleEditAddress(address) },
          { 
            text: 'Remove address', 
            onPress: () => handleDeleteAddress(address),
            style: 'destructive'
          },
        ]
      );
    }
  };

  const handleDeleteAddress = async (address: ShippingAddress) => {
    try {
      await addressService.deleteAddress(address.id);
      loadAddresses();
      Alert.alert('Success', 'Address removed successfully');
    } catch (error) {
      console.error('Failed to delete address:', error);
      Alert.alert('Error', 'Failed to remove address');
    }
  };

  const defaultAddress = addresses.find(addr => addr.isDefault);
  const otherAddresses = addresses.filter(addr => !addr.isDefault);

  const formatAddress = (address: ShippingAddress) => {
    const parts = [address.line1];
    if (address.line2) parts[0] += ` ${address.line2}`;
    parts.push(`${address.city}, ${address.postalCode}, ${address.country.toUpperCase()}`);
    return parts.join(' ');
  };

  return (
    <View style={styles.container}>
      <Header title="Payment and Address" showBack />
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Payment Method Section */}
        <Text style={styles.description}>
          Manage your saved payment methods for quick and secure checkout.
        </Text>

        <PaymentSelector
          selectedPaymentMethodId={selectedPaymentMethod?.id ?? null}
          onSelect={setSelectedPaymentMethod}
        />

        {selectedPaymentMethod && (
          <View style={styles.selectedInfo}>
            <Icon name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.selectedText}>
              {selectedPaymentMethod.label} is selected
            </Text>
          </View>
        )}

        {/* Address Section */}
        <View style={styles.divider} />

        <View style={styles.addressHeader}>
          <Text style={styles.addressTitle}>Shipping Address</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddAddress}
            accessible
            accessibilityRole="button"
          >
            <Icon name="add-circle-outline" size={20} color="#2A7BF4" />
            <Text style={styles.addButtonText}>Add New Address</Text>
          </TouchableOpacity>
        </View>

        {loadingAddresses ? (
          <ActivityIndicator size="small" color="#2A7BF4" style={styles.loader} />
        ) : addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="location-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No addresses saved</Text>
            <Text style={styles.emptySubtext}>Add an address to get started</Text>
          </View>
        ) : (
          <>
            {defaultAddress && (
              <TouchableOpacity
                style={styles.addressCard}
                onPress={() => handleAddressPress(defaultAddress)}
                accessible
                accessibilityRole="button"
              >
                <View style={styles.addressLeft}>
                  <Icon name="location" size={24} color="#666" />
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressName}>{defaultAddress.name}</Text>
                    <Text style={styles.addressText}>{formatAddress(defaultAddress)}</Text>
                    <Text style={styles.addressPhone}>{defaultAddress.phone}</Text>
                  </View>
                </View>

                <View style={styles.addressRight}>
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteAddress(defaultAddress)}
                    style={styles.deleteButton}
                    accessible
                    accessibilityRole="button"
                  >
                    <Icon name="trash-outline" size={18} color="#999" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}

            {otherAddresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={styles.addressCard}
                onPress={() => handleAddressPress(address)}
                accessible
                accessibilityRole="button"
              >
                <View style={styles.addressLeft}>
                  <Icon name="location" size={24} color="#666" />
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressName}>{address.name}</Text>
                    <Text style={styles.addressText}>{formatAddress(address)}</Text>
                    <Text style={styles.addressPhone}>{address.phone}</Text>
                  </View>
                </View>

                <View style={styles.addressRight}>
                  <TouchableOpacity
                    onPress={() => handleDeleteAddress(address)}
                    style={styles.deleteButton}
                    accessible
                    accessibilityRole="button"
                  >
                    <Icon name="trash-outline" size={18} color="#999" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Address Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAddress ? 'Edit' : 'Add'} Address</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={addressForm.name}
              onChangeText={(text) => setAddressForm({ ...addressForm, name: text })}
              placeholder="Enter your full name"
              textAlignVertical="center"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={addressForm.phone}
              onChangeText={(text) => setAddressForm({ ...addressForm, phone: text })}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
              textAlignVertical="center"
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Street Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.line1}
                  onChangeText={(text) => setAddressForm({ ...addressForm, line1: text })}
                  placeholder="Street Address"
                  textAlignVertical="center"
                />
              </View>
              <View style={styles.smallInput}>
                <Text style={styles.inputLabel}>Apt/Suite</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.line2}
                  onChangeText={(text) => setAddressForm({ ...addressForm, line2: text })}
                  placeholder=""
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.city}
                  onChangeText={(text) => setAddressForm({ ...addressForm, city: text })}
                  placeholder="City"
                  textAlignVertical="center"
                />
              </View>
              <View style={styles.smallInput}>
                <Text style={styles.inputLabel}>State/Prov.</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.state}
                  onChangeText={(text) => setAddressForm({ ...addressForm, state: text })}
                  placeholder="AL"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.inputLabel}>Country</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.country}
                  onChangeText={(text) => setAddressForm({ ...addressForm, country: text })}
                  placeholder="Country"
                  textAlignVertical="center"
                />
              </View>
              <View style={styles.smallInput}>
                <Text style={styles.inputLabel}>Postal Code</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.postalCode}
                  onChangeText={(text) => setAddressForm({ ...addressForm, postalCode: text })}
                  placeholder="12345"
                  keyboardType="numeric"
                  textAlignVertical="center"
                />
              </View>
            </View>

            <View style={styles.checkboxRow}>
              <Text style={styles.checkboxLabel}>
                Make this my Default Return Address for shipping
              </Text>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAddressForm({ ...addressForm, isDefault: !addressForm.isDefault })}
              >
                {addressForm.isDefault && (
                  <Icon name="checkmark" size={20} color="#0066FF" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAddress}>
              <Text style={styles.saveButtonText}>SAVE</Text>
            </TouchableOpacity>
          </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  selectedInfo: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    gap: 8,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 24,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  addressTitle: {
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
  loader: {
    marginVertical: 20,
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
  addressCard: {
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
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  addressPhone: {
    marginTop: 2,
    fontSize: 12,
    color: '#999',
  },
  addressRight: {
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
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  deleteButton: {
    padding: 4,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 0 : 12,
    minHeight: 46,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
    includeFontPadding: false,
  },
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    lineHeight: 16,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  smallInput: {
    width: 100,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginRight: 12,
  },
  checkbox: {
    width: 50,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#0066FF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
