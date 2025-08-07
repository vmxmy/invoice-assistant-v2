import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface InvoiceStatusConfig {
  id: string;
  status_code: string;
  label: string;
  icon_name: string;
  color: string;
  bg_class: string;
  border_class: string;
  text_class: string;
  icon_bg_class: string;
  sort_order: number;
  is_active: boolean;
  can_transition_to: string[];
  description: string;
  created_at: string;
  updated_at: string;
}

interface UseInvoiceStatusesReturn {
  statuses: InvoiceStatusConfig[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getStatusConfig: (statusCode: string) => InvoiceStatusConfig | undefined;
  getAvailableTransitions: (fromStatus: string) => InvoiceStatusConfig[];
}

export const useInvoiceStatuses = (): UseInvoiceStatusesReturn => {
  const [statuses, setStatuses] = useState<InvoiceStatusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('invoice_status_configs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) {
        console.error('Error fetching invoice statuses:', fetchError);
        setError('无法获取状态配置');
        return;
      }

      setStatuses(data || []);
    } catch (err) {
      console.error('Failed to fetch invoice statuses:', err);
      setError('获取状态配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatusConfig = useCallback((statusCode: string): InvoiceStatusConfig | undefined => {
    return statuses.find(status => status.status_code === statusCode);
  }, [statuses]);

  const getAvailableTransitions = useCallback((fromStatus: string): InvoiceStatusConfig[] => {
    const fromConfig = getStatusConfig(fromStatus);
    if (!fromConfig || !fromConfig.can_transition_to) {
      return [];
    }

    return statuses.filter(status => 
      fromConfig.can_transition_to.includes(status.status_code)
    );
  }, [statuses, getStatusConfig]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // 监听状态配置的实时更新
  useEffect(() => {
    const channel = supabase
      .channel('invoice-status-configs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoice_status_configs'
        },
        () => {
          console.log('Invoice status configs changed, refetching...');
          fetchStatuses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatuses]);

  return {
    statuses,
    loading,
    error,
    refetch: fetchStatuses,
    getStatusConfig,
    getAvailableTransitions
  };
};

// 创建图标映射
import { 
  Clock, 
  RefreshCw, 
  Check, 
  XCircle, 
  AlertCircle,
  FileText,
  Edit,
  Archive,
  Pause,
  Play,
  X,
  CheckCircle
} from 'lucide-react';

export const iconMap = {
  Clock,
  RefreshCw,
  Check,
  XCircle,
  AlertCircle,
  FileText,
  Edit,
  Archive,
  Pause,
  Play,
  X,
  CheckCircle
} as const;

export type IconName = keyof typeof iconMap;

export const getIconComponent = (iconName: string) => {
  return iconMap[iconName as IconName] || Clock;
};

export default useInvoiceStatuses;