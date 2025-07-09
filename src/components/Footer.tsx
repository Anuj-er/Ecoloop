
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FileText, Youtube } from "lucide-react";
import { useState } from "react";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Contact form submitted:", { email, message });
    // This would normally send the data to a backend
    setEmail("");
    setMessage("");
    alert("Thanks for your interest! We'll get back to you soon.");
  };

  return (
    <footer className="py-16 px-4 bg-gray-900 text-white">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Contact Form */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Get In Touch</h3>
            <Card className="p-6 bg-gray-800 border-gray-700">
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
                <textarea
                  placeholder="Your message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 resize-none"
                />
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  Send Message
                </Button>
              </form>
            </Card>
          </div>
          
          {/* Links and Info */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Resources</h3>
            <div className="space-y-4 mb-8">
              <Button 
                variant="outline" 
                className="w-full justify-start bg-transparent border-gray-600 text-white hover:bg-gray-800"
              >
                <FileText className="mr-2" size={20} />
                View Pitch Deck
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start bg-transparent border-gray-600 text-white hover:bg-gray-800"
              >
                <Youtube className="mr-2" size={20} />
                YouTube Demo
              </Button>
            </div>
            
            {/* Language Support Preview */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-3">Available Languages</h4>
              <div className="flex flex-wrap gap-2">
                {["English", "हिंदी", "தமிழ்", "తెలుగు", "বাংলা", "ગુજરાતી"].map((lang) => (
                  <span key={lang} className="px-3 py-1 bg-gray-800 rounded-full text-sm">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Footer */}
        <div className="border-t border-gray-700 pt-8 text-center">
          <div className="mb-4">
            <h2 className="text-3xl font-bold text-green-400 mb-2">EcoLoop AI</h2>
            <p className="text-gray-400">Turning Waste Into Worth</p>
          </div>
          
          <div className="text-gray-400">
            <p className="mb-2">
              <span className="font-semibold text-white">Team 404 Name Not Found</span> | 
              <span className="ml-2">Chitkara University</span>
            </p>
            <p className="text-sm">
              Built with ❤️ for a sustainable future | © 2025 EcoLoop AI
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
