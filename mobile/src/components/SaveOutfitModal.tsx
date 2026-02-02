import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from "../../components/Icon";

interface SaveOutfitModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (outfitName: string) => Promise<void>;
  isLoading?: boolean;
  defaultName?: string; // ✅ 自动填入的默认名称
}

export default function SaveOutfitModal({
  visible,
  onClose,
  onSave,
  isLoading = false,
  defaultName,
}: SaveOutfitModalProps) {
  const [outfitName, setOutfitName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      // ✅ 当 modal 打开时，如果有 defaultName，自动填入
      if (defaultName) {
        setOutfitName(defaultName);
      } else {
        setOutfitName('');
      }
      setIsSubmitting(false);
    } else {
      setOutfitName('');
      setIsSubmitting(false);
    }
  }, [visible, defaultName]);

  const handleSave = async () => {
    if (!outfitName.trim()) {
      Alert.alert('Empty Name', 'Please enter an outfit name');
      return;
    }

    if (outfitName.trim().length > 100) {
      Alert.alert('Name Too Long', 'Outfit name must be less than 100 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(outfitName.trim());
      setOutfitName('');
      onClose();
    } catch (error) {
      console.error('Error saving outfit:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save outfit'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isLoading) {
      setOutfitName('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Background overlay */}
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={handleClose}
          />

          {/* Modal content */}
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isSubmitting || isLoading}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#111" />
              </TouchableOpacity>

              <Text style={styles.title}>Save Outfit</Text>

              <View style={{ width: 40 }} />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Content */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Outfit Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Casual Friday, Date Night, Gym Style..."
                placeholderTextColor="#999"
                value={outfitName}
                onChangeText={setOutfitName}
                maxLength={100}
                editable={!isSubmitting && !isLoading}
                selectionColor="#111"
                textAlignVertical="center"
              />
              <Text style={styles.charCount}>
                {outfitName.length}/100
              </Text>
            </View>

            {/* Info text */}
            <View style={styles.infoContainer}>
              <Icon name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.infoText}>
                Give your outfit a name so you can easily find it later
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  (isSubmitting || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleClose}
                disabled={isSubmitting || isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  (!outfitName.trim() || isSubmitting || isLoading) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={!outfitName.trim() || isSubmitting || isLoading}
              >
                {isSubmitting || isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Outfit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    flex: 1,
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#eee',
    marginVertical: 12,
  },
  inputContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 0 : 12,
    fontSize: 15,
    color: '#111',
    backgroundColor: '#fff',
    marginBottom: 6,
    minHeight: 46,
    includeFontPadding: false,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 16,
    columnGap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    columnGap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#111',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});