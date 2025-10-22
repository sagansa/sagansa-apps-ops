'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';

type NavItem = {
  name: string;
  href: string;
  role?: 'admin' | 'super-admin' | 'user';
};

const generalNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', role: 'admin' },
];

const managementNavigation: NavItem[] = [
  { name: 'Users', href: '/users', role: 'admin' },
  { name: 'Stores', href: '/stores', role: 'admin' },
  { name: 'Tenants', href: '/tenants', role: 'admin' },
  { name: 'Shift Schedule', href: '/shift-schedules', role: 'admin' },
];

const salesNavigation: NavItem[] = [
  { name: 'Point of Sale', href: '/pointOfSales', role: 'user' },
  { name: 'Web Orders', href: '/webOrders', role: 'user' },
  { name: 'eCommerce', href: '/eCommerce', role: 'user' },
];

const teamNavigation: NavItem[] = [
  { name: 'Attendance', href: '/attendance', role: 'user' },
  { name: 'Leaves', href: '/leaves', role: 'admin' },
];

const superAdminNavigation: NavItem[] = [
  { name: 'Roles', href: '/roles', role: 'super-admin' },
  { name: 'Permissions', href: '/permissions', role: 'super-admin' },
];

function canAccess(
  role: NavItem['role'],
  permissions: { isAdmin: boolean; isSuperAdmin: boolean; isUser: boolean },
): boolean {
  if (!role) {
    return true;
  }

  if (role === 'admin') {
    return permissions.isAdmin || permissions.isSuperAdmin;
  }

  if (role === 'user') {
    return permissions.isUser || permissions.isAdmin || permissions.isSuperAdmin;
  }

  if (role === 'super-admin') {
    return permissions.isSuperAdmin;
  }

  return false;
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={`${
        isActive
          ? 'bg-indigo-800 text-white'
          : 'text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75'
      } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
    >
      <span className="flex-1">{item.name}</span>
    </Link>
  );
}

export default function Sidebar() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const [isTeamOpen, setIsTeamOpen] = useState(true);
  const [isSalesOpen, setIsSalesOpen] = useState(true);
  const [isManagementOpen, setIsManagementOpen] = useState(true);
  const isUser =
    user?.roles?.some((role) => role.name === 'user') ||
    (!isAdmin && !isSuperAdmin);

  const permissions = useMemo(
    () => ({ isAdmin, isSuperAdmin, isUser }),
    [isAdmin, isSuperAdmin, isUser],
  );

  const accessibleGeneral = generalNavigation.filter((item) =>
    canAccess(item.role, permissions),
  );

  const accessibleManagement = managementNavigation.filter((item) =>
    canAccess(item.role, permissions),
  );

  const accessibleTeam = teamNavigation.filter((item) =>
    canAccess(item.role, permissions),
  );

  const accessibleSales = salesNavigation.filter((item) =>
    canAccess(item.role, permissions),
  );

  const accessibleSuperAdmin = superAdminNavigation.filter((item) =>
    canAccess(item.role, permissions),
  );

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-indigo-700 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-white text-xl font-bold">Admin Panel</h1>
        </div>
        <nav className="mt-5 flex-1 flex flex-col overflow-y-auto" aria-label="Sidebar">
          <div className="px-2 space-y-6">
            {accessibleGeneral.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">General</p>
                <div className="mt-2 space-y-1">
                  {accessibleGeneral.map((item) => (
                    <NavLink
                      key={item.name}
                      item={item}
                      isActive={pathname === item.href}
                    />
                  ))}
                </div>
              </div>
            )}

            {accessibleSales.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsSalesOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-semibold text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75 transition-colors"
                  aria-expanded={isSalesOpen}
                  aria-controls="sales-navigation"
                >
                  <span>Sales</span>
                  <svg
                    className={`h-4 w-4 transform transition-transform ${isSalesOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isSalesOpen && (
                  <div id="sales-navigation" className="mt-2 space-y-1 pl-3">
                    {accessibleSales.map((item) => (
                      <NavLink
                        key={item.name}
                        item={item}
                        isActive={pathname.startsWith(item.href)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {accessibleTeam.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsTeamOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-semibold text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75 transition-colors"
                  aria-expanded={isTeamOpen}
                  aria-controls="team-navigation"
                >
                  <span>Team</span>
                  <svg
                    className={`h-4 w-4 transform transition-transform ${isTeamOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isTeamOpen && (
                  <div id="team-navigation" className="mt-2 space-y-1 pl-3">
                    {accessibleTeam.map((item) => (
                      <NavLink
                        key={item.name}
                        item={item}
                        isActive={pathname.startsWith(item.href)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {accessibleManagement.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsManagementOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-semibold text-indigo-100 hover:bg-indigo-600 hover:bg-opacity-75 transition-colors"
                  aria-expanded={isManagementOpen}
                  aria-controls="management-navigation"
                >
                  <span>Admin Management</span>
                  <svg
                    className={`h-4 w-4 transform transition-transform ${isManagementOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isManagementOpen && (
                  <div id="management-navigation" className="mt-2 space-y-1 pl-3">
                    {accessibleManagement.map((item) => (
                      <NavLink
                        key={item.name}
                        item={item}
                        isActive={pathname.startsWith(item.href)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {accessibleSuperAdmin.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Super Admin</p>
                <div className="mt-2 space-y-1">
                  {accessibleSuperAdmin.map((item) => (
                    <NavLink
                      key={item.name}
                      item={item}
                      isActive={pathname === item.href}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>
        <div className="flex-shrink-0 block w-full px-4">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs font-medium text-indigo-200">
                {user?.roles?.map((role) => role.name).join(', ') || 'User'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
