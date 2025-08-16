'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, FileSpreadsheet, Users, Calendar } from 'lucide-react';

interface Upload {
  id: string;
  filename: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error: string | null;
  rowsProcessed: number;
  createdAt: string;
  uploadedBy: {
    name: string | null;
    username: string;
  };
  snapshots: Array<{
    id: string;
    timestamp: string;
    kingdom: string;
    playerCount: number;
  }>;
}

interface UploadHistoryProps {
  refreshTrigger?: number;
}

export function UploadHistory({ refreshTrigger }: UploadHistoryProps) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUploads();
  }, [refreshTrigger]);

  const fetchUploads = async () => {
    try {
      const response = await fetch('/api/uploads');
      if (response.ok) {
        const data = await response.json();
        setUploads(data);
      }
    } catch (error) {
      console.error('Error fetching upload history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Upload['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'PROCESSING':
        return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: Upload['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Processing</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Upload History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No uploads yet</p>
            <p className="text-sm">Upload your first Excel file to get started</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {uploads.map((upload) => (
              <div 
                key={upload.id} 
                className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {getStatusIcon(upload.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium truncate">{upload.filename}</p>
                      {getStatusBadge(upload.status)}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(upload.createdAt)}</span>
                      </div>
                      
                      {upload.status === 'COMPLETED' && upload.snapshots.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{upload.snapshots[0].playerCount} players</span>
                        </div>
                      )}
                      
                      {upload.rowsProcessed > 0 && (
                        <span>{upload.rowsProcessed} rows processed</span>
                      )}
                    </div>
                    
                    {upload.error && (
                      <p className="text-red-400 text-sm mt-1 truncate">{upload.error}</p>
                    )}
                    
                    <p className="text-gray-500 text-xs mt-1">
                      by {upload.uploadedBy.name || upload.uploadedBy.username}
                    </p>
                  </div>
                </div>
                
                {upload.snapshots.length > 0 && (
                  <div className="text-right text-sm text-gray-400">
                    <p>Kingdom {upload.snapshots[0].kingdom}</p>
                    <p>{formatDate(upload.snapshots[0].timestamp)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}