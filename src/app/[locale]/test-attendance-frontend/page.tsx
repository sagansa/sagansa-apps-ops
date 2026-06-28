'use client';

import { useEffect, useState } from 'react';
import apiService from '@/app/services/api';

export default function TestAttendanceFrontend() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testAttendance = async () => {
      try {
        console.log('Testing attendance API from frontend...');
        const token = localStorage.getItem('authToken');
        console.log('Token found:', !!token);
        
        const response = await apiService.getAttendances({ per_page: 20 });
        console.log('Attendance response:', response);
        setData(response);
        setError(null);
      } catch (err) {
        console.error('Error testing attendance:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testAttendance();
  }, []);

  if (loading) return <div>Loading...</div>;
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Attendance Frontend</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Status:</h2>
        <p>Error: {error || 'None'}</p>
        <p>Data received: {data ? 'Yes' : 'No'}</p>
      </div>
      
      {data && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Response Data:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
      
      {error && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-red-600">Error Details:</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}