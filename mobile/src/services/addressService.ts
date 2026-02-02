import { apiClient } from './api';
import { API_CONFIG } from '../config/api';

export interface ShippingAddress {
  id: number;
  type?: string | null;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressRequest {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface UpdateAddressRequest {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isDefault?: boolean;
}

class AddressService {
  private basePath = '/api/addresses';

  async getAddresses(): Promise<ShippingAddress[]> {
    try {
      const response = await apiClient.get<{ addresses: ShippingAddress[] }>(this.basePath);
      return response.data?.addresses || [];
    } catch (error) {
      console.error('Error fetching addresses:', error);
      throw error;
    }
  }

  async getDefaultAddress(): Promise<ShippingAddress | null> {
    try {
      const addresses = await this.getAddresses();
      return addresses.find(addr => addr.isDefault) || null;
    } catch (error) {
      console.error('Error fetching default address:', error);
      return null;
    }
  }

  async createAddress(addressData: CreateAddressRequest): Promise<ShippingAddress> {
    try {
      const response = await apiClient.post<{ address: ShippingAddress }>(
        this.basePath,
        addressData
      );
      if (!response.data?.address) {
        throw new Error('Failed to create address');
      }
      return response.data.address;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  async updateAddress(
    addressId: number,
    addressData: UpdateAddressRequest
  ): Promise<ShippingAddress> {
    try {
      const response = await apiClient.put<{ address: ShippingAddress }>(
        this.basePath,
        { addressId, ...addressData }
      );
      if (!response.data?.address) {
        throw new Error('Failed to update address');
      }
      return response.data.address;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  async deleteAddress(addressId: number): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}?addressId=${addressId}`);
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  async setDefaultAddress(addressId: number): Promise<ShippingAddress> {
    try {
      const response = await apiClient.put<{ address: ShippingAddress }>(
        this.basePath,
        { addressId, isDefault: true }
      );
      if (!response.data?.address) {
        throw new Error('Failed to set default address');
      }
      return response.data.address;
    } catch (error) {
      console.error('Error setting default address:', error);
      throw error;
    }
  }
}

export const addressService = new AddressService();

