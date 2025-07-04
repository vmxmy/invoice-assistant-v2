export { default as StatCard } from './StatCard';
export { default as ActivityFeed } from './ActivityFeed';
export { default as QuickActions } from './QuickActions';
export { default as InvoiceChart } from './InvoiceChart';
export { default as DashboardMain } from './DashboardMain';

export type { ActivityFeedProps } from './ActivityFeed';
export type { QuickActionsProps } from './QuickActions';
export type { InvoiceChartProps } from './InvoiceChart';

// 导出类型定义
export interface Activity {
  id: string;
  type: 'invoice_created' | 'invoice_updated' | 'file_uploaded' | 'profile_updated' | 'invoice_verified';
  title: string;
  description?: string;
  timestamp: string;
  metadata?: {
    invoiceNumber?: string;
    fileName?: string;
    amount?: number;
  };
}

export interface QuickAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  disabled?: boolean;
  badge?: string | number;
}

export interface StatCardData {
  title: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info';
}

export interface ChartData {
  monthlyData: Array<{
    month: string;
    invoices: number;
    amount: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}