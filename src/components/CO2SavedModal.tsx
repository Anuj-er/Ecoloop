import React, { useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import Confetti from 'react-confetti';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CO2SavedModalProps {
  open: boolean;
  onClose: () => void;
  co2Saved: number;
  material: string;
  quantity: number;
}

export const CO2SavedModal: React.FC<CO2SavedModalProps> = ({ open, onClose, co2Saved, material, quantity }) => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('CO2SavedModal open:', open, 'co2Saved:', co2Saved, 'material:', material, 'quantity:', quantity);
    if (open) {
      const timer = setTimeout(() => {
        console.log('CO2SavedModal auto-close after 5s');
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose, co2Saved, material, quantity]);

  const handleViewImpact = () => {
    console.log('View My Impact button clicked');
    onClose();
    navigate('/impact'); // Change this path if your dashboard is different
  };

  return (
    <Dialog open={open} onOpenChange={() => { console.log('CO2SavedModal closed via Dialog'); onClose(); }}>
      <DialogContent className="max-w-md flex flex-col items-center justify-center relative">
        <Confetti recycle={false} numberOfPieces={300} />
        <button
          className="absolute right-4 top-4 rounded-full p-1 bg-gray-100 hover:bg-gray-200"
          onClick={() => { console.log('CO2SavedModal closed via X button'); onClose(); }}
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
        <div className="text-3xl font-bold text-green-700 mb-2 text-center mt-6">
          🎉 You just saved
        </div>
        <div className="text-5xl font-extrabold text-green-900 mb-2 text-center">
          {co2Saved.toFixed(2)} kg CO₂
        </div>
        <div className="text-lg text-gray-700 mb-4 text-center">
          by reusing {quantity} kg of {material.charAt(0).toUpperCase() + material.slice(1)}!
        </div>
        <button
          className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow"
          onClick={handleViewImpact}
        >
          View My Impact
        </button>
      </DialogContent>
    </Dialog>
  );
}; 