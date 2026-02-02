export type ListingCategory = "Accessories" | "Bottoms" | "Footwear" | "Outerwear" | "Tops";

// Gender enum type
export type Gender = "Men" | "Women" | "Unisex";

export type ListingItem = {
  id: string;
  title: string;
  price: number;
  description: string;
  brand: string | null;
  size: string | null;
  condition: string | null;
  material?: string | null;
  gender?: Gender | null;
  tags?: string[]; // 添加用户自定义标签
  images: string[];
  category?: ListingCategory | null;
  shippingOption?: string | null;
  shippingFee?: number | null;
  location?: string | null;
  likesCount?: number;
  createdAt?: string;
  updatedAt?: string;
  listed?: boolean;
  sold?: boolean;
  quantity?: number | null; // current stock quantity returned by backend
  availableQuantity?: number; // 🔥 当前库存数量（stock/quantity）
  seller: {
    id?: number;
    name: string;
    avatar: string;
    rating: number;
    sales: number;
    isPremium?: boolean;
  };
  // 🔥 添加订单相关字段（仅对sold商品）
  orderStatus?: string | null;
  orderId?: number | null;
  orderQuantity?: number | null; // 🔥 订单购买数量
  buyerId?: number | null;
  sellerId?: number | null;
  conversationId?: string | null;
  is_boosted?: boolean;
  boost_weight?: number | null;
};

export type BagItem = {
  item: ListingItem;
  quantity: number;
};

export type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type PaymentMethod = {
  label: string;
  last4: string;
  brand: string;
};
