import React from 'react';
import { 
  Train, 
  Clock, 
  MapPin, 
  CreditCard,
  Hash,
  User
} from 'lucide-react';
import type { TrainInvoiceDetails } from '../../../types';
import { formatDateTime, formatDate } from '../../../utils/format';

interface ExtendedTrainInvoiceDetails extends TrainInvoiceDetails {
  passenger_name?: string;
  departure_date?: string;
  departure_time_only?: string;
}

interface TrainInvoiceDetailsProps {
  details: ExtendedTrainInvoiceDetails;
}

export const TrainInvoiceDetailsComponent: React.FC<TrainInvoiceDetailsProps> = ({ details }) => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-base flex items-center gap-2">
        <Train className="w-5 h-5 text-primary" />
        火车票信息
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 车次信息 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Train className="w-4 h-4" />
              车次
            </span>
          </label>
          <input 
            type="text" 
            value={details.train_number} 
            className="input input-bordered font-bold text-primary" 
            readOnly 
          />
        </div>

        {/* 座位信息 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              座位信息
            </span>
          </label>
          <input 
            type="text" 
            value={`${details.seat_class || ''} ${details.seat_number || ''}`} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 乘客姓名 */}
        {details.passenger_name && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <User className="w-4 h-4" />
                乘客姓名
              </span>
            </label>
            <input 
              type="text" 
              value={details.passenger_name} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
        )}

        {/* 出发站 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              出发站
            </span>
          </label>
          <input 
            type="text" 
            value={details.departure_station} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 到达站 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              到达站
            </span>
          </label>
          <input 
            type="text" 
            value={details.arrival_station} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 发车时间 */}
        {(details.departure_time || (details.departure_date && details.departure_time_only)) && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Clock className="w-4 h-4" />
                发车时间
              </span>
            </label>
            <input 
              type="text" 
              value={(() => {
                // 如果有组合的发车时间，使用它
                if (details.departure_time && details.departure_time.includes('T')) {
                  return formatDateTime(details.departure_time);
                }
                // 如果有分开的日期和时间，格式化显示
                if (details.departure_date && details.departure_time_only) {
                  const dateStr = formatDate(details.departure_date.split('T')[0]);
                  return `${dateStr} ${details.departure_time_only}`;
                }
                // 如果只有日期，显示日期
                if (details.departure_date) {
                  return formatDate(details.departure_date.split('T')[0]);
                }
                return '';
              })()} 
              className="input input-bordered text-info" 
              readOnly 
            />
          </div>
        )}

        {/* 到达时间 */}
        {details.arrival_time && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Clock className="w-4 h-4" />
                到达时间
              </span>
            </label>
            <input 
              type="text" 
              value={formatDateTime(details.arrival_time)} 
              className="input input-bordered text-success" 
              readOnly 
            />
          </div>
        )}

        {/* 里程 */}
        {details.distance && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Hash className="w-4 h-4" />
                里程
              </span>
            </label>
            <input 
              type="text" 
              value={`${details.distance} 公里`} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
        )}
      </div>

      {/* 行程摘要 */}
      <div className="alert alert-info">
        <Train className="w-4 h-4" />
        <div>
          <div className="font-semibold">
            {details.departure_station} → {details.arrival_station}
          </div>
          <div className="text-sm opacity-90">
            {details.train_number} · {details.seat_class} · {details.seat_number}
            {details.departure_date && details.departure_time_only && (
              <span> · {formatDate(details.departure_date.split('T')[0])} {details.departure_time_only}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainInvoiceDetailsComponent;