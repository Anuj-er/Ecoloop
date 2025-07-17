import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Leaf, Award, Share2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router-dom';

interface CO2SavingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  co2Saved: number;
  materialType: string;
  quantity: number;
  totalCO2Saved?: number;
}

export const CO2SavingsPopup: React.FC<CO2SavingsPopupProps> = ({
  isOpen,
  onClose,
  co2Saved,
  materialType,
  quantity,
  totalCO2Saved = 0
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();

  const handleManualClose = () => {
    onClose();
    // Redirect to purchase history after manual close
    setTimeout(() => {
      navigate('/purchases');
    }, 300); // Small delay to allow modal close animation
  };

  const handleAutoClose = () => {
    onClose();
    // Auto close without redirect - just close the popup
  };

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Auto close after 15 seconds if user doesn't interact (no redirect)
      const timer = setTimeout(() => {
        handleAutoClose();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const getBadgeText = (co2Amount: number) => {
    if (co2Amount >= 50) return "🌟 Amazing Impact!";
    if (co2Amount >= 20) return "💪 Great Work!";
    if (co2Amount >= 10) return "🌱 Good Choice!";
    return "♻️ Every Bit Counts!";
  };

  const getEquivalentFacts = (co2Amount: number) => {
    const facts = [];
    const plasticBottles = Math.round(co2Amount / 0.08); // ~0.08kg CO2 per plastic bottle
    const treesEquivalent = Math.round(co2Amount * 0.12); // Rough calculation
    const carMiles = Math.round(co2Amount * 2.3); // ~0.43kg CO2 per mile
    
    if (plasticBottles > 0) {
      facts.push(`${plasticBottles} plastic bottle${plasticBottles > 1 ? 's' : ''} saved`);
    }
    if (carMiles > 0) {
      facts.push(`${carMiles} mile${carMiles > 1 ? 's' : ''} of car emissions avoided`);
    }
    if (treesEquivalent > 0) {
      facts.push(`Equivalent to ${treesEquivalent} tree${treesEquivalent > 1 ? 's' : ''} planted`);
    }
    
    return facts.slice(0, 2); // Show max 2 facts
  };

  const handleShare = () => {
    const message = `Just saved ${co2Saved.toFixed(1)}kg CO₂ by purchasing recycled ${materialType} on EcoLoop! 🌍♻️ #EcoLoop #SustainableLiving #CircularEconomy`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My CO₂ Savings on EcoLoop',
        text: message,
        url: window.location.origin
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(message).then(() => {
        alert('Message copied to clipboard!');
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-2xl"
                  initial={{ 
                    x: Math.random() * window.innerWidth,
                    y: -50,
                    rotate: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    y: window.innerHeight + 50,
                    rotate: 360,
                    opacity: 0
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 1
                  }}
                >
                  {['🌿', '♻️', '🌍', '🌱', '💚'][Math.floor(Math.random() * 5)]}
                </motion.div>
              ))}
            </div>
          )}

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 relative overflow-hidden">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualClose}
                className="absolute top-2 right-2 z-10 hover:bg-white/50"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-8 text-6xl">🌍</div>
                <div className="absolute bottom-4 left-8 text-4xl">♻️</div>
                <div className="absolute top-1/3 left-1/4 text-3xl">🌱</div>
              </div>

              <CardHeader className="text-center pb-4 relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="mx-auto mb-3"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                    <Leaf className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
                <CardTitle className="text-2xl font-bold text-green-800">
                  🎉 Payment Confirmed!
                </CardTitle>
                <p className="text-green-700">You just made a positive impact!</p>
              </CardHeader>

              <CardContent className="text-center space-y-6 relative z-10">
                {/* CO2 Savings */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-2"
                >
                  <div className="text-4xl font-bold text-green-700">
                    {co2Saved.toFixed(1)} kg
                  </div>
                  <div className="text-lg text-green-600 font-semibold">
                    CO₂ Saved from this purchase
                  </div>
                  <div className="text-sm text-gray-600">
                    {quantity}kg of {materialType.charAt(0).toUpperCase() + materialType.slice(1)} recycled
                  </div>
                </motion.div>

                {/* Badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                >
                  <Badge 
                    variant="secondary" 
                    className="bg-green-600 text-white text-base px-4 py-2 hover:bg-green-700"
                  >
                    {getBadgeText(co2Saved)}
                  </Badge>
                </motion.div>

                {/* Environmental Impact Facts */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="bg-white/80 rounded-lg p-4 space-y-2"
                >
                  <h4 className="font-semibold text-green-800 text-sm">Environmental Impact:</h4>
                  {getEquivalentFacts(co2Saved).map((fact, index) => (
                    <div key={index} className="text-sm text-gray-700 flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {fact}
                    </div>
                  ))}
                </motion.div>

                {/* Total Impact */}
                {totalCO2Saved > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.0 }}
                    className="text-sm text-green-700 border-t pt-3"
                  >
                    <strong>Your Total Impact: {totalCO2Saved.toFixed(1)} kg CO₂ saved</strong>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="flex gap-3 justify-center pt-2"
                >
                  <Button 
                    onClick={handleShare}
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Impact
                  </Button>
                  
                  <Button 
                    onClick={handleManualClose}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    View My Purchases
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
