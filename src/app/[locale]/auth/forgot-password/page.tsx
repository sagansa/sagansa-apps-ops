'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiService from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const tBrand = useTranslations('Common.brand');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await apiService.forgotPassword(email);
      const r = response as Record<string, unknown>;
      if (r.status || r.success) {
        setSuccess('Link reset password telah dikirim ke email Anda.');
      } else {
        setError(String((r as Record<string, unknown>).message ?? 'Gagal mengirim link reset password'));
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Terjadi kesalahan saat mengirim link reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand identity */}
        <div className="mt-6 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-200">
            <span className="text-2xl font-black text-white">S</span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900">
            {tBrand('name')}
          </h1>
          <p className="text-sm font-medium text-indigo-600">
            {tBrand('tagline')}
          </p>
          <p className="mt-1 max-w-xs text-center text-xs text-gray-500">
            {tBrand('description')}
          </p>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Lupa Password</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Masukkan email untuk menerima link reset password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {success && <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700">{success}</div>}
          {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="alamat@email.com"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Mengirim...' : 'Kirim Link Reset'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-sm text-center text-gray-600">
            <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}