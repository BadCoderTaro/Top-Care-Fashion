import type { BagItem, ListingItem, PaymentMethod, ShippingAddress } from "../types/shop";

export type PurchaseOrderStatus =
  | "InProgress"
  | "Shipped"
  | "Delivered"
  | "Received"
  | "Completed"
  | "Cancelled";
export type SoldOrderStatus = "ToShip" | "Shipped" | "Delivered" | "Cancelled" | "Completed" | "Reviewed";

export type PurchaseOrder = {
  id: string;
  product: ListingItem;
  seller: { name: string; avatar: string };
  status: PurchaseOrderStatus;
  address: ShippingAddress & { detail: string };
  payment: {
    method: string;
    amount: number;
    date: string;
    transactionId: string;
  };
};

export type SoldOrder = {
  id: string;
  product: ListingItem;
  buyer: { name: string; avatar: string };
  status: SoldOrderStatus;
};

const avatar = (id: number) => `https://i.pravatar.cc/100?img=${id}`;

export const MOCK_LISTINGS: ListingItem[] = [
  {
    id: "listing-green-dress",
    title: "Green Midi Dress",
    category: "Tops",
    price: 20,
    description:
      "Relaxed-fit midi dress in emerald green with a subtle pleated skirt and adjustable straps for a flattering fit.",
    brand: "TOP Studio",
    size: "S",
    condition: "Very good",
    material: "Polyester blend",
    tags: ["Elegant", "Minimal", "Casual"],
    images: [
      "https://cdn.shopify.com/s/files/1/0281/2071/1254/products/191219hm74370_1800x1800.jpg?v=1607871412",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
    ],
    seller: {
      name: "sellerA",
      avatar: avatar(11),
      rating: 4.8,
      sales: 248,
    },
  },
  {
    id: "listing-skinny-jeans",
    title: "American Eagle Super Stretch Jeans",
    category: "Bottoms",
    price: 14.5,
    description:
      "High-rise skinny jeans in a soft, super-stretch denim that keeps its shape all day.",
    brand: "American Eagle",
    size: "6",
    condition: "Like new",
    material: "Cotton & Elastane",
    images: [
      "https://tse4.mm.bing.net/th/id/OIP.TC_mOkLd6sQzsLiE_uSloQHaJ3?w=600&h=799&rs=1&pid=ImgDetMain&o=7&rm=3",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    ],
    seller: {
      name: "seller111",
      avatar: avatar(12),
      rating: 4.6,
      sales: 192,
    },
  },
  {
    id: "listing-nerdy-hoodie",
    title: "Purple Nerdy Hoodie",
    category: "Tops",
    price: 15,
    description:
      "Oversized hoodie from Nerdy with brushed fleece interior and embroidered chest logo.",
    brand: "Nerdy",
    size: "M",
    condition: "Good",
    material: "Cotton",
    images: [
      "https://assets.atmos-tokyo.com/items/L/pnef21ke11-ppl-1.jpg",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
    ],
    seller: {
      name: "seller222",
      avatar: avatar(13),
      rating: 4.5,
      sales: 143,
    },
  },
  {
    id: "listing-red-jacket",
    title: "Vintage Red Jacket",
    category: "Tops",
    price: 30,
    description:
      "Statement red wool jacket with structured shoulders and snap-button closure.",
    brand: "RetroFinds",
    size: "M",
    condition: "Good",
    material: "Wool",
    images: [
      "https://th.bing.com/th/id/R.d54043fa984e94c86b926d96ed3eb6a1?rik=l0s2kAsoEoM6Og&pid=ImgRaw&r=0",
    ],
    seller: {
      name: "sellerRetro",
      avatar: avatar(21),
      rating: 4.7,
      sales: 98,
    },
  },
  {
    id: "listing-casual-hoodie",
    title: "Casual Beige Hoodie",
    category: "Tops",
    price: 25,
    description:
      "Neutral-toned hoodie with kangaroo pocket and ribbed cuffs, perfect for everyday wear.",
    brand: "Everyday",
    size: "L",
    condition: "Very good",
    material: "Cotton",
    images: [
      "https://i5.walmartimages.com/asr/7aed82da-69af-46b8-854e-5c22d45a4df3.e7011d0ebdea1d9fabb68417c789ae16.jpeg",
    ],
    seller: {
      name: "sellerCozy",
      avatar: avatar(22),
      rating: 4.4,
      sales: 112,
    },
  },
  {
    id: "listing-satin-slip-dress",
    title: "Rose Satin Slip Dress",
    category: "Tops",
    price: 28,
    description:
      "Bias-cut satin slip dress with delicate shoulder straps and a soft drape that moves with you.",
    brand: "Evening Muse",
    size: "S",
    condition: "Like new",
    material: "Polyester satin",
    images: [
      "https://images.unsplash.com/photo-1525171254930-643fc658b64e?auto=format&fit=crop&w=640&q=80",
      "https://tse3.mm.bing.net/th/id/OIP.mbv8-A49xgbIH4hkKjhCBwHaJc?rs=1&pid=ImgDetMain&o=7&rm=3",
    ],
    seller: {
      name: "eveningMuse",
      avatar: avatar(32),
      rating: 4.9,
      sales: 76,
    },
  },
  {
    id: "listing-y2k-football-top",
    title: "Y2K Football Crop Top",
    category: "Tops",
    price: 18,
    description:
      "Cropped jersey-style tee with varsity stripes and a bold front graphic for a nostalgic streetwear look.",
    brand: "RetroWave",
    size: "S",
    condition: "Good",
    material: "Cotton",
    tags: ["Y2K", "Streetwear", "Vintage"],
    images: [
      "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=640&q=80",
      "https://y2kdream.com/cdn/shop/files/Y2K-Football-Crop-Top-6.webp?v=1723621579&width=750",
    ],
    seller: {
      name: "retroWave",
      avatar: avatar(33),
      rating: 4.6,
      sales: 54,
    },
  },
  {
    id: "listing-pleated-tennis-skirt",
    title: "Pleated Tennis Skirt",
    category: "Bottoms",
    price: 22,
    description:
      "High-waisted pleated skirt with built-in shorts and contrast piping inspired by classic tennis silhouettes.",
    brand: "Court Club",
    size: "M",
    condition: "Excellent",
    material: "Polyester",
    tags: ["Sporty", "Minimal", "Casual"],
    images: [
      "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=640&q=80",
      "https://tse3.mm.bing.net/th/id/OIP.81YGmCDrRsgih3_rHL6qxgHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
    ],
    seller: {
      name: "courtClub",
      avatar: avatar(34),
      rating: 4.5,
      sales: 89,
    },
  },
  {
    id: "listing-wide-leg-trousers",
    title: "Wide-Leg Tailored Trousers",
    category: "Bottoms",
    price: 26,
    description:
      "High-waisted trousers with soft pleats and a relaxed wide leg for effortless office-to-evening styling.",
    brand: "City Line",
    size: "M",
    condition: "Very good",
    material: "Polyester blend",
    images: [
      "https://images.unsplash.com/photo-1562157873-818bc0726f92?auto=format&fit=crop&w=640&q=80",
      "https://tse3.mm.bing.net/th/id/OIP.VLA_zUUPCS-z2IemiQ43PgHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
    ],
    seller: {
      name: "cityLine",
      avatar: avatar(35),
      rating: 4.3,
      sales: 61,
    },
  },
  {
    id: "listing-platform-sneakers",
    title: "Platform Canvas Sneakers",
    category: "Footwear",
    price: 32,
    description:
      "Chunky platform sneakers in breathable canvas with a contrast gum sole and padded collar.",
    brand: "StepUp",
    size: "38",
    condition: "Like new",
    material: "Canvas",
    images: [
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=640&q=80",
    ],
    seller: {
      name: "stepUpStore",
      avatar: avatar(36),
      rating: 4.7,
      sales: 134,
    },
  },
  {
    id: "listing-chunky-ankle-boots",
    title: "Chunky Ankle Boots",
    category: "Footwear",
    price: 38,
    description:
      "Matte leather ankle boots with elastic side panels and a lug sole for rainy-day grip.",
    brand: "Downtown",
    size: "39",
    condition: "Good",
    material: "Leather",
    images: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1516763296043-76d3f3157948?auto=format&fit=crop&w=640&q=80",
    ],
    seller: {
      name: "downtownFinds",
      avatar: avatar(37),
      rating: 4.4,
      sales: 102,
    },
  },
  {
    id: "listing-leather-crossbody",
    title: "Leather Crossbody Bag",
    category: "Accessories",
    price: 24,
    description:
      "Structured crossbody bag with adjustable strap, interior zip pocket, and matte gold hardware.",
    brand: "Street Atelier",
    size: "One size",
    condition: "Very good",
    material: "Leather",
    images: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=640&q=80",
      "https://tse1.mm.bing.net/th/id/OIP._PU2jbpd_bGX-M3WoLm6IAHaLe?rs=1&pid=ImgDetMain&o=7&rm=3",
    ],
    seller: {
      name: "atelierStreet",
      avatar: avatar(38),
      rating: 4.8,
      sales: 147,
    },
  },
  {
    id: "listing-gold-hoop-earrings",
    title: "Gold Hoop Earrings",
    category: "Accessories",
    price: 16,
    description:
      "Lightweight gold-tone hoops with a click-closure backing and mirrored finish.",
    brand: "Luna Jewelry",
    size: "One size",
    condition: "Like new",
    material: "Gold plated brass",
    images: [
      "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=640&q=80",
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=640&q=80",
    ],
    seller: {
      name: "lunaJewelry",
      avatar: avatar(39),
      rating: 4.9,
      sales: 205,
    },
  },
  {
    id: "listing-hello-kitty-jeans",
    title: "Hello Kitty Baggy Jeans",
    category: "Bottoms",
    price: 25,
    description:
      "Playful baggy jeans featuring an all-over Hello Kitty print and relaxed straight-leg silhouette.",
    brand: "Sanrio",
    size: "M",
    condition: "Very good",
    material: "Denim",
    images: [
      "https://tse3.mm.bing.net/th/id/OIP.VLA_zUUPCS-z2IemiQ43PgHaHa?rs=1&pid=ImgDetMain&o=7&rm=3",
    ],
    seller: {
      name: "seller333",
      avatar: avatar(14),
      rating: 4.5,
      sales: 87,
    },
  },
];

