import React from 'react';
import { 
  Car, 
  Clock, 
  Route,
  DollarSign,
  Timer,
  Hash
} from 'lucide-react';
import type { TaxiInvoiceDetails } from '../../../types';
import { formatDateTime, formatCurrency } from '../../../utils/format';

interface TaxiInvoiceDetailsProps {
  details: TaxiInvoiceDetails;
}

export const TaxiInvoiceDetailsComponent: React.FC<TaxiInvoiceDetailsProps> = ({ details }) => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-base flex items-center gap-2">
        <Car className="w-5 h-5 text-primary" />
        出租车票信息
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 上车时间 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Clock className="w-4 h-4" />
              上车时间
            </span>
          </label>
          <input 
            type="text" 
            value={formatDateTime(details.pickup_time)} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 下车时间 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Clock className="w-4 h-4" />
              下车时间
            </span>
          </label>
          <input 
            type="text" 
            value={formatDateTime(details.dropoff_time)} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 里程 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Route className="w-4 h-4" />
              里程
            </span>
          </label>
          <input 
            type="text" 
            value={`${details.distance} 公里`} 
            className="input input-bordered font-bold" 
            readOnly 
          />
        </div>

        {/* 单价 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              单价
            </span>
          </label>
          <input 
            type="text" 
            value={`${formatCurrency(details.unit_price)}/公里`} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 等待费 */}
        {details.waiting_fee !== undefined && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Timer className="w-4 h-4" />
                等待费
              </span>
            </label>
            <input 
              type="text" 
              value={formatCurrency(details.waiting_fee)} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
        )}

        {/* 车牌号 */}
        {details.license_plate && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Hash className="w-4 h-4" />
                车牌号
              </span>
            </label>
            <input 
              type="text" 
              value={details.license_plate} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
        )}
      </div>

      {/* 行程摘要 */}
      <div className="alert">
        <Car className="w-4 h-4" />
        <div>
          <div className="font-semibold">行程总计</div>
          <div className="text-sm opacity-90">
            里程：{details.distance}公里 · 
            时长：{calculateDuration(details.pickup_time, details.dropoff_time)}
            {details.license_plate && ` · 车牌：${details.license_plate}`}
          </div>
        </div>
      </div>
    </div>
  );
};

// 计算行程时长
function calculateDuration(pickup: string, dropoff: string): string {
  const start = new Date(pickup);
  const end = new Date(dropoff);
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / 60000);
  
  if (minutes < 60) {
    return `${minutes}分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分钟' : ''}`;
  }
}

export default TaxiInvoiceDetailsComponent;