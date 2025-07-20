
import { Card } from "@/components/ui/card";

export const StorySection = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-r from-amber-50 to-green-50">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Real Impact, Real Stories
          </h2>
        </div>
        
        <Card className="p-8 md:p-12 bg-white/80 backdrop-blur-sm shadow-xl border-0 rounded-3xl">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 bg-gradient-to-br from-green-200 to-amber-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-4xl">👩‍🎨</span>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Meet Sarla</h3>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                "I run a small tailoring business and used to throw away fabric scraps every day. 
                I felt terrible about the waste but didn't know what else to do."
              </p>
              <div className="bg-green-50 p-6 rounded-2xl border-l-4 border-green-500">
                <p className="text-lg text-gray-700 leading-relaxed font-medium">
                  "Ecoloop helped me connect with a pillow factory that turns my scraps into stuffing. 
                  Now I earn ₹200 extra daily and feel good about helping the environment!"
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-green-600 font-semibold text-lg">
              Join thousands like Sarla who are turning waste into worth 🌱
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};
