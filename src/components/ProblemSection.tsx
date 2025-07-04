
import { Card } from "@/components/ui/card";

export const ProblemSection = () => {
  return (
    <section id="problem-section" className="py-20 px-4 bg-white/60">
      <div className="container mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            The Problem We're Solving
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card className="p-8 bg-gradient-to-br from-red-50 to-orange-50 border-red-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-6xl font-bold text-red-600 mb-4">62M</div>
              <p className="text-xl text-gray-700 mb-2">tons of waste annually</p>
              <p className="text-lg text-gray-600">in India alone</p>
            </div>
          </Card>
          
          <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="text-center">
              <div className="text-6xl font-bold text-green-600 mb-4">80%</div>
              <p className="text-xl text-gray-700 mb-2">is reusable</p>
              <p className="text-lg text-gray-600">but ends up in landfills</p>
            </div>
          </Card>
        </div>
        
        <div className="text-center mt-12">
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Tailors, carpenters, startups throw away valuable materials daily. 
            <span className="text-green-600 font-semibold"> What if we could connect them with those who need these materials?</span>
          </p>
        </div>
      </div>
    </section>
  );
};
