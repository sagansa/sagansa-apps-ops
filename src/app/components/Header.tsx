'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <div className="flex-1 px-4 flex justify-between sm:px-6 lg:px-8">
        <div className="flex-1 flex">
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          </div>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          <div className="ml-3 relative">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Welcome, {user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}