import { routes } from 'wasp/client/router';
import { BlogUrl, DocsUrl } from '../../../shared/common';
import type { NavigationItem } from './NavBar';

export const marketingNavigationItems: NavigationItem[] = [
  { name: 'Features', to: '/#features' },
  { name: 'Pricing', to: routes.PricingPageRoute.to },
  { name: 'Documentation', to: DocsUrl },
  { name: 'Blog', to: BlogUrl },
];

export const getAppNavigationItems = (isAdmin: boolean): NavigationItem[] => {
  const items: NavigationItem[] = [
    { name: 'Feed', to: routes.WatchaDashboardRoute.to },
    { name: 'Pricing', to: routes.PricingPageRoute.to },
    { name: 'Blog', to: BlogUrl },
  ];

  if (isAdmin) {
    items.push({ name: 'File Upload', to: routes.FileUploadRoute.to });
    items.push({ name: 'Documentation', to: DocsUrl });
  }

  return items;
};
