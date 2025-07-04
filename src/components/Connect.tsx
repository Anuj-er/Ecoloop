
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Star, Users, Handshake, Package, Search, Truck, MessageCircle, CheckCircle, ArrowRight } from "lucide-react";

export const Connect = () => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDealDemo, setShowDealDemo] = useState(false);
  const [dealStep, setDealStep] = useState(1);
  const [selectedConnection, setSelectedConnection] = useState<number | null>(null);
  const [activeDeals, setActiveDeals] = useState<number[]>([]);  const connections = [
    {
      id: 1,
      name: "Meera Textiles",
      type: "Factory",
      location: "Delhi, 5km away",
      pincode: "110001",
      rating: 4.7,
      materials: ["Cotton", "Silk", "Polyester"],
      status: "potential",
      dealValue: "₹750/month",
      description: "Family-run textile business specializing in traditional fabrics. We're looking for fabric scraps for pillow stuffing manufacturing. Quality focused, fair pricing.",
      matchScore: 95,
      lastActive: "2 hours ago",
      image: "/images/connect/MeeraTExtiles.png",
      ownerName: "Meera Kumari",
      experience: "15+ years in textile industry",
      verified: true,
      employeeCount: "12-15 workers",
      businessType: "Manufacturing"
    },
    {
      id: 2,
      name: "Ravi Kumar",
      type: "Craftsman",
      location: "Jodhpur, 8km away",
      pincode: "110025",
      rating: 4.9,
      materials: ["Wood", "Metal"],
      status: "skill-swap",
      dealValue: "Skill Exchange",
      description: "Third generation carpenter who specializes in traditional furniture repair and making. Looking to exchange carpentry skills for tailoring services.",
      matchScore: 88,
      lastActive: "1 day ago",
      image: "/images/connect/RaviKumar.png",
      ownerName: "Ravi Kumar",
      experience: "20+ years in carpentry",
      verified: true,
      employeeCount: "Solo craftsman",
      businessType: "Individual Artisan"
    },
    {
      id: 3,
      name: "GreenCraft Studios",
      type: "Startup",
      location: "Gurgaon, 12km away",
      pincode: "122001",
      rating: 4.5,
      materials: ["Fabric", "Paper", "Cardboard"],
      status: "potential",
      dealValue: "₹300-500",
      description: "Young startup creating eco-friendly products from waste materials. Founded by local entrepreneurs passionate about sustainability and rural employment.",
      matchScore: 78,
      lastActive: "3 hours ago",
      image: "/images/connect/GreenCraft Studios.png",
      ownerName: "Rajesh Gupta",
      experience: "2 years in eco-business",
      verified: true,
      employeeCount: "8-10 people",
      businessType: "Social Enterprise"
    },
    {
      id: 4,
      name: "Local Recycling Hub",
      type: "Recycler",
      location: "Delhi, 3km away",
      pincode: "110001",
      rating: 4.2,
      materials: ["All Materials"],
      status: "bulk-buyer",
      dealValue: "₹50-200/kg",
      description: "Community-based recycling facility serving 5 local areas. Fair pricing, transparent dealings, and quick payments. Supporting local waste management.",
      matchScore: 65,
      lastActive: "5 hours ago",
      image: "/images/connect/Local Recycling Hub.png",
      ownerName: "Suresh Patel",
      experience: "10+ years in recycling",
      verified: true,
      employeeCount: "20+ workers",
      businessType: "Community Service"
    }
  ];

  const filteredConnections = connections.filter(conn => {
    const matchesFilter = filter === "all" || conn.status === filter;
    const matchesSearch = conn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conn.materials.some(mat => mat.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });
  const handleConnect = (connectionId: number) => {
    console.log(`Connecting with ${connectionId}`);
    setSelectedConnection(connectionId);
    setShowDealDemo(true);
    setDealStep(1);
  };

  const completeDeal = () => {
    if (selectedConnection) {
      setActiveDeals([...activeDeals, selectedConnection]);
      setShowDealDemo(false);
      setSelectedConnection(null);
      setDealStep(1);
    }
  };

  const nextStep = () => setDealStep(prev => prev + 1);
  const prevStep = () => setDealStep(prev => prev - 1);
  const renderDealStep = () => {
    const selectedConn = connections.find(conn => conn.id === selectedConnection);
    if (!selectedConn) return null;

    switch (dealStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 1: Initial Connection</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Avatar>
                  <AvatarImage src={selectedConn.image} />
                  <AvatarFallback>{selectedConn.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedConn.name}</p>
                  <p className="text-sm text-gray-600">{selectedConn.location}</p>
                  <p className="text-xs text-gray-500">Owner: {selectedConn.ownerName}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong>Business Type:</strong> {selectedConn.businessType}</p>
                <p><strong>Experience:</strong> {selectedConn.experience}</p>
                <p><strong>Team Size:</strong> {selectedConn.employeeCount}</p>
                <p><strong>About:</strong> {selectedConn.description}</p>
              </div>
            </div>
            <Button onClick={nextStep} className="w-full">Send Connection Request</Button>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 2: Negotiate Terms</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Material Quantity</label>
                <Input placeholder="5 kg cotton fabric scraps" />
              </div>
              <div>
                <label className="text-sm font-medium">Price per kg</label>
                <Input placeholder="₹150" />
              </div>
              <div>
                <label className="text-sm font-medium">Delivery Method</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose delivery option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delhivery">Delhivery (₹45 - 2 days)</SelectItem>
                    <SelectItem value="porter">Porter (₹60 - Same day)</SelectItem>
                    <SelectItem value="dunzo">Dunzo (₹35 - 1 day)</SelectItem>
                    <SelectItem value="self">Self Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Who pays delivery?</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment responsibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer pays</SelectItem>
                    <SelectItem value="seller">Seller pays</SelectItem>
                    <SelectItem value="split">Split 50-50</SelectItem>
                    <SelectItem value="platform">Let platform decide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={prevStep}>Back</Button>
              <Button onClick={nextStep} className="flex-1">Agree to Terms</Button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step 3: Smart Contract Creation</h3>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium">Smart Contract Generated</span>
              </div>
              <div className="text-sm space-y-2">
                <p><strong>Contract ID:</strong> SC-2024-001847</p>
                <p><strong>Material:</strong> 5kg Cotton Fabric Scraps</p>
                <p><strong>Price:</strong> ₹750 (₹150/kg)</p>
                <p><strong>Delivery:</strong> Delhivery (Buyer pays ₹45)</p>
                <p><strong>Payment:</strong> Auto-release on delivery confirmation</p>
              </div>
            </div>            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-700">✓ Fraud Protection Active ✓ Automatic Payment ✓ Dispute Resolution</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={prevStep}>Back</Button>
              <Button onClick={completeDeal} className="flex-1 bg-green-500 hover:bg-green-600">Confirm Deal</Button>
            </div>
          </div>
        );
      
      case 4:        return (
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">Deal Confirmed!</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm mb-2">Your deal with {selectedConn?.name} is now active.</p>
              <p className="text-xs text-gray-600">You'll receive pickup notification within 24 hours.</p>
            </div>
            <Button onClick={completeDeal} className="w-full">
              Continue to Active Deals
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pt-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Smart Connections</h1>
          <p className="text-gray-600">AI-powered matching based on location, materials, and needs</p>
        </div>
        <div className="flex space-x-2">
          <Button className="bg-green-500 hover:bg-green-600">
            List Materials
          </Button>
          <Button variant="outline">
            Skill Swap
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, material, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Connections</SelectItem>
                <SelectItem value="active">Active Deals</SelectItem>
                <SelectItem value="skill-swap">Skill Swaps</SelectItem>
                <SelectItem value="potential">Potential Matches</SelectItem>
                <SelectItem value="bulk-buyer">Bulk Buyers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="font-medium text-green-800">AI Smart Matching is Active</p>
              <p className="text-sm text-green-600">
                We found {filteredConnections.length} potential matches based on your location (110001), 
                available materials (Cotton, Silk), and preferences.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connections Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {filteredConnections.map(connection => (
          <Card key={connection.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={connection.image} />
                    <AvatarFallback>{connection.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{connection.name}</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Badge variant="outline" className="text-xs">
                        {connection.type}
                      </Badge>
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-500 mr-1" />
                        <span>{connection.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    className={`text-xs ${
                      connection.matchScore > 90 ? 'bg-green-100 text-green-800' :
                      connection.matchScore > 80 ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {connection.matchScore}% Match
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-1" />
                <span>{connection.location}</span>
                <span className="ml-2 text-xs">PIN: {connection.pincode}</span>
              </div>

              <p className="text-sm text-gray-700">{connection.description}</p>

              <div className="flex flex-wrap gap-1">
                {connection.materials.map(material => (
                  <Badge key={material} variant="secondary" className="text-xs">
                    {material}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">{connection.dealValue}</p>
                  <p className="text-xs text-gray-500">Last active: {connection.lastActive}</p>
                </div>                <div className="flex space-x-2">
                  {activeDeals.includes(connection.id) ? (
                    <Button size="sm" className="bg-green-500 hover:bg-green-600">
                      <Package className="w-4 h-4 mr-1" />
                      Active Deal
                    </Button>
                  ) : connection.status === 'skill-swap' ? (
                    <Button size="sm" variant="outline">
                      <Handshake className="w-4 h-4 mr-1" />
                      Skill Swap
                    </Button>
                  ) : (
                    <Dialog open={showDealDemo && selectedConnection === connection.id} onOpenChange={(open) => {
                      setShowDealDemo(open);
                      if (!open) setSelectedConnection(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          onClick={() => handleConnect(connection.id)}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <Users className="w-4 h-4 mr-1" />
                          Connect
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Deal Making Process</DialogTitle>
                        </DialogHeader>
                        {renderDealStep()}
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Demo Smart Contract Section */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="mr-2">🔒</span>
            Smart Contract Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Your deal with <strong>Meera Textiles</strong> is secured by our blockchain-based smart contract:
            </p>
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Contract Address:</p>
                  <p className="text-purple-600 font-mono">0x742d35Cc6635C0532925a3b8D...</p>
                </div>
                <div>
                  <p className="font-medium">Status:</p>
                  <Badge className="bg-green-100 text-green-800">Active & Secured</Badge>
                </div>
                <div>
                  <p className="font-medium">Material:</p>
                  <p>5kg Cotton Fabric Scraps</p>
                </div>
                <div>
                  <p className="font-medium">Payment:</p>
                  <p>₹750 (Auto-release on delivery)</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              ✓ Fraud protection ✓ Automatic payment release ✓ Dispute resolution
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
