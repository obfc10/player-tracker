'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { UploadHistory } from '@/components/upload/UploadHistory';
import { Shield, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface UploadResult {
  success: boolean;
  message?: string;
  snapshotId?: string;
  timestamp?: string;
  rowsProcessed?: number;
  error?: string;
  details?: string;
}

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Redirect if not admin
  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <Alert className="border-red-500 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            Access denied. This page is only available to administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    // Simulate progress (real progress would come from a different implementation)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setUploadProgress(100);
        setResult({
          success: true,
          message: data.message || 'Upload completed successfully',
          snapshotId: data.snapshotId,
          timestamp: data.timestamp,
          rowsProcessed: data.rowsProcessed
        });
        
        // Refresh upload history
        setRefreshTrigger(prev => prev + 1);
        
        // Redirect to overview after success
        setTimeout(() => {
          router.push('/dashboard/overview');
        }, 3000);
      } else {
        setResult({
          success: false,
          error: data.error || 'Upload failed',
          details: data.details
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-500" />
          Upload Player Data
        </h1>
        <p className="text-gray-400">
          Upload Excel files with kingdom player data (Administrator access required)
        </p>
      </div>

      {/* Instructions */}
      <Alert className="border-blue-500 bg-blue-500/10">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-blue-400">
          <strong>File Requirements:</strong> Excel files must follow the naming convention: 
          <code className="mx-1 px-1 py-0.5 bg-gray-700 rounded text-xs">671_YYYYMMDD_HHMMutc.xlsx</code>
          <br />
          Example: <code className="mx-1 px-1 py-0.5 bg-gray-700 rounded text-xs">671_20250810_2040utc.xlsx</code>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Upload New File</CardTitle>
            </CardHeader>
            <CardContent>
              <FileDropzone
                onUpload={handleUpload}
                uploading={uploading}
                uploadProgress={uploadProgress}
              />
            </CardContent>
          </Card>

          {/* Upload Result */}
          {result && (
            <Card className={`${result.success ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  
                  <div className="flex-1">
                    <p className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                      {result.success ? 'Upload Successful!' : 'Upload Failed'}
                    </p>
                    
                    <p className={`text-sm mt-1 ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                      {result.message || result.error}
                    </p>
                    
                    {result.success && result.rowsProcessed && (
                      <p className="text-green-200 text-sm mt-2">
                        ✓ Processed {result.rowsProcessed} players successfully
                      </p>
                    )}
                    
                    {result.success && (
                      <p className="text-green-200 text-sm mt-2">
                        Redirecting to dashboard in 3 seconds...
                      </p>
                    )}
                    
                    {!result.success && result.details && (
                      <p className="text-red-200 text-xs mt-2 font-mono bg-red-900/20 p-2 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upload History */}
        <div>
          <UploadHistory refreshTrigger={refreshTrigger} />
        </div>
      </div>

      {/* Tips Section */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Upload Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="text-white font-medium mb-2">File Format</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Excel files (.xlsx or .xls)</li>
                <li>• Maximum size: 50MB</li>
                <li>• Data should be in "671" sheet</li>
                <li>• Starting from row 2 (row 1 is headers)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-2">Processing</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• ~600 players per file expected</li>
                <li>• Processing takes 30-60 seconds</li>
                <li>• Automatic change detection</li>
                <li>• Upload every 4-7 days for best tracking</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}