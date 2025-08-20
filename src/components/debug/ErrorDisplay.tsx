'use client';

import { useEffect, useState } from 'react';
import { errorTracker } from '@/lib/error-tracker';

export function ErrorDisplay() {
  const [errors, setErrors] = useState(errorTracker.getErrorsSummary());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Update errors every 2 seconds
    const interval = setInterval(() => {
      setErrors(errorTracker.getErrorsSummary());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (errors.total === 0) return null;

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md text-xs font-mono">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Error Tracker</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Total Logs:</span>
          <span>{errors.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-red-400">Errors:</span>
          <span className="text-red-400">{errors.errors}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-yellow-400">Warnings:</span>
          <span className="text-yellow-400">{errors.warnings}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-400">Info:</span>
          <span className="text-blue-400">{errors.info}</span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 border-t border-gray-700 pt-3">
          <h4 className="text-xs font-bold mb-2">By Source:</h4>
          <div className="space-y-1 text-xs">
            {Object.entries(errors.bySource).map(([source, count]) => (
              <div key={source} className="flex justify-between">
                <span className="truncate">{source}:</span>
                <span>{count}</span>
              </div>
            ))}
          </div>

          <h4 className="text-xs font-bold mt-3 mb-2">Recent Logs:</h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {errors.recent.map((log, index) => (
              <div
                key={index}
                className={`text-xs p-1 rounded ${
                  log.type === 'error' ? 'bg-red-900/50' :
                  log.type === 'warning' ? 'bg-yellow-900/50' :
                  'bg-blue-900/50'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-bold">{log.source}</span>
                  <span className="text-gray-400">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="truncate">{log.message}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              errorTracker.clearErrors();
              setErrors(errorTracker.getErrorsSummary());
            }}
            className="mt-3 text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700 w-full"
          >
            Clear All Errors
          </button>
        </div>
      )}
    </div>
  );
}