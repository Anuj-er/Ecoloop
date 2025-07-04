
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

export const HeroSection = () => {
  const scrollToNext = () => {
    const nextSection = document.getElementById('problem-section');
    nextSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 to-amber-100/50"></div>
      <div className="absolute top-20 left-10 w-32 h-32 bg-green-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto text-center relative z-10">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-800 mb-6 leading-tight">
            <span className="text-green-600">EcoLoop</span> AI
          </h1>
          <div className="text-xl md:text-2xl text-gray-700 mb-4 font-medium">
            Turning Waste Into Worth
          </div>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
            AI-powered surplus exchange platform built for a sustainable tomorrow
          </p>
          
          {/* Illustration placeholder */}
          <div className="mb-8 mx-auto max-w-md">
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-green-200/50">
              <div className="flex items-center justify-center space-x-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl">🗑️</span>
                  </div>
                  <p className="text-sm text-gray-600">Fabric Waste</p>
                </div>
                <div className="text-3xl text-green-600 animate-pulse">→</div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <span className="text-2xl">🛏️</span>
                  </div>
                  <p className="text-sm text-gray-600">New Product</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
              View Demo
            </Button>
            <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 px-8 py-3 text-lg rounded-full">
              Explore Features
            </Button>
          </div>
        </div>
        
        <button
          onClick={scrollToNext}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-green-600 hover:text-green-700 transition-colors animate-bounce"
        >
          <ArrowDown size={32} />
        </button>
      </div>
    </section>
  );
};
