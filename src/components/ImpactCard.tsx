import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, Globe, Award, TreePine, Car, Recycle, Sparkles } from "lucide-react";
import html2canvas from 'html2canvas';
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Transaction {
  _id: string;
  amount: number;
  currency: string;
  completedAt: string;
  co2Saved: number;
  items: Array<{
    title: string;
    materialType: string;
    quantity: number;
    co2Saved: number;
  }>;
}

interface ImpactCardProps {
  totalCO2Saved: number;
  latestTransaction?: Transaction;
  userName: string;
}

export const ImpactCard: React.FC<ImpactCardProps> = ({
  totalCO2Saved,
  latestTransaction,
  userName
}) => {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const getBadgeText = (co2Amount: number) => {
    if (co2Amount >= 1000) return { text: "🌟 Planet Guardian", color: "from-purple-500 to-pink-500" };
    if (co2Amount >= 500) return { text: "💪 Green Hero", color: "from-emerald-500 to-teal-500" };
    if (co2Amount >= 100) return { text: "🌱 Eco Warrior", color: "from-green-500 to-emerald-500" };
    if (co2Amount >= 50) return { text: "♻️ Green Champion", color: "from-lime-500 to-green-500" };
    return { text: "🌿 Eco Friend", color: "from-green-400 to-emerald-400" };
  };

  const getImpactStats = (co2Amount: number) => {
    return [
      {
        icon: <Recycle className="w-5 h-5" />,
        value: Math.round(co2Amount / 0.08),
        label: "Plastic bottles saved",
        color: "text-blue-600"
      },
      {
        icon: <TreePine className="w-5 h-5" />,
        value: Math.round(co2Amount * 0.12),
        label: "Trees planted equivalent",
        color: "text-green-600"
      },
      {
        icon: <Car className="w-5 h-5" />,
        value: Math.round(co2Amount * 2.3),
        label: "Car miles avoided",
        color: "text-orange-600"
      }
    ];
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        width: cardRef.current.offsetWidth * 2,
        height: cardRef.current.offsetHeight * 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const link = document.createElement('a');
      link.download = `my-impact-card-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Success!",
        description: "Impact card downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading impact card:', error);
      toast({
        title: "Error",
        description: "Failed to download impact card",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLinkedInShare = () => {
    const message = `I've saved over ${totalCO2Saved}kg CO₂ with EcoLoop by reusing industrial waste. Join the movement! ♻️ #EcoLoop #CircularEconomy #Sustainability`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&mini=true&title=${encodeURIComponent('My EcoLoop Impact')}&summary=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'width=600,height=600');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Impact Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card 
          ref={cardRef} 
          className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border-2 border-green-200 overflow-hidden relative shadow-xl"
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <motion.div 
              className="absolute top-4 right-4 text-6xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              🌍
            </motion.div>
            <motion.div 
              className="absolute bottom-4 left-4 text-4xl"
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              ♻️
            </motion.div>
            <motion.div 
              className="absolute top-1/3 left-1/4 text-3xl"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🌱
            </motion.div>
            <motion.div 
              className="absolute top-1/2 right-1/3 text-2xl"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              ✨
            </motion.div>
          </div>

          <CardHeader className="text-center pb-4 relative z-10">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent flex items-center justify-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Globe className="w-8 h-8 text-green-600" />
                </motion.div>
                My Environmental Impact
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                </motion.div>
              </CardTitle>
            </motion.div>
          </CardHeader>

          <CardContent className="text-center space-y-8 relative z-10 pb-8">
            {/* Total CO2 Saved */}
            <motion.div 
              className="space-y-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
            >
              <div className="relative">
                <div className="text-7xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  {totalCO2Saved.toFixed(1)}
                </div>
                <motion.div 
                  className="absolute -top-2 -right-2 text-2xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  🌟
                </motion.div>
              </div>
              <div className="text-2xl text-green-700 font-bold tracking-wide">
                kg CO₂ Saved
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Your contribution to a cleaner planet
              </div>
            </motion.div>

            {/* Enhanced Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring" }}
            >
              <div className={`inline-block bg-gradient-to-r ${getBadgeText(totalCO2Saved).color} text-white text-xl px-6 py-3 rounded-full font-bold shadow-lg`}>
                {getBadgeText(totalCO2Saved).text}
              </div>
            </motion.div>

            {/* Latest Transaction with better styling */}
            {latestTransaction && latestTransaction.items.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-green-100"
              >
                <h4 className="font-bold text-green-800 text-lg mb-3 flex items-center justify-center gap-2">
                  <Award className="w-5 h-5" />
                  Latest Achievement
                </h4>
                <div className="text-gray-700 space-y-2">
                  <div className="font-semibold text-lg">
                    {latestTransaction.items[0].materialType.charAt(0).toUpperCase() + 
                     latestTransaction.items[0].materialType.slice(1)} - {latestTransaction.items[0].quantity}kg recycled
                  </div>
                  <div className="text-green-600 font-bold text-xl">
                    → {latestTransaction.co2Saved.toFixed(1)} kg CO₂ saved 🎉
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {formatDate(latestTransaction.completedAt)}
                  </div>
                </div>
              </motion.div>
            )}

            {/* User Attribution with better styling */}
            <motion.div 
              className="text-lg text-green-700 font-bold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
            >
              Proudly achieved by {userName} 💚
            </motion.div>

            {/* EcoLoop Branding */}
            <motion.div 
              className="text-sm text-gray-500 border-t border-green-200 pt-4 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              🌍 Powered by EcoLoop - Building a Circular Economy
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Action Buttons */}
      <motion.div 
        className="flex gap-4 justify-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Button 
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg px-6 py-3 text-lg font-semibold"
        >
          <Download className="w-5 h-5 mr-2" />
          {isDownloading ? 'Downloading...' : 'Download Card'}
        </Button>
        
        <Button 
          onClick={handleLinkedInShare}
          variant="outline"
          className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-lg px-6 py-3 text-lg font-semibold"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Impact
        </Button>
      </motion.div>

      {/* Enhanced Impact Statistics */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-gradient-to-r from-gray-50 to-green-50 border-2 border-green-100 shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              Environmental Impact Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {getImpactStats(totalCO2Saved).map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center p-4 bg-white rounded-xl shadow-md border border-gray-100"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.0 + index * 0.1, type: "spring" }}
                >
                  <div className={`flex justify-center mb-3 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div className={`text-3xl font-bold ${stat.color} mb-2`}>
                    {stat.value.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div 
              className="text-xs text-gray-500 mt-6 text-center font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              ✨ Approximate environmental impact calculations based on industry standards
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
