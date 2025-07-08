
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { User, Globe, BarChart3, MessageCircle, Users, Menu, Home, LogOut, ShieldAlert, ShoppingCart } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  onSectionChange: (section: string) => void;
  currentSection: string;
}

export const Navbar = ({ onSectionChange, currentSection }: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="font-bold text-lg text-gray-800">EcoLoop AI</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Button
              variant={currentSection === 'home' ? 'default' : 'ghost'}
              onClick={() => onSectionChange('home')}
              className="text-sm"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>

            <Button
              variant={currentSection === 'feed' ? 'default' : 'ghost'}
              onClick={() => onSectionChange('feed')}
              className="text-sm"
            >
              Feed
            </Button>

            <Button
              variant={currentSection === 'connect' ? 'default' : 'ghost'}
              onClick={() => onSectionChange('connect')}
              className="text-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Connect
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate('/marketplace')}
              className="text-sm"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Marketplace
            </Button>

            {/* <Button
              variant={currentSection === 'impact' ? 'default' : 'ghost'}
              onClick={() => onSectionChange('impact')}
              className="text-sm"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Impact
            </Button> */}

            <Button
              variant={currentSection === 'assistant' ? 'default' : 'ghost'}
              onClick={() => onSectionChange('assistant')}
              className="text-sm"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              AI Assistant
            </Button>

            {/* Language Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Globe className="w-4 h-4 mr-2" />
                  EN
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {languages.map((lang) => (
                  <DropdownMenuItem key={lang.code}>
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Authentication Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <NotificationBell />
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center space-x-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                    onClick={() => navigate('/admin/fraud-detection')}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Admin Dashboard</span>
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className={isAdmin ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                          {user?.firstName?.charAt(0) || user?.username?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user?.firstName || user?.username || "User"}</span>
                      {isAdmin && <Badge className="ml-1 bg-blue-100 text-blue-700 text-xs">Admin</Badge>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    {/* Show fraud detection dashboard for admin users */}
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin/fraud-detection')}>
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Fraud Detection Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/admin/login">
                  <Button variant="outline" size="sm" className="flex items-center">
                    <ShieldAlert className="w-4 h-4 mr-1" />
                    Admin
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-white py-4">
            <div className="flex flex-col space-y-2">
              <Button
                variant="ghost"
                onClick={() => {
                  onSectionChange('home');
                  setIsMenuOpen(false);
                }}
                className="justify-start"
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onSectionChange('feed');
                  setIsMenuOpen(false);
                }}
                className="justify-start"
              >
                Feed
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onSectionChange('connect');
                  setIsMenuOpen(false);
                }}
                className="justify-start"
              >
                <Users className="w-4 h-4 mr-2" />
                Connect
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onSectionChange('impact');
                  setIsMenuOpen(false);
                }}
                className="justify-start"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Impact
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onSectionChange('assistant');
                  setIsMenuOpen(false);
                }}
                className="justify-start"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                AI Assistant
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
