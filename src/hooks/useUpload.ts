import React, { useCallback } from 'react';
import { useApi, useFileUpload } from './useApi';
import { UploadResultDto, UploadHistoryDto, ApiResponse } from '@/types/dto';

// API client functions
const uploadApi = {
  async uploadFile(file: File): Promise<ApiResponse<UploadResultDto>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/data/upload', {
      method: 'POST',
      body: formData
    });

    return response.json();
  },

  async getUploadHistory(options: {
    limit?: number;
    offset?: number;
    status?: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  } = {}): Promise<ApiResponse<UploadHistoryDto[]>> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await fetch(`/api/data/upload?${params.toString()}`);
    return response.json();
  }
};

/**
 * Hook for file upload with progress tracking and validation
 */
export function useFileUploadWithValidation() {
  const uploadResult = useFileUpload('/api/data/upload', {
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress}%`);
    }
  });

  const validateAndUpload = useCallback(
    async (file: File) => {
      // File validation
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      return uploadResult.upload(file);
    },
    [uploadResult.upload]
  );

  return {
    ...uploadResult,
    validateAndUpload
  };
}

/**
 * File validation function
 */
function validateFile(file: File): string | null {
  // Check file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];
  
  if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
    return 'Please select an Excel file (.xlsx or .xls)';
  }

  // Check filename format
  const filenameRegex = /^\d+_\d{8}_\d{4}utc\.(xlsx|xls)$/i;
  if (!filenameRegex.test(file.name)) {
    return 'Filename must match format: 671_YYYYMMDD_HHMMutc.xlsx';
  }

  // Check file size (max 50MB)
  if (file.size > 50 * 1024 * 1024) {
    return 'File size must be less than 50MB';
  }

  return null;
}

/**
 * Hook for managing upload history
 */
export function useUploadHistory() {
  const apiResult = useApi(
    (options: any) => uploadApi.getUploadHistory(options),
    {
      immediate: true
    }
  );

  const refresh = useCallback(() => {
    return apiResult.execute();
  }, [apiResult.execute]);

  const filterByStatus = useCallback(
    (status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | undefined) => {
      return apiResult.execute({ status });
    },
    [apiResult.execute]
  );

  return {
    ...apiResult,
    refresh,
    filterByStatus,
    uploads: apiResult.data || []
  };
}

/**
 * Hook for upload statistics
 */
export function useUploadStats(uploads: UploadHistoryDto[]) {
  const stats = React.useMemo(() => {
    if (!uploads || uploads.length === 0) {
      return {
        total: 0,
        completed: 0,
        failed: 0,
        processing: 0,
        successRate: 0,
        totalRowsProcessed: 0,
        averageRowsPerUpload: 0,
        recentUploads: []
      };
    }

    const completed = uploads.filter(u => u.status === 'COMPLETED').length;
    const failed = uploads.filter(u => u.status === 'FAILED').length;
    const processing = uploads.filter(u => u.status === 'PROCESSING').length;
    const totalRowsProcessed = uploads
      .filter(u => u.status === 'COMPLETED')
      .reduce((sum, u) => sum + u.rowsProcessed, 0);

    const recentUploads = uploads
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      total: uploads.length,
      completed,
      failed,
      processing,
      successRate: uploads.length > 0 ? Math.round((completed / uploads.length) * 100) : 0,
      totalRowsProcessed,
      averageRowsPerUpload: completed > 0 ? Math.round(totalRowsProcessed / completed) : 0,
      recentUploads
    };
  }, [uploads]);

  return stats;
}

/**
 * Hook for real-time upload monitoring
 */
export function useUploadMonitoring(uploadId: string | null, pollInterval: number = 2000) {
  const [isPolling, setIsPolling] = React.useState(false);
  
  const uploadHistory = useUploadHistory();

  const startPolling = useCallback(() => {
    if (!uploadId) return;
    
    setIsPolling(true);
    const interval = setInterval(() => {
      uploadHistory.refresh();
    }, pollInterval);

    // Stop polling after 5 minutes or when upload completes/fails
    const timeout = setTimeout(() => {
      setIsPolling(false);
      clearInterval(interval);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      setIsPolling(false);
    };
  }, [uploadId, pollInterval, uploadHistory.refresh]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // Find the specific upload
  const currentUpload = uploadHistory.uploads.find(u => u.id === uploadId);

  // Stop polling if upload is complete or failed
  React.useEffect(() => {
    if (currentUpload && (currentUpload.status === 'COMPLETED' || currentUpload.status === 'FAILED')) {
      stopPolling();
    }
  }, [currentUpload, stopPolling]);

  return {
    currentUpload,
    isPolling,
    startPolling,
    stopPolling,
    allUploads: uploadHistory.uploads,
    loading: uploadHistory.loading,
    error: uploadHistory.error
  };
}