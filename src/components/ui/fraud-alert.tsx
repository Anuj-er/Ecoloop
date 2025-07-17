import React from 'react';
import { AlertTriangle, ShieldAlert, Info, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';

interface FraudAlertProps {
  fraudScore: number;
  fraudFlags?: string[];
  suggestions?: string[];
  severity?: 'low' | 'medium' | 'high';
  onDismiss?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

export function FraudAlert({
  fraudScore, 
  fraudFlags = [], 
  suggestions = [],
  severity = 'medium',
  onDismiss,
  showDetails = true,
  compact = false
}: FraudAlertProps) {
  const getColor = () => {
    if (severity === 'high' || fraudScore > 70) return 'destructive';
    if (severity === 'medium' || fraudScore > 40) return 'default';
    return 'default';
  };
  
  const getIcon = () => {
    if (severity === 'high' || fraudScore > 70) return <ShieldAlert className="h-4 w-4" />;
    if (severity === 'medium' || fraudScore > 40) return <AlertTriangle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };
  
  const getTitle = () => {
    if (severity === 'high' || fraudScore > 70) return "Suspicious Content Detected";
    if (severity === 'medium' || fraudScore > 40) return "Potentially Misleading Content";
    return "Content Advisory";
  };

  return (
    <Alert variant={getColor() as "default" | "destructive"}>
      <div className="flex w-full justify-between">
        <div className="flex items-start">
          {getIcon()}
          <div className="ml-2">
            <AlertTitle>{getTitle()}</AlertTitle>
            {!compact && (
              <AlertDescription className="mt-1">
                This content has been flagged by our fraud detection system.
              </AlertDescription>
            )}
            {showDetails && fraudFlags && fraudFlags.length > 0 && !compact && (
              <div className="mt-3">
                <p className="text-xs font-medium mb-1">Potential issues:</p>
                <ul className="text-xs list-disc pl-4 space-y-1">
                  {fraudFlags.map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
            {showDetails && suggestions && suggestions.length > 0 && !compact && (
              <div className="mt-3">
                <p className="text-xs font-medium mb-1">Suggestions:</p>
                <ul className="text-xs list-disc pl-4 space-y-1">
                  {suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {onDismiss && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 rounded-full" 
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}
