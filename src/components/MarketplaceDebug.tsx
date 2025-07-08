import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const MarketplaceDebug = () => {
  const [authState, setAuthState] = useState({
    token: null as string | null,
    tokenValid: false,
    errorMessage: '',
    apiResponse: null as any
  });
  const { user } = useAuth();

  const checkToken = async () => {
    try {
      const token = localStorage.getItem('token');
      setAuthState(prev => ({ ...prev, token }));
      
      if (!token) {
        setAuthState(prev => ({ 
          ...prev, 
          errorMessage: 'No token found in localStorage' 
        }));
        return;
      }
      
      // Try to make a request to verify the token works
      try {
        const response = await api.get('/auth/me');
        setAuthState(prev => ({ 
          ...prev, 
          tokenValid: true,
          apiResponse: response.data 
        }));
      } catch (error: any) {
        setAuthState(prev => ({ 
          ...prev, 
          tokenValid: false,
          errorMessage: `API Error: ${error.message}`,
          apiResponse: error.response?.data || null
        }));
      }
    } catch (error: any) {
      setAuthState(prev => ({ 
        ...prev, 
        errorMessage: `Error: ${error.message}` 
      }));
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">Marketplace Debug Info</h1>
        
        <Card className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-lg font-medium mb-4">Authentication Status</h2>
            <div className="grid gap-2">
              <div>
                <strong>Token exists:</strong> {authState.token ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Token valid:</strong> {authState.tokenValid ? 'Yes' : 'No'}
              </div>
              <div>
                <strong>Auth Context User:</strong> {user ? 'Present' : 'Not present'}
              </div>
              {user && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                </div>
              )}
              {authState.errorMessage && (
                <div className="text-red-500 mt-2">
                  {authState.errorMessage}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-medium mb-4">API Response</h2>
            {authState.apiResponse ? (
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
                {JSON.stringify(authState.apiResponse, null, 2)}
              </pre>
            ) : (
              <p>No API response data</p>
            )}
            
            <div className="mt-4">
              <Button onClick={checkToken}>Refresh Token Check</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
