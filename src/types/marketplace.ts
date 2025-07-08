// Define a common interface for marketplace items
export interface MarketplaceItem {
  _id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  materialType: string;
  condition: string;
  quantity: number;
  pinCode: string;
  images: Array<{
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    format?: string;
    aiAnalysis?: {
      label: string;
      confidence: number;
      status: string;
      qualityScore?: number;
    };
  }>;
  seller: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    userType: string;
    bio?: string;
    location?: string;
    organization?: {
      name?: string;
      website?: string;
      industry?: string;
      size?: string;
    };
  };
  tags: string[];
  category: string;
  views: number;
  interestedBuyers: Array<{
    buyer: {
      _id: string;
      username: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    message: string;
    contactInfo?: {
      phone?: string;
      email?: string;
    };
    createdAt: string;
  }>;
  status: string;
  createdAt: string;
  timeAgo?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: string;
  };
  reviewStatus?: string;
  availableFrom?: string;
  availableUntil?: string;
  moderationNotes?: string;
  rejectionReason?: string;
}