export const DEFAULT_BAG_ITEMS: BagItem[] = [
  { item: MOCK_LISTINGS[0], quantity: 1 },
  { item: MOCK_LISTINGS[1], quantity: 1 },
];

export const DEFAULT_SHIPPING_ADDRESS: ShippingAddress = {
  name: "Mia Chen",
  phone: "+65 9123 4567",
  line1: "101 West Coast Vale",
  line2: "Block 101 #17-05",
  city: "Singapore",
  state: "Singapore",
  postalCode: "128101",
  country: "Singapore",
};

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = {
  label: "Visa Debit",
  brand: "Visa",
  last4: "1123",
};

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "1",
    product: MOCK_LISTINGS[0],
    seller: { name: "sellerA", avatar: avatar(11) },
    status: "InProgress",
    address: {
      ...DEFAULT_SHIPPING_ADDRESS,
      detail: "Singapore, Parc Riviera",
    },
    payment: {
      method: "PayPal",
      amount: 20,
      date: "2025-09-20 18:32",
      transactionId: "TXN0001",
    },
  },
  {
    id: "2",
    product: MOCK_LISTINGS[1],
    seller: { name: "seller111", avatar: avatar(12) },
    status: "Completed",
    address: {
      ...DEFAULT_SHIPPING_ADDRESS,
      detail: "101 W Coast Vale, Block101 17-05, Parc Riviera, Singapore",
    },
    payment: {
      method: "PayPal",
      amount: 14.5,
      date: "2025-09-20 18:32",
      transactionId: "TXN123456789",
    },
  },
  {
    id: "3",
    product: MOCK_LISTINGS[2],
    seller: { name: "seller222", avatar: avatar(13) },
    status: "Cancelled",
    address: {
      ...DEFAULT_SHIPPING_ADDRESS,
      detail: "Singapore, Clementi Ave",
    },
    payment: {
      method: "PayPal",
      amount: 15,
      date: "2025-09-22 15:10",
      transactionId: "TXN999888777",
    },
  },
  {
    id: "4",
    product:
      MOCK_LISTINGS.find((item) => item.id === "listing-hello-kitty-jeans")!,
    seller: { name: "seller333", avatar: avatar(14) },
    status: "Delivered",
    address: {
      ...DEFAULT_SHIPPING_ADDRESS,
      detail: "Singapore, Bukit Batok Ave 3",
    },
    payment: {
      method: "PayPal",
      amount: 25,
      date: "2025-09-23 14:15",
      transactionId: "TXNHELLOKITTY001",
    },
  },
];

export const SOLD_ORDERS: SoldOrder[] = [
  {
    id: "1",
    product: MOCK_LISTINGS[3],
    buyer: { name: "buyer001", avatar: avatar(31) },
    status: "ToShip",
  },
  {
    id: "2",
    product: MOCK_LISTINGS[4],
    buyer: { name: "buyer002", avatar: avatar(32) },
    status: "Reviewed",
  },
  {
    id: "3",
    product: MOCK_LISTINGS[5],
    buyer: { name: "buyer003", avatar: avatar(33) },
    status: "Completed",
  },
];

export const PURCHASE_GRID_ITEMS = PURCHASE_ORDERS.map(
  ({ id, product, status }) => ({
    id,
    image: product.images[0],
    status,
  })
);

export const SOLD_GRID_ITEMS = SOLD_ORDERS.map(({ id, product, status }) => ({
  id,
  image: product.images[0],
  status,
}));
