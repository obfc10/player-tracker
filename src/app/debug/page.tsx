'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SystemStatus } from '@/components/debug/SystemStatus';
import { ErrorDisplay } from '@/components/debug/ErrorDisplay';
import { errorTracker } from '@/lib/error-tracker';

export default function DebugPage() {
  const { data: session, status } = useSession();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Test database connection
  const testDatabase = async () => {
    setLoading(prev => ({ ...prev, database: true }));
    try {
      const response = await fetch('/api/debug/system-check');
      const data = await response.json();
      setTestResults(prev => ({ ...prev, database: data.database }));
      errorTracker.logInfo('DebugPage.testDatabase', 'Database test completed', data.database);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResults(prev => ({ ...prev, database: { error: errorMessage } }));
      errorTracker.logError('DebugPage.testDatabase', error);
    } finally {
      setLoading(prev => ({ ...prev, database: false }));
    }
  };

  // Test API endpoints
  const testAPI = async (endpoint: string) => {
    setLoading(prev => ({ ...prev, [endpoint]: true }));
    try {
      const start = Date.now();
      const response = await fetch(endpoint);
      const duration = Date.now() - start;
      
      const result: any = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${duration}ms`,
        headers: Object.fromEntries(response.headers.entries()),
      };

      if (response.ok) {
        try {
          const data = await response.json();
          result.dataPreview = JSON.stringify(data).substring(0, 100) + '...';
        } catch {
          result.dataPreview = 'Not JSON';
        }
      }

      setTestResults(prev => ({ ...prev, [endpoint]: result }));
      errorTracker.logInfo(`DebugPage.testAPI.${endpoint}`, 'API test completed', result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTestResults(prev => ({ ...prev, [endpoint]: { error: errorMessage } }));
      errorTracker.logError(`DebugPage.testAPI.${endpoint}`, error);
    } finally {
      setLoading(prev => ({ ...prev, [endpoint]: false }));
    }
  };

  // Trigger intentional errors for testing
  const triggerError = (type: string) => {
    switch (type) {
      case 'throw':
        throw new Error('Intentional error for testing');
      case 'promise':
        Promise.reject('Intentional promise rejection');
        break;
      case 'console':
        console.error('Intentional console error');
        break;
      case 'fetch':
        fetch('/api/non-existent-endpoint');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Dashboard</h1>

        {/* Session Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Session Information</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>Status: <span className={status === 'authenticated' ? 'text-green-400' : 'text-red-400'}>{status}</span></div>
            {session && (
              <>
                <div>User ID: {session.user?.id}</div>
                <div>Username: {session.user?.username}</div>
                <div>Role: {session.user?.role}</div>
              </>
            )}
          </div>
        </div>

        {/* Environment Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Environment Variables</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>NODE_ENV: {process.env.NODE_ENV}</div>
            <div>NEXTAUTH_URL: {process.env.NEXTAUTH_URL}</div>
            <div>Build Time: {new Date().toISOString()}</div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">System Tests</h2>
          
          <div className="space-y-4">
            {/* Database Test */}
            <div>
              <button
                onClick={testDatabase}
                disabled={loading.database}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
              >
                {loading.database ? 'Testing...' : 'Test Database Connection'}
              </button>
              {testResults.database && (
                <pre className="mt-2 bg-gray-900 p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(testResults.database, null, 2)}
                </pre>
              )}
            </div>

            {/* API Tests */}
            <div>
              <h3 className="font-bold mb-2">API Endpoint Tests</h3>
              <div className="space-x-2">
                {['/api/players', '/api/events', '/api/seasons', '/api/uploads'].map(endpoint => (
                  <button
                    key={endpoint}
                    onClick={() => testAPI(endpoint)}
                    disabled={loading[endpoint]}
                    className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm disabled:opacity-50"
                  >
                    {loading[endpoint] ? '...' : endpoint}
                  </button>
                ))}
              </div>
              {Object.entries(testResults).filter(([key]) => key.startsWith('/api')).map(([endpoint, result]) => (
                <div key={endpoint} className="mt-2">
                  <h4 className="font-mono text-sm">{endpoint}</h4>
                  <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>

            {/* Error Triggers */}
            <div>
              <h3 className="font-bold mb-2">Error Testing</h3>
              <div className="space-x-2">
                <button
                  onClick={() => triggerError('console')}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Console Error
                </button>
                <button
                  onClick={() => triggerError('promise')}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Promise Rejection
                </button>
                <button
                  onClick={() => triggerError('fetch')}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Fetch Error
                </button>
                <button
                  onClick={() => triggerError('throw')}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Throw Error
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Performance Metrics</h2>
          <div className="space-y-2 font-mono text-sm">
            {typeof window !== 'undefined' && window.performance && (
              <>
                <div>Page Load Time: {Math.round(window.performance.timing.loadEventEnd - window.performance.timing.navigationStart)}ms</div>
                <div>DOM Content Loaded: {Math.round(window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart)}ms</div>
                <div>Memory Usage: {
                  (window.performance as any).memory ? 
                  `${Math.round((window.performance as any).memory.usedJSHeapSize / 1048576)}MB / ${Math.round((window.performance as any).memory.totalJSHeapSize / 1048576)}MB` :
                  'Not available'
                }</div>
              </>
            )}
          </div>
        </div>

        {/* Debug Components */}
        <SystemStatus />
        <ErrorDisplay />
      </div>
    </div>
  );
}