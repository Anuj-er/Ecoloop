import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Eye, Clock, User, Building, ShoppingCart, ArrowRight } from "lucide-react";
import { MarketplaceItem } from "@/types/marketplace";
import { isAmountAboveMinimum, getMinimumAmount } from "@/utils/paymentUtils";
import { useNavigate } from "react-router-dom";

// Using shared interface

interface Props {
  item: MarketplaceItem;
}

export const MarketplaceItemCard = ({ item }: Props) => {
  const navigate = useNavigate();
  const formatPrice = (price: number, currency: string) => {
    if (currency === 'INR') {
      return `₹${price.toLocaleString('en-IN')}`;
    }
    return `${currency} ${price}`;
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-100 text-green-800';
      case 'like-new': return 'bg-blue-100 text-blue-800';
      case 'good': return 'bg-yellow-100 text-yellow-800';
      case 'fair': return 'bg-orange-100 text-orange-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden"
      onClick={() => navigate(`/product/${item._id}`)}
    >
      {/* Image */}
      <div className="relative w-full h-48 bg-gray-200">
        {item.images && item.images.length > 0 ? (
          <img
            src={item.images[0].url}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span>No Image</span>
          </div>
        )}
        
        {/* AI Analysis Badge */}
        {item.images[0]?.aiAnalysis && (
          <Badge 
            className={`absolute top-2 right-2 text-xs ${
              item.images[0].aiAnalysis.status === 'usable' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            AI: {Math.round(item.images[0].aiAnalysis.confidence)}%
          </Badge>
        )}

        {/* Material Type Badge */}
        <Badge className="absolute top-2 left-2 bg-blue-100 text-blue-800 text-xs">
          {item.materialType.charAt(0).toUpperCase() + item.materialType.slice(1)}
        </Badge>

        {/* Condition Badge */}
        <Badge className={`absolute bottom-2 right-2 text-xs ${getConditionColor(item.condition)}`}>
          {item.condition.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </Badge>
      </div>

      <CardContent className="p-4">
        {/* Title and Price */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg truncate flex-1 mr-2">{item.title}</h3>
          <span className="font-bold text-green-600 text-lg whitespace-nowrap">
            {formatPrice(item.price, item.currency)}
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* Quantity and Views */}
        <div className="flex justify-between items-center mb-3 text-sm text-gray-500">
          <span>Qty: {item.quantity}</span>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{item.views}</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 mb-3 text-sm text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>{item.pinCode}</span>
        </div>

        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="w-6 h-6">
            <AvatarImage src={item.seller.avatar} />
            <AvatarFallback className="text-xs">
              {item.seller.firstName?.[0]}{item.seller.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            {item.seller.userType === 'organization' ? (
              <Building className="w-3 h-3" />
            ) : (
              <User className="w-3 h-3" />
            )}
            <span className="truncate">
              {item.seller.firstName} {item.seller.lastName}
            </span>
          </div>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Time and Interest */}
        <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatTimeAgo(item.createdAt)}</span>
          </div>
          {item.interestedBuyers && item.interestedBuyers.length > 0 && (
            <span>{item.interestedBuyers.length} interested</span>
          )}
        </div>

        {/* View Product Button */}
        <>
          {!isAmountAboveMinimum(item.price, item.currency) && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mb-2">
              ⚠️ Price below minimum payment amount ({getMinimumAmount(item.currency).symbol}{getMinimumAmount(item.currency).amount}). Contact seller for offline purchase.
            </div>
          )}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/product/${item._id}`);
            }}
            className="w-full"
            size="sm"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            View Product
          </Button>
        </>
      </CardContent>
    </Card>
  );
};
