import React, { memo, useMemo } from 'react';
import { Clock, FileText, Upload, CheckCircle, AlertCircle, User } from 'lucide-react';

interface Activity {
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

interface ActivityFeedProps {
  activities: Activity[];
  loading?: boolean;
  maxItems?: number;
  showTimestamp?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = memo(({
  activities,
  loading = false,
  maxItems = 10,
  showTimestamp = true,
}) => {
  const getActivityIcon = (type: Activity['type']) => {
    const iconClasses = "w-4 h-4";
    
    switch (type) {
      case 'invoice_created':
        return <FileText className={`${iconClasses} text-primary`} />;
      case 'invoice_updated':
        return <CheckCircle className={`${iconClasses} text-success`} />;
      case 'file_uploaded':
        return <Upload className={`${iconClasses} text-info`} />;
      case 'profile_updated':
        return <User className={`${iconClasses} text-secondary`} />;
      case 'invoice_verified':
        return <CheckCircle className={`${iconClasses} text-success`} />;
      default:
        return <AlertCircle className={`${iconClasses} text-base-content/60`} />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'invoice_created':
        return 'border-primary/30 bg-primary/5';
      case 'invoice_updated':
        return 'border-success/30 bg-success/5';
      case 'file_uploaded':
        return 'border-info/30 bg-info/5';
      case 'profile_updated':
        return 'border-secondary/30 bg-secondary/5';
      case 'invoice_verified':
        return 'border-success/30 bg-success/5';
      default:
        return 'border-base-300 bg-base-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}分钟前`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else if (diffInHours < 48) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
      });
    }
  };

  const formatMetadata = (activity: Activity) => {
    if (!activity.metadata) return null;

    const { invoiceNumber, fileName, amount } = activity.metadata;
    
    if (invoiceNumber) {
      return (
        <span className="text-primary font-medium">
          {invoiceNumber}
        </span>
      );
    }
    
    if (fileName) {
      return (
        <span className="text-info font-medium">
          {fileName}
        </span>
      );
    }
    
    if (amount) {
      return (
        <span className="text-success font-medium">
          ¥{amount.toLocaleString()}
        </span>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">最近活动</h3>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="skeleton w-8 h-8 rounded-full flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="skeleton h-4 w-3/4 mb-1"></div>
                  <div className="skeleton h-3 w-1/2"></div>
                </div>
                <div className="skeleton h-3 w-12"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayActivities = useMemo(() => {
    return activities.slice(0, maxItems);
  }, [activities, maxItems]);

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title text-lg">最近活动</h3>
          <Clock className="w-5 h-5 text-base-content/50" />
        </div>
        
        {displayActivities.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-base-content/30 mx-auto mb-3" />
            <p className="text-base-content/60">暂无活动记录</p>
            <p className="text-sm text-base-content/40 mt-1">
              上传发票或更新资料后，活动记录将显示在这里
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayActivities.map((activity, index) => (
              <div 
                key={`${activity.id}-${index}`} 
                className={`flex items-start gap-3 p-3 rounded-lg border ${getActivityColor(activity.type)} transition-colors duration-200 hover:bg-opacity-80`}
              >
                <div className="flex-shrink-0 w-8 h-8 bg-base-100 rounded-full flex items-center justify-center border border-base-300">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-base-content">
                        {activity.title}
                        {formatMetadata(activity) && (
                          <>
                            {' '}
                            {formatMetadata(activity)}
                          </>
                        )}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-base-content/60 mt-1">
                          {activity.description}
                        </p>
                      )}
                    </div>
                    
                    {showTimestamp && (
                      <span className="text-xs text-base-content/50 flex-shrink-0">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activities.length > maxItems && (
          <div className="mt-4 text-center">
            <button className="btn btn-ghost btn-sm">
              查看所有活动
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
export type { ActivityFeedProps };