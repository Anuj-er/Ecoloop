
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const VisionSection = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-green-100 to-amber-100">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-8">
            Our Vision
          </h2>
          <Card className="p-8 md:p-12 bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
            <p className="text-xl md:text-2xl text-gray-700 leading-relaxed mb-8">
              "Built by students to make reuse easy, visible, and rewarding. 
              <span className="text-green-600 font-semibold"> Join the circular economy.</span>"
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl mb-2">🎓</div>
                <p className="font-semibold text-gray-800">Student Built</p>
                <p className="text-sm text-gray-600">Innovation from the ground up</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">♻️</div>
                <p className="font-semibold text-gray-800">Circular Economy</p>
                <p className="text-sm text-gray-600">Waste becomes resource</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🌱</div>
                <p className="font-semibold text-gray-800">Sustainable Future</p>
                <p className="text-sm text-gray-600">For generations to come</p>
              </div>
            </div>
            
            <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
              Join the Movement
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
};
