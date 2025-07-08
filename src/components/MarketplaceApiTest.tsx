import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from 'axios';
import api from "@/lib/api";

export const MarketplaceApiTest = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:5000/api/marketplace');
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [internalApiResponse, setInternalApiResponse] = useState<any>(null);
  
  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    
    // Collect debug information
    const debugData = {
      userAgent: navigator.userAgent,
      windowLocation: window.location.href,
      localStorage: {
        token: storedToken ? 'Present (length: ' + storedToken.length + ')' : 'Not present',
        user: localStorage.getItem('user') ? 'Present' : 'Not present',
      },
      reactRouterPath: window.location.pathname,
      timestamp: new Date().toISOString()
    };
    
    setDebugInfo(debugData);
  }, []);
  
  const makeApiRequest = async () => {
    setLoading(true);
    setError(null);
    setApiResponse(null);
    
    try {
      if (!token) {
        setError('No token available. Please log in first.');
        return;
      }
      
      // Make direct axios request to test the API
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setApiResponse(response.data);
      
      // Store response details in debug info
      setDebugInfo(prev => ({
        ...prev,
        directRequestSuccess: true,
        directResponseStatus: response.status,
        directResponseTime: new Date().toISOString()
      }));
    } catch (error: any) {
      console.error('API test error:', error);
      setError(
        `Error: ${error.message}\n` +
        `Status: ${error.response?.status || 'unknown'}\n` +
        `Data: ${JSON.stringify(error.response?.data || {}, null, 2)}`
      );
      
      // Store error details in debug info
      setDebugInfo(prev => ({
        ...prev,
        directRequestSuccess: false,
        directRequestError: error.message,
        directResponseStatus: error.response?.status || 'unknown',
        directResponseTime: new Date().toISOString()
      }));
    } finally {
      setLoading(false);
    }
  };
  
  // Test using our internal API utility
  const makeInternalApiRequest = async () => {
    setLoading(true);
    setError(null);
    setInternalApiResponse(null);
    
    try {
      // Extract the path portion from the full URL
      const urlParts = apiUrl.split('/api/');
      const endpoint = urlParts.length > 1 ? `/api/${urlParts[1]}` : apiUrl;
      
      console.log(`Making internal API request to: ${endpoint}`);
      
      // Make request using our configured API utility
      const response = await api.get(endpoint);
      
      setInternalApiResponse(response.data);
      console.log('Internal API response:', response);
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        internalRequestSuccess: true,
        internalResponseStatus: response.status,
        internalResponseTime: new Date().toISOString(),
        apiInterceptorsActive: true
      }));
    } catch (error: any) {
      console.error('Internal API request failed:', error);
      setError(
        `Internal API Error: ${error.message}\n` +
        `Status: ${error.response?.status || 'unknown'}\n` +
        `Data: ${JSON.stringify(error.response?.data || {}, null, 2)}`
      );
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        internalRequestSuccess: false,
        internalRequestError: error.message,
        internalResponseStatus: error.response?.status || 'unknown',
        internalResponseTime: new Date().toISOString()
      }));
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Marketplace API Test Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <h2 className="text-lg font-medium mb-2">Authentication Status</h2>
              <div className="bg-gray-100 p-3 rounded">
                <p><strong>Logged in:</strong> {user ? 'Yes' : 'No'}</p>
                <p><strong>Username:</strong> {user?.username || 'N/A'}</p>
                <p><strong>Token available:</strong> {token ? 'Yes' : 'No'}</p>
                {token && <p><strong>Token length:</strong> {token.length} characters</p>}
              </div>
            </div>
            
            <Tabs defaultValue="direct">
              <TabsList className="mb-4">
                <TabsTrigger value="direct">Direct API</TabsTrigger>
                <TabsTrigger value="internal">App API</TabsTrigger>
                <TabsTrigger value="debug">Debug Info</TabsTrigger>
                <TabsTrigger value="fix">Fix Marketplace</TabsTrigger>
              </TabsList>
              
              <TabsContent value="direct" className="mb-6">
                <h2 className="text-lg font-medium mb-2">Direct API Request</h2>
                <div className="flex gap-2 mb-4">
                  <Input 
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="API URL"
                    className="flex-1"
                  />
                  <Button 
                    onClick={makeApiRequest}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Direct API Test'}
                  </Button>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>API Request Failed</AlertTitle>
                    <AlertDescription>
                      <pre className="whitespace-pre-wrap text-xs mt-2">
                        {error}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
                
                {apiResponse && (
                  <div>
                    <h3 className="font-medium mb-2">Response:</h3>
                    <div className="bg-gray-100 p-3 rounded">
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="internal" className="mb-6">
                <h2 className="text-lg font-medium mb-2">App API Request</h2>
                <p className="text-sm text-gray-600 mb-3">
                  Test using the app's configured API utility (uses interceptors, etc.)
                </p>
                <div className="flex gap-2 mb-4">
                  <Input 
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="API URL"
                    className="flex-1"
                  />
                  <Button 
                    onClick={makeInternalApiRequest}
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'App API Test'}
                  </Button>
                </div>
                
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>API Request Failed</AlertTitle>
                    <AlertDescription>
                      <pre className="whitespace-pre-wrap text-xs mt-2">
                        {error}
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
                
                {internalApiResponse && (
                  <div>
                    <h3 className="font-medium mb-2">Response:</h3>
                    <div className="bg-gray-100 p-3 rounded">
                      <pre className="whitespace-pre-wrap text-xs">
                        {JSON.stringify(internalApiResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="debug" className="mb-6">
                <h2 className="text-lg font-medium mb-2">Debug Information</h2>
                <div className="bg-gray-100 p-3 rounded">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="fix" className="mb-6">
                <h2 className="text-lg font-medium mb-2">Fix Marketplace Page</h2>
                <div className="grid gap-3">
                  <Button 
                    onClick={() => window.location.href = '/marketplace'}
                    variant="secondary"
                  >
                    Go to Marketplace
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/marketplace-simple'}
                    variant="secondary"
                  >
                    Go to Simple Marketplace
                  </Button>
                  <Button 
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      window.location.href = '/login';
                    }}
                    variant="destructive"
                  >
                    Clear Auth & Go to Login
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            Back to Previous Page
          </Button>
        </div>
      </div>
    </div>
  );
};
