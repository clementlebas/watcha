import { LayoutDashboard, Settings, Shield, BarChart3 } from 'lucide-react';
import { routes } from 'wasp/client/router';

export const userMenuItems = [
  {
    name: 'Dashboard (Feed)',
    to: routes.WatchaDashboardRoute.to,
    icon: LayoutDashboard,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: 'Statistics',
    to: routes.StatisticsRoute.to,
    icon: BarChart3,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: 'Account Settings',
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
  {
    name: 'Admin Dashboard',
    to: routes.AdminRoute.to,
    icon: Shield,
    isAuthRequired: false,
    isAdminOnly: true,
  },
] as const;
