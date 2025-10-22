'use client';

import { Attendance, AttendanceStatus } from '../services/api';

interface AttendanceListProps {
  attendances: Attendance[];
  onStatusUpdate: (attendanceId: string, status: AttendanceStatus) => void;
  onEdit?: (attendance: Attendance) => void;
}

export default function AttendanceList({ attendances, onStatusUpdate, onEdit }: AttendanceListProps) {
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusActions = (attendance: Attendance) => {
    if (attendance.status === 'pending') {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => onStatusUpdate(attendance.id, 'approved')}
            className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={() => onStatusUpdate(attendance.id, 'rejected')}
            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
          >
            Reject
          </button>
        </div>
      );
    }
    return null;
  };

  const getRowActions = (attendance: Attendance) => {
    return (
      <div className="flex space-x-2">
        {onEdit && (
          <button
            onClick={() => onEdit(attendance)}
            className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
          >
            Edit
          </button>
        )}
        {getStatusActions(attendance)}
      </div>
    );
  };

  if (attendances.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
        <p className="text-gray-500">Try adjusting your filters or check back later.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Employee
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Store
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Shift
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Check In
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Check Out
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {attendances.map((attendance) => (
            <tr key={attendance.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {attendance.creator?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {attendance.creator?.name || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {attendance.creator?.email || 'N/A'}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {attendance.store?.name || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  {attendance.store?.nickname || 'No nickname'}
                </div>
                {attendance.store?.radius !== null && attendance.store?.radius !== undefined && (
                  <div className="text-xs text-gray-400">
                    Radius: {attendance.store.radius} m
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {attendance.shiftStore?.name || 'N/A'}
                </div>
                {attendance.shiftStore && (
                  <div className="text-sm text-gray-500">
                    {attendance.shiftStore.shift_start_time} - {attendance.shiftStore.shift_end_time}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formatDateTime(attendance.check_in)}
                </div>
                {attendance.latitude_in && attendance.longitude_in && (
                  <div className="text-xs text-gray-500">
                    📍 {attendance.latitude_in.toFixed(4)}, {attendance.longitude_in.toFixed(4)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {formatDateTime(attendance.check_out)}
                </div>
                {attendance.latitude_out && attendance.longitude_out && (
                  <div className="text-xs text-gray-500">
                    📍 {attendance.latitude_out.toFixed(4)}, {attendance.longitude_out.toFixed(4)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={getStatusBadge(attendance.status)}>
                  {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {getRowActions(attendance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
