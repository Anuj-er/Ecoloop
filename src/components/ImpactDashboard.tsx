
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Leaf, Package, Users, TrendingUp, Award, Recycle } from "lucide-react";

export const ImpactDashboard = () => {
  const monthlyData = [
    { month: 'Jan', materials: 8, co2: 4.2, earnings: 1200 },
    { month: 'Feb', materials: 12, co2: 6.8, earnings: 1850 },
    { month: 'Mar', materials: 15, co2: 8.9, earnings: 2400 },
    { month: 'Apr', materials: 11, co2: 7.1, earnings: 1950 },
    { month: 'May', materials: 18, co2: 11.2, earnings: 3250 },
  ];

  const materialBreakdown = [
    { name: 'Cotton Fabric', value: 45, color: '#10B981' },
    { name: 'Silk Scraps', value: 25, color: '#3B82F6' },
    { name: 'Polyester', value: 20, color: '#8B5CF6' },
    { name: 'Mixed Materials', value: 10, color: '#F59E0B' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 pt-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-800">Sarla's Impact Dashboard</h1>
        <p className="text-gray-600">Your contribution to a sustainable future</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <Leaf className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">23.7kg</div>
            <div className="text-sm text-green-600">CO₂ Saved</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Package className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">64</div>
            <div className="text-sm text-blue-600">Materials Sold</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">18</div>
            <div className="text-sm text-purple-600">Connections</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-700">₹8,650</div>
            <div className="text-sm text-orange-600">Total Earnings</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="materials" fill="#10B981" name="Materials Sold" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Material Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Material Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={materialBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {materialBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Impact */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Recycle className="w-5 h-5 mr-2 text-green-600" />
            Environmental Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🌱</span>
              </div>
              <h3 className="font-semibold mb-2">Trees Planted</h3>
              <p className="text-2xl font-bold text-green-600">3</p>
              <p className="text-sm text-gray-600">Through CO₂ offset program</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💧</span>
              </div>
              <h3 className="font-semibold mb-2">Water Save

d</h3>
              <p className="text-2xl font-bold text-blue-600">847L</p>
              <p className="text-sm text-gray-600">From material reuse</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">♻️</span>
              </div>
              <h3 className="font-semibold mb-2">Waste Diverted</h3>
              <p className="text-2xl font-bold text-purple-600">45.2kg</p>
              <p className="text-sm text-gray-600">From landfills</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="w-5 h-5 mr-2 text-yellow-600" />
            Achievements & Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Eco Warrior</p>
                <p className="text-sm text-gray-600">Saved 20kg+ CO₂</p>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800">Earned</Badge>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Community Builder</p>
                <p className="text-sm text-gray-600">10+ successful connections</p>
              </div>
              <Badge className="bg-blue-100 text-blue-800">Earned</Badge>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Recycle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Waste Warrior</p>
                <p className="text-sm text-gray-600">50+ materials recycled</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Earned</Badge>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200 opacity-60">
              <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Top Seller</p>
                <p className="text-sm text-gray-600">₹10,000+ earned</p>
              </div>
              <Badge variant="outline">Progress: 86%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Towards Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Towards Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Monthly CO₂ Target</span>
              <span className="text-sm text-gray-600">11.2kg / 15kg</span>
            </div>
            <Progress value={75} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Monthly Earnings Goal</span>
              <span className="text-sm text-gray-600">₹3,250 / ₹4,000</span>
            </div>
            <Progress value={81} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">New Connections</span>
              <span className="text-sm text-gray-600">4 / 5</span>
            </div>
            <Progress value={80} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
