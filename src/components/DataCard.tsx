import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { defaultApiClient } from '../lib/api-client';

export interface DataCardProps {
  title?: string;
  description?: string;
  apiEndpoint?: string;
  className?: string;
  onDataLoad?: (data: any) => void;
  onError?: (error: any) => void;
}

export const DataCard: React.FC<DataCardProps> = ({
  title = 'Data Card',
  description = 'A card component that fetches and displays data',
  apiEndpoint = '/api/data',
  className = '',
  onDataLoad,
  onError,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await defaultApiClient.get(apiEndpoint);
      setData(response.data);
      onDataLoad?.(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch data';
      setError(errorMessage);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiEndpoint]);

  const handleRefresh = () => {
    fetchData();
  };

  const filteredData = data && searchTerm
    ? data.filter((item: any) => 
        JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data;

  return (
    <Card className={`saas-os-w-full saas-os-max-w-md ${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="saas-os-space-y-4">
        <div className="saas-os-flex saas-os-gap-2">
          <Input
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="saas-os-flex-1"
          />
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {error && (
          <div className="saas-os-p-3 saas-os-bg-destructive/10 saas-os-border saas-os-border-destructive/20 saas-os-rounded-md">
            <p className="saas-os-text-sm saas-os-text-destructive">{error}</p>
          </div>
        )}

        {loading && (
          <div className="saas-os-flex saas-os-items-center saas-os-justify-center saas-os-py-8">
            <div className="saas-os-text-sm saas-os-text-muted-foreground">Loading...</div>
          </div>
        )}

        {!loading && !error && filteredData && (
          <div className="saas-os-space-y-2">
            {Array.isArray(filteredData) ? (
              filteredData.length > 0 ? (
                filteredData.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="saas-os-p-3 saas-os-bg-muted/50 saas-os-rounded-md saas-os-text-sm"
                  >
                    <pre className="saas-os-whitespace-pre-wrap saas-os-text-xs">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="saas-os-text-center saas-os-py-4 saas-os-text-muted-foreground">
                  No data found
                </div>
              )
            ) : (
              <div className="saas-os-p-3 saas-os-bg-muted/50 saas-os-rounded-md">
                <pre className="saas-os-whitespace-pre-wrap saas-os-text-xs">
                  {JSON.stringify(filteredData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="saas-os-flex saas-os-justify-between">
        <div className="saas-os-text-xs saas-os-text-muted-foreground">
          {filteredData && Array.isArray(filteredData) 
            ? `${filteredData.length} items`
            : 'Single item'
          }
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={loading}
          size="sm"
        >
          Refresh Data
        </Button>
      </CardFooter>
    </Card>
  );
}; 