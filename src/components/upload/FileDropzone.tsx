'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  onUpload: (file: File) => void;
  uploading: boolean;
  uploadProgress?: number;
}

export function FileDropzone({ onUpload, uploading, uploadProgress }: FileDropzoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
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
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setDragActive(false);
    setFileError(null);
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const error = validateFile(file);
      
      if (error) {
        setFileError(error);
        setSelectedFile(null);
      } else {
        setSelectedFile(file);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: uploading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card 
        className={`
          transition-all duration-200 cursor-pointer
          ${isDragActive || dragActive 
            ? 'border-purple-500 bg-purple-500/10' 
            : 'border-gray-600 hover:border-gray-500'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <CardContent className="p-8">
          <div {...getRootProps()} className="text-center">
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              <div className={`
                p-4 rounded-full transition-colors
                ${isDragActive || dragActive 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'bg-gray-700 text-gray-400'
                }
              `}>
                <Upload className="w-8 h-8" />
              </div>
              
              {isDragActive ? (
                <div>
                  <p className="text-lg font-medium text-purple-400">
                    Drop your Excel file here
                  </p>
                  <p className="text-sm text-gray-400">
                    Release to upload
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-white">
                    Drag & drop your Excel file here
                  </p>
                  <p className="text-sm text-gray-400">
                    or click to browse files
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Format: 671_YYYYMMDD_HHMMutc.xlsx (Max 50MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Error */}
      {fileError && (
        <Card className="border-red-500 bg-red-500/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{fileError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected File */}
      {selectedFile && !fileError && (
        <Card className="border-green-500 bg-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-green-400 font-medium">{selectedFile.name}</p>
                  <p className="text-gray-400 text-sm">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {uploading ? 'Processing...' : 'Upload File'}
                </Button>
              </div>
            </div>
            
            {/* Upload Progress */}
            {uploading && uploadProgress !== undefined && (
              <div className="mt-3">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Processing...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}