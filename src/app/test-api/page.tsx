'use client';

import { useEffect, useState } from 'react';
import apiService from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

export default function TestApiPage() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // This will likely fail without authentication, but we can test the API connection
        const result = await apiService.getUsers();
        setData(result);
      } catch (error) {
        setError(getErrorMessage(error, 'An error occurred while contacting the API'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">API Test Page</h1>
        
        {loading && (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">
              <p>Error: {error}</p>
              <p className="mt-2">This is expected if you are not logged in or the backend is not running.</p>
            </div>
          </div>
        )}
        
        {data && (
          <div className="mt-4">
            <h2 className="text-lg font-medium text-gray-900">API Response:</h2>
            <pre className="mt-2 p-4 bg-gray-50 rounded-md overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-6">
          <a 
            href="/auth/login" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go to Login
          </a>
        </div>
      </div>
    </div>
  );
}
