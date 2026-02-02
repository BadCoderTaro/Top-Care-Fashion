import { apiClient } from './api';

export interface PaymentMethod {
  id: number;
  type: string;
  label: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePaymentMethodRequest {
  type: 'card' | 'wallet';
  label: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

export interface UpdatePaymentMethodRequest {
  paymentMethodId: number;
  type?: 'card' | 'wallet';
  label?: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

class PaymentMethodsService {
  /**
   * 获取用户所有支付方式
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await apiClient.get<{ paymentMethods: PaymentMethod[] }>(
        '/api/payment-methods'
      );
      return response.data?.paymentMethods ?? [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      throw error;
    }
  }

  /**
   * 获取默认支付方式
   */
  async getDefaultPaymentMethod(): Promise<PaymentMethod | null> {
    const methods = await this.getPaymentMethods();
    return methods.find(m => m.isDefault) ?? methods[0] ?? null;
  }

  /**
   * 创建新支付方式
   */
  async createPaymentMethod(data: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    try {
      console.log('📝 Creating payment method:', data);
      const response = await apiClient.post<{ paymentMethod: PaymentMethod }>(
        '/api/payment-methods',
        data
      );
      console.log('✅ Payment method created:', response.data?.paymentMethod);
      return response.data?.paymentMethod as PaymentMethod;
    } catch (error) {
      console.error('❌ Error creating payment method:', error);
      throw error;
    }
  }

  /**
   * 更新支付方式
   */
  async updatePaymentMethod(data: UpdatePaymentMethodRequest): Promise<PaymentMethod> {
    try {
      console.log('📝 Updating payment method:', data);
      const response = await apiClient.put<{ paymentMethod: PaymentMethod }>(
        '/api/payment-methods',
        data
      );
      console.log('✅ Payment method updated:', response.data?.paymentMethod);
      return response.data?.paymentMethod as PaymentMethod;
    } catch (error) {
      console.error('❌ Error updating payment method:', error);
      throw error;
    }
  }

  /**
   * 设置默认支付方式
   */
  async setDefaultPaymentMethod(paymentMethodId: number): Promise<PaymentMethod> {
    return this.updatePaymentMethod({
      paymentMethodId,
      isDefault: true,
    });
  }

  /**
   * 删除支付方式
   */
  async deletePaymentMethod(paymentMethodId: number): Promise<void> {
    try {
      console.log('🗑️ Deleting payment method:', paymentMethodId);
      await apiClient.delete(
        `/api/payment-methods?paymentMethodId=${paymentMethodId}`
      );
      console.log('✅ Payment method deleted');
    } catch (error) {
      console.error('❌ Error deleting payment method:', error);
      throw error;
    }
  }
}

export const paymentMethodsService = new PaymentMethodsService();
