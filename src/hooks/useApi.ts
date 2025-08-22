import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiResponse } from '@/types/dto';

export interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  transform?: (data: any) => T;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for API calls with loading states and error handling
 */
export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const { immediate = false, onSuccess, onError, transform } = options;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiFunction(...args);
        
        if (!mountedRef.current) return null;

        if (!response.success) {
          throw new Error(response.error || 'API request failed');
        }

        const processedData = transform ? transform(response.data) : response.data;
        setData(processedData || null);
        
        if (onSuccess && processedData) {
          onSuccess(processedData);
        }

        return processedData || null;
      } catch (err) {
        if (!mountedRef.current) return null;

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        if (onError) {
          onError(error);
        }

        return null;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [apiFunction, transform, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
}

/**
 * Hook for paginated API calls
 */
export interface UsePaginatedApiOptions<T> extends UseApiOptions<T[]> {
  initialPage?: number;
  initialLimit?: number;
}

export interface UsePaginatedApiResult<T> extends UseApiResult<T[]> {
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setLimit: (limit: number) => Promise<void>;
}

export function usePaginatedApi<T = any>(
  apiFunction: (page: number, limit: number, ...args: any[]) => Promise<ApiResponse<T[]>>,
  options: UsePaginatedApiOptions<T> = {}
): UsePaginatedApiResult<T> {
  const { initialPage = 1, initialLimit = 20, ...apiOptions } = options;
  
  const [page, setPage] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const apiResult = useApi(
    async (...args: any[]) => {
      const response = await apiFunction(page, limit, ...args);
      
      // Extract pagination metadata
      if (response.metadata) {
        setTotalPages(response.metadata.totalPages || 0);
        setTotalResults(response.metadata.totalResults || 0);
      }
      
      return response;
    },
    apiOptions
  );

  const nextPage = useCallback(async () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }, [page, totalPages]);

  const previousPage = useCallback(async () => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const goToPage = useCallback(async (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const setLimit = useCallback(async (newLimit: number) => {
    setLimitState(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);

  // Re-execute when page or limit changes
  useEffect(() => {
    if (apiResult.data !== null || options.immediate) {
      apiResult.execute();
    }
  }, [page, limit]);

  return {
    ...apiResult,
    page,
    limit,
    totalPages,
    totalResults,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    nextPage,
    previousPage,
    goToPage,
    setLimit
  };
}

/**
 * Hook for file upload with progress tracking
 */
export interface UseFileUploadOptions {
  onProgress?: (progress: number) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface UseFileUploadResult {
  uploading: boolean;
  progress: number;
  error: Error | null;
  result: any;
  upload: (file: File) => Promise<void>;
  reset: () => void;
}

export function useFileUpload(
  uploadUrl: string,
  options: UseFileUploadOptions = {}
): UseFileUploadResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<any>(null);

  const { onProgress, onSuccess, onError } = options;

  const upload = useCallback(
    async (file: File) => {
      try {
        setUploading(true);
        setError(null);
        setProgress(0);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progressValue = Math.round((event.loaded / event.total) * 100);
            setProgress(progressValue);
            if (onProgress) {
              onProgress(progressValue);
            }
          }
        });

        // Handle completion
        const uploadPromise = new Promise<any>((resolve, reject) => {
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (parseError) {
                reject(new Error('Failed to parse response'));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });
        });

        xhr.open('POST', uploadUrl);
        xhr.send(formData);

        const response = await uploadPromise;
        
        setResult(response);
        setProgress(100);
        
        if (onSuccess) {
          onSuccess(response);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        if (onError) {
          onError(error);
        }
      } finally {
        setUploading(false);
      }
    },
    [uploadUrl, onProgress, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
    uploading,
    progress,
    error,
    result,
    upload,
    reset
  };
}