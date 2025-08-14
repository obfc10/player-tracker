'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { DataExporter, ExportOptions } from '@/lib/export';

interface ExportButtonProps {
  data: any[];
  exportConfig: {
    columns: any[];
  };
  filename: string;
  title?: string;
  subtitle?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showDropdown?: boolean;
}

export function ExportButton({
  data,
  exportConfig,
  filename,
  title,
  subtitle,
  className,
  variant = 'outline',
  size = 'sm',
  showDropdown = true
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleExport = async (format: 'excel' | 'csv') => {
    if (data.length === 0) {
      alert('No data available to export');
      return;
    }

    setIsExporting(true);
    setShowOptions(false);

    try {
      const exportOptions: ExportOptions = {
        filename: filename.includes('.') ? filename : `${filename}.xlsx`,
        sheetName: title || 'Data Export',
        columns: exportConfig.columns,
        data,
        title,
        subtitle
      };

      if (format === 'excel') {
        await DataExporter.exportToExcel(exportOptions);
      } else {
        await DataExporter.exportToCSV(exportOptions);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!showDropdown) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport('excel')}
        disabled={isExporting || data.length === 0}
        className={className}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowOptions(!showOptions)}
        disabled={isExporting || data.length === 0}
        className={className}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>

      {showOptions && !isExporting && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-3" />
              Export as Excel (.xlsx)
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <FileText className="w-4 h-4 mr-3" />
              Export as CSV (.csv)
            </button>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {showOptions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowOptions(false)}
        />
      )}
    </div>
  );
}