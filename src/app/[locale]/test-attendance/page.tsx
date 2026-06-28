'use client';

import { useEffect, useState } from 'react';

export default function TestAttendance() {
  const [status, setStatus] = useState<string>('Loading attendance data...');
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    async function testAttendance() {
      try {
        // Get auth token from localStorage
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
          setStatus('❌ No auth token found');
          setError('Please login first');
          return;
        }
        setToken(authToken);
        
        setDetails('Testing attendance endpoint with auth...');
        
        // Test attendance endpoint
        const response = await fetch('/api/attendance', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        setDetails(prev => prev + '\n✅ Attendance endpoint reached');
        
        if (response.ok) {
          const result = await response.json();
          setStatus('✅ Attendance data loaded!');
          setData(result);
          setDetails(prev => prev + `\n✅ Data received: ${JSON.stringify(result, null, 2)}`);
        } else if (response.status === 401) {
          setStatus('❌ Unauthorized');
          setError('Token invalid or expired');
        } else {
          setStatus(`❌ HTTP ${response.status}`);
          const errorData = await response.text();
          setError(errorData);
        }
        
      } catch (err) {
        setStatus('❌ Network Error');
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Full error:', err);
      }
    }

    testAttendance();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Attendance Debug</h1>
      <div className="mb-4">
        <p className="font-semibold">Status: {status}</p>
      </div>
      
      {token && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <p className="text-sm"><strong>Token:</strong> {token.substring(0, 20)}...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
          <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
          <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
        </div>
      )}
      
      {data && (
        <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
          <h3 className="font-semibold text-green-800 mb-2">Data:</h3>
          <pre className="text-sm text-green-700 whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
      
      {details && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">Details:</h3>
          <pre className="text-sm text-blue-700 whitespace-pre-wrap">{details}</pre>
        </div>
      )}
      
      <div className="mt-8 text-sm text-gray-600">
        <p>Testing: GET /api/attendance</p>
        <p>Expected: JSON response with attendance records</p>
      </div>
    </div>
  );
}