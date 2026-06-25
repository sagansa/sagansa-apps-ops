'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { CalendarCheck, Clock, Users, UserCheck, UserX } from 'lucide-react';
import { Attendance, PosShift, Store } from '@/app/services/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface OperationsStatusProps {
  openShifts: PosShift[];
  overdueShifts: PosShift[];
  attendanceToday: Attendance[];
  stores: Store[];
  isLoading?: boolean;
}

export function OperationsStatus({
  openShifts,
  overdueShifts,
  attendanceToday,
  stores,
  isLoading,
}: OperationsStatusProps) {
  // Attendance stats
  const checkedInCount = attendanceToday.filter((a) => a.check_in && !a.check_out).length;
  const completedCount = attendanceToday.filter((a) => a.check_in && a.check_out).length;
  const totalAttendance = attendanceToday.length;
  const lateCount = attendanceToday.filter((a) => a.was_late).length;

  // Shift stats
  const totalShifts = openShifts.length + overdueShifts.length;
  const storesWithOpenShift = new Set(openShifts.map((s) => s.storeId));

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4', isLoading && 'animate-pulse')}>
      {/* Shift Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-amber-500" />
            POS Shift Status
          </CardTitle>
          <CardDescription>Status shift per store</CardDescription>
        </CardHeader>
        <CardContent>
          {totalShifts > 0 || stores.length > 0 ? (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-green-50 p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{openShifts.length}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{overdueShifts.length}</p>
                  <p className="text-xs text-muted-foreground">Overdue</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {Math.max(0, stores.length - storesWithOpenShift.size)}
                  </p>
                  <p className="text-xs text-muted-foreground">Closed</p>
                </div>
              </div>

              {/* Store list */}
              {totalShifts > 0 && (
                <div className="space-y-1.5">
                  {[...overdueShifts, ...openShifts].slice(0, 5).map((shift) => {
                    const isOverdue = overdueShifts.some((s) => s.id === shift.id);
                    return (
                      <Link
                        key={shift.id}
                        href="/shift-management"
                        className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full flex-shrink-0',
                              isOverdue ? 'bg-red-500' : 'bg-green-500',
                            )}
                          />
                          <span className="text-sm font-medium truncate">
                            {shift.store?.nickname || shift.store?.name || 'Unknown'}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            isOverdue
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700',
                          )}
                        >
                          {isOverdue ? 'Overdue' : 'Open'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
              {totalShifts === 0 && stores.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Semua store tutup / belum buka shift
                </p>
              )}
            </div>
          ) : (
            <EmptyState title={isLoading ? 'Memuat...' : 'Belum ada data shift'} />
          )}
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-5 w-5 text-teal-500" />
            Attendance Summary — Hari Ini
          </CardTitle>
          <CardDescription>Status kehadiran karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          {totalAttendance > 0 ? (
            <div className="space-y-3">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-teal-50 p-3 text-center">
                  <UserCheck className="h-5 w-5 text-teal-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-teal-600">{checkedInCount}</p>
                  <p className="text-xs text-muted-foreground">Sedang Hadir</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-600">{completedCount}</p>
                  <p className="text-xs text-muted-foreground">Selesai</p>
                </div>
                <div className="rounded-lg bg-orange-50 p-3 text-center">
                  <UserX className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-orange-600">{lateCount}</p>
                  <p className="text-xs text-muted-foreground">Terlambat</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total Check-in Hari Ini</span>
                  <span>{totalAttendance} records</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all"
                    style={{
                      width: `${totalAttendance > 0 ? (checkedInCount / totalAttendance) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <Link
                href="/attendance"
                className="block text-center text-xs text-blue-600 hover:underline pt-1"
              >
                Lihat detail attendance →
              </Link>
            </div>
          ) : (
            <EmptyState
              title={isLoading ? 'Memuat data...' : 'Belum ada attendance'}
              description={
                isLoading ? undefined : 'Belum ada yang check-in hari ini'
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}