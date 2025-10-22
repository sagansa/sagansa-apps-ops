'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import apiService, { InvitationDetails } from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

export default function InvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { completeInvitation } = useAuth();

  const token = searchParams.get('token') ?? '';

  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Token tidak ditemukan.');
        setLoading(false);
        return;
      }

      try {
        const response = await apiService.getInvitation(token);
        if (response.success) {
          setDetails(response.invitation as InvitationDetails);
        } else {
          setError(response.message || 'Undangan tidak ditemukan.');
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Gagal memuat data undangan.')); 
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      setSubmitting(true);
      await completeInvitation(token, name, password, passwordConfirmation);
      router.push('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal menyelesaikan undangan.')); 
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!details || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">Undangan tidak valid</h1>
          <p className="text-sm text-gray-600">Tautan undangan ini tidak dapat digunakan. Minta admin untuk mengirimkan undangan ulang.</p>
          <Link href="/auth/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            Kembali ke halaman login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Lengkapi Pendaftaran</h2>
            <p className="text-sm text-gray-600">
              Anda diundang menggunakan email <span className="font-medium">{details.email}</span>
              {details.tenant_names.length > 0 && (
                <> untuk tenant <span className="font-medium">{details.tenant_names.join(', ')}</span></>
              )}.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nama lengkap
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Kata sandi baru
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700">
                Konfirmasi kata sandi
              </label>
              <input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {submitting ? 'Menyimpan...' : 'Selesaikan Pendaftaran'}
            </button>
          </form>
        </div>

        <div className="text-sm text-center text-gray-600">
          Sudah memiliki akun?{' '}
          <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
