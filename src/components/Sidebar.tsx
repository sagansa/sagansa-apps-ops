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
import {
  ChevronRight,
  LayoutDashboard,
  Users,
  UserCheck,
  Store,
  Building2,
  ShoppingCart,
  Clock,
  BarChart3,
  TrendingUp,
  CalendarCheck,
  CalendarOff,
  Shield,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

type NavItem = {
  href: string;
  icon: LucideIcon;
  role?: 'admin' | 'super-admin' | 'user';
  labelKey: string;
};

const generalNavigation: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, role: 'admin', labelKey: 'dashboard' },
];

const managementNavigation: NavItem[] = [
  { href: '/users', icon: Users, role: 'super-admin', labelKey: 'users' },
  { href: '/team-members', icon: UserCheck, role: 'admin', labelKey: 'teamMembers' },
  { href: '/stores', icon: Store, role: 'admin', labelKey: 'stores' },
  { href: '/store-groups', icon: Building2, role: 'admin', labelKey: 'storeGroups' },
  { href: '/point-of-sale', icon: ShoppingCart, role: 'admin', labelKey: 'pointOfSale' },
  { href: '/shift-management', icon: Clock, role: 'admin', labelKey: 'shiftManagement' },
];

const reportsNavigation: NavItem[] = [
  { href: '/reports/summary', icon: BarChart3, role: 'user', labelKey: 'salesSummary' },
  { href: '/reports/chart', icon: TrendingUp, role: 'user', labelKey: 'salesChart' },
];

const transactionsNavigation: NavItem[] = [
  { href: '/transactions', icon: Receipt, role: 'user', labelKey: 'receipts' },
];

const teamNavigation: NavItem[] = [
  { href: '/attendance', icon: CalendarCheck, role: 'user', labelKey: 'attendance' },
  { href: '/leaves', icon: CalendarOff, role: 'user', labelKey: 'leaves' },
];

const superAdminNavigation: NavItem[] = [
  { href: '/permissions', icon: Shield, role: 'super-admin', labelKey: 'permissions' },
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
  const t = useTranslations('Nav');
  const tBrand = useTranslations('Common.brand');
  // next-intl pathname returns the path WITHOUT the locale prefix
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

  const accessibleReports = reportsNavigation.filter((item) =>
    canAccess(item.role, permissions),
  );

  const accessibleTransactions = transactionsNavigation.filter((item) =>
    canAccess(item.role, permissions),
  );

  const accessibleSuperAdmin = superAdminNavigation.filter((item) =>
    canAccess(item.role, permissions),
  );

  const collapsibleSections = [
    { id: 'reports', title: t('reports'), items: accessibleReports },
    { id: 'transactions', title: t('transactions'), items: accessibleTransactions },
    { id: 'team', title: t('team'), items: accessibleTeam },
    { id: 'management', title: t('management'), items: accessibleManagement },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={tBrand('name')}
            >
              <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                <span className="text-base font-black leading-none">S</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-tight">{tBrand('name')}</span>
                <span className="truncate text-xs text-indigo-500 dark:text-indigo-400">{tBrand('tagline')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {accessibleGeneral.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('general')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accessibleGeneral.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={t(item.labelKey)}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{t(item.labelKey)}</span>
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
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={t(item.labelKey)}>
                            <Link href={item.href}>
                              <item.icon className="size-4" />
                              <span>{t(item.labelKey)}</span>
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
            <SidebarGroupLabel>{t('superAdmin')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accessibleSuperAdmin.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={t(item.labelKey)}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{t(item.labelKey)}</span>
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={user?.name || 'User'}
              className="flex items-center gap-2"
            >
              <div className="flex aspect-square size-4 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium truncate">{user?.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.roles?.map((role) => role.name).join(', ') || 'User'}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="group-data-[collapsible=icon]:hidden p-2">
          <TenantSwitcher />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
