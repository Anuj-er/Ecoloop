
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ProblemSection } from "@/components/ProblemSection";
import { StorySection } from "@/components/StorySection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { VisionSection } from "@/components/VisionSection";
import { Footer } from "@/components/Footer";
import { Feed } from "@/components/Feed";
import { Profile } from "@/components/Profile";
import { Connect } from "@/components/Connect";
import { ImpactDashboard } from "@/components/ImpactDashboard";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [currentSection, setCurrentSection] = useState('home');
  const { isAuthenticated } = useAuth();

  const renderCurrentSection = () => {
    // If user is not authenticated, only show home section
    if (!isAuthenticated && currentSection !== 'home') {
      setCurrentSection('home');
    }

    switch (currentSection) {
      case 'feed':
        return isAuthenticated ? <Feed /> : null;
      case 'profile':
        return isAuthenticated ? <Profile /> : null;
      case 'connect':
        return isAuthenticated ? <Connect /> : null;
      case 'impact':
        return isAuthenticated ? <ImpactDashboard /> : null;
      case 'assistant':
        return isAuthenticated ? (
          <div className="min-h-screen pt-20 px-4 bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-800 mb-4">AI Assistant</h1>
              <p className="text-gray-600">Chatbot integration coming soon...</p>
            </div>
          </div>
        ) : null;
      case 'home':
      default:
        return (
          <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50">
            <div className="pt-16"> {/* Add padding for fixed navbar */}
              <HeroSection />
              <ProblemSection />
              <StorySection />
              <FeaturesSection />
              <VisionSection />
              <Footer />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar onSectionChange={setCurrentSection} currentSection={currentSection} />
      {renderCurrentSection()}
    </div>
  );
};

export default Index;
