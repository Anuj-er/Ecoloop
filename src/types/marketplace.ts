// Define a common interface for marketplace items
export interface MarketplaceItem {
  _id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  quantity: number;
  materialType: string;
  condition: string;
  pinCode: string;
  seller: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    username?: string;
  };
  images: {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    aiAnalysis?: {
      label?: string;
      confidence?: number;
      status?: string;
    };
  }[];
  status: 'active' | 'sold' | 'inactive' | 'pending_review' | 'rejected';
  category?: string;
  tags?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: string;
  };
  createdAt: string;
  updatedAt: string;
  views: number;
  paymentPreferences?: {
    acceptsFiat: boolean;
    acceptsCrypto: boolean;
    cryptoAddress?: string;
    escrowEnabled?: boolean;
  };
}

export interface CartItem {
  item: MarketplaceItem;
  quantity: number;
}
