
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const FeaturesSection = () => {
  const features = [
    {
      title: "Skill Swapping",
      description: "Trade skills instead of money. Sewing for fence repair? Lock the deal!",
      icon: "🔄",
      color: "from-blue-50 to-cyan-50"
    },
    {
      title: "Personalized Feed",
      description: "Your useful connections on your feed, like social media for sustainability",
      icon: "📱",
      color: "from-purple-50 to-pink-50"
    },
    {
      title: "AI-Based Matching",
      description: "Smart algorithms connect waste generators with perfect buyers",
      icon: "🤖",
      color: "from-green-50 to-emerald-50"
    },
    {
      title: "CO₂ Tracking",
      description: "See your environmental impact and carbon footprint reduction",
      icon: "🌍",
      color: "from-green-50 to-blue-50"
    },
    {
      title: "Impact Dashboard",
      description: "Visualize your waste reduction and earnings in real-time",
      icon: "📊",
      color: "from-amber-50 to-orange-50"
    },
    {
      title: "Pickup/Delivery",
      description: "Seamless logistics between sellers and buyers on our platform",
      icon: "🚚",
      color: "from-red-50 to-pink-50"
    },
    {
      title: "AI Scan & Fraud Detection",
      description: "Scan materials for recyclability and prevent fraudulent listings",
      icon: "🔍",
      color: "from-indigo-50 to-purple-50"
    },
    {
      title: "Multi-Language Support",
      description: "Available in Hindi, Tamil, Telugu, Bengali, and more",
      icon: "🌐",
      color: "from-teal-50 to-cyan-50"
    },
    {
      title: "Rewards System",
      description: "Earn points and plant trees with every successful exchange",
      icon: "🌳",
      color: "from-green-50 to-lime-50"
    }
  ];

  return (
    <section className="py-20 px-4 bg-white/40">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Powerful Features
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to turn waste into worth, powered by AI
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className={`p-6 bg-gradient-to-br ${feature.color} border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105`}
            >
              <div className="text-center">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg rounded-full shadow-lg">
            See All Features
          </Button>
        </div>
      </div>
    </section>
  );
};
