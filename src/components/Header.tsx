'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { LogOut, Languages, Check } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const LOCALE_LABELS: Record<string, { flag: string; label: string }> = {
  id: { flag: '🇮🇩', label: 'Indonesia' },
  en: { flag: '🇬🇧', label: 'English' },
};

export default function Header() {
  const { user, logout } = useAuth();
  const t = useTranslations('Header');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutDialog(false);
    router.push('/auth/login');
  };

  const switchLocale = (nextLocale: string) => {
    // `router.replace` from next-intl swaps the locale segment while keeping the path
    router.replace(pathname, { locale: nextLocale as typeof locale });
  };

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : 'U';

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 pb-4 sm:px-6 lg:px-8">
      <div className="glass-surface mx-auto flex h-[72px] max-w-6xl items-center justify-between rounded-3xl px-5">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {tCommon('dashboard')}
          </span>
          {/* <h1 className="text-lg font-semibold text-slate-900">{t('welcome')}</h1> */}
        </div>

        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="!h-10 gap-2 rounded-full px-3 border-0">
                <Languages className="h-4 w-4" />
                <span className="text-sm font-medium">{LOCALE_LABELS[locale]?.flag}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44" align="end" forceMount>
              <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
                {t('language')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {routing.locales.map((l) => (
                <DropdownMenuItem
                  key={l}
                  onClick={() => switchLocale(l)}
                  className="gap-2 capitalize"
                >
                  <span>{LOCALE_LABELS[l]?.flag}</span>
                  <span>{LOCALE_LABELS[l]?.label ?? l}</span>
                  {l === locale && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative !h-10 !w-10 rounded-full p-0 flex items-center justify-center m-0 border-0">
                <Avatar className="!size-10 !h-10 !w-10 border border-white/20">
                  <AvatarImage src="" alt={user?.name} className="object-cover" />
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium leading-none">{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.roles?.map((role) => role.name).join(', ') || 'User'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmLogoutTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmLogoutDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLogout} className="bg-red-600 hover:bg-red-700">
              {t('confirmLogout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
