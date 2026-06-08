'use client';

import TenantSwitcher from '@/app/components/TenantSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAuth } from '@/app/contexts/AuthContext';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type NavItem = {
  name: string;
  href: string;
  role?: 'admin' | 'super-admin' | 'user';
};

const generalNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', role: 'admin' },
];

const managementNavigation: NavItem[] = [
  { name: 'Users', href: '/users', role: 'super-admin' },
  { name: 'Team Members', href: '/team-members', role: 'admin' },
  { name: 'Stores', href: '/stores', role: 'admin' },
  { name: 'Store Groups', href: '/store-groups', role: 'admin' },
  { name: 'Point of Sale', href: '/point-of-sale', role: 'admin' },
  { name: 'Shift Management', href: '/shift-management', role: 'admin' },
];

const salesNavigation: NavItem[] = [
  { name: 'Point of Sale', href: '/point-of-sale', role: 'user' },
  { name: 'Web Orders', href: '/webOrders', role: 'user' },
  // { name: 'eCommerce', href: '/eCommerce', role: 'user' },
];

const teamNavigation: NavItem[] = [
  { name: 'Attendance', href: '/attendance', role: 'user' },
  // { name: 'Presence', href: '/presence', role: 'admin' },
  { name: 'Leaves', href: '/leaves', role: 'user' },
];

const superAdminNavigation: NavItem[] = [
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

export default function AppSidebar() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();
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

  const collapsibleSections = [
    { id: 'sales', title: 'Sales', items: accessibleSales },
    { id: 'team', title: 'Team', items: accessibleTeam },
    { id: 'management', title: 'Admin Management', items: accessibleManagement },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <div className="font-bold">A</div>
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Admin Panel</span>
            <span className="truncate text-xs">Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {accessibleGeneral.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>General</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accessibleGeneral.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {collapsibleSections.map((section) => (
          section.items.length > 0 && (
            <Collapsible
              key={section.id}
              title={section.title}
              defaultOpen
              className="group/collapsible"
            >
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger>
                    {section.title}
                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item) => (
                        <SidebarMenuItem key={item.name}>
                          <SidebarMenuButton asChild isActive={pathname === item.href}>
                            <Link href={item.href}>
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )
        ))}

        {accessibleSuperAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accessibleSuperAdmin.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2">
          <TenantSwitcher />
        </div>
        <div className="flex items-center gap-2 p-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user?.name}</span>
            <span className="text-xs text-muted-foreground">
              {user?.roles?.map((role) => role.name).join(', ') || 'User'}
            </span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
