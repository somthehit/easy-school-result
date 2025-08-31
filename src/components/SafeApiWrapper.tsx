"use client";

import React, { useState, useEffect } from 'react';
import { safeApiCall, OfflineCache } from '@/lib/api-utils';

interface SafeApiWrapperProps<T> {
  apiCall: () => Promise<T>;
  cacheKey?: string;
  fallbackData?: T;
  children: (data: T | null, loading: boolean, error: string | null, isOffline: boolean) => React.ReactNode;
  onError?: (error: string) => void;
}

export default function SafeApiWrapper<T>({
  apiCall,
  cacheKey,
  fallbackData,
  children,
  onError
}: SafeApiWrapperProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // Try to get cached data first
      const cachedData = cacheKey ? OfflineCache.get<T>(cacheKey) : null;
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
      }

      // Attempt API call with fallback
      const result = await safeApiCall(
        apiCall,
        fallbackData || cachedData,
        { timeout: 10000, retries: 1 }
      );

      if (result.success && result.data) {
        setData(result.data);
        setIsOffline(!!result.fallback);
        
        // Cache successful results
        if (cacheKey && !result.fallback) {
          OfflineCache.set(cacheKey, result.data);
        }
      } else {
        setError(result.error || 'Unknown error occurred');
        if (onError) {
          onError(result.error || 'Unknown error occurred');
        }
        
        // Use cached data if available
        if (cachedData) {
          setData(cachedData);
          setIsOffline(true);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [apiCall, cacheKey, fallbackData, onError]);

  return <>{children(data, loading, error, isOffline)}</>;
}
