'use client';

import { useCallback, useEffect, useState } from 'react';
import apiService, {
  SalesSummary,
  SalesChart,
  PosShift,
  Attendance,
  Leave,
  Store,
} from '@/app/services/api';
import { getErrorMessage } from '@/app/utils/error';

export interface DashboardData {
  salesToday: SalesSummary | null;
  salesYesterday: SalesSummary | null;
  chart7d: SalesChart | null;
  topProducts: SalesSummary['top_products'];
  byStore: SalesSummary['by_store'];
  shifts: {
    open: PosShift[];
    overdue: PosShift[];
    closed: PosShift[];
  };
  attendanceToday: Attendance[];
  pendingLeaves: Leave[];
}

export interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

export function useDashboardData(
  stores: Store[],
  storeId: string,
  tenantId?: string,
) {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchDashboard = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      const todayStr = formatDate(today);
      const yesterdayStr = formatDate(yesterday);
      const sevenDaysAgoStr = formatDate(sevenDaysAgo);

      const storeFilter = storeId || undefined;

      // Fetch all data in parallel
      const [
        salesToday,
        salesYesterday,
        chart7d,
        openShifts,
        overdueShifts,
        attendanceRes,
        leavesRes,
      ] = await Promise.allSettled([
        apiService.getSalesSummary({
          startDate: todayStr,
          endDate: todayStr,
          storeId: storeFilter,
        }),
        apiService.getSalesSummary({
          startDate: yesterdayStr,
          endDate: yesterdayStr,
          storeId: storeFilter,
        }),
        apiService.getSalesChart({
          startDate: sevenDaysAgoStr,
          endDate: todayStr,
          storeId: storeFilter,
          groupBy: 'day',
        }),
        apiService.getPosShifts({
          ...(storeFilter ? { storeId: storeFilter } : {}),
          status: 'open',
        }),
        apiService.getPosShifts({
          ...(storeFilter ? { storeId: storeFilter } : {}),
          status: 'overdue',
        }),
        apiService.getAttendances({
          ...(storeFilter ? { store_id: storeFilter } : {}),
          per_page: 100,
        }),
        apiService.getLeaves({ status: 'pending' }),
      ]);

      const salesTodayData =
        salesToday.status === 'fulfilled' ? salesToday.value : null;
      const salesYesterdayData =
        salesYesterday.status === 'fulfilled' ? salesYesterday.value : null;
      const chart7dData =
        chart7d.status === 'fulfilled' ? chart7d.value : null;
      const openShiftsData =
        openShifts.status === 'fulfilled' ? openShifts.value : [];
      const overdueShiftsData =
        overdueShifts.status === 'fulfilled' ? overdueShifts.value : [];

      let attendanceToday: Attendance[] = [];
      if (attendanceRes.status === 'fulfilled' && attendanceRes.value) {
        const res = attendanceRes.value as {
          data?: Attendance[] | { data?: Attendance[] };
        };
        if (Array.isArray(res.data)) {
          attendanceToday = res.data;
        } else if (res.data && Array.isArray(res.data.data)) {
          attendanceToday = res.data.data;
        }
      }

      let pendingLeaves: Leave[] = [];
      if (leavesRes.status === 'fulfilled' && leavesRes.value) {
        const res = leavesRes.value as { leaves?: Leave[] };
        pendingLeaves = Array.isArray(res.leaves) ? res.leaves : [];
      }

      // Check for critical errors (sales data)
      const hasCriticalError =
        salesToday.status === 'rejected' && salesYesterday.status === 'rejected';

      const errorMsgs: string[] = [];
      [salesToday, salesYesterday, chart7d, openShifts, overdueShifts, attendanceRes, leavesRes].forEach(
        (result, idx) => {
          if (result.status === 'rejected') {
            const labels = [
              'Sales Today',
              'Sales Yesterday',
              'Chart 7d',
              'Open Shifts',
              'Overdue Shifts',
              'Attendance',
              'Pending Leaves',
            ];
            errorMsgs.push(`${labels[idx]}: ${getErrorMessage(result.reason)}`);
          }
        },
      );

      const dashboardData: DashboardData = {
        salesToday: salesTodayData,
        salesYesterday: salesYesterdayData,
        chart7d: chart7dData,
        topProducts: salesTodayData?.top_products ?? [],
        byStore: salesTodayData?.by_store ?? [],
        shifts: {
          open: openShiftsData,
          overdue: overdueShiftsData,
          closed: [],
        },
        attendanceToday,
        pendingLeaves,
      };

      setState({
        data: dashboardData,
        loading: false,
        error: hasCriticalError ? errorMsgs.join('; ') : null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: getErrorMessage(error),
        lastUpdated: null,
      });
    }
  }, [storeId]);

  useEffect(() => {
    if (tenantId) {
      fetchDashboard();
    }
  }, [fetchDashboard, tenantId]);

  return {
    ...state,
    refresh: fetchDashboard,
  };
}

export { formatDate };