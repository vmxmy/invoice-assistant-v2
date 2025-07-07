import React from 'react';
import { 
  Hotel, 
  Calendar, 
  DoorOpen,
  DollarSign,
  Moon,
  Hash
} from 'lucide-react';
import type { HotelInvoiceDetails } from '../../../types';
import { formatDate, formatCurrency } from '../../../utils/format';

interface ExtendedHotelInvoiceDetails extends HotelInvoiceDetails {
  service_type?: string;
}

interface HotelInvoiceDetailsProps {
  details: ExtendedHotelInvoiceDetails;
}

export const HotelInvoiceDetailsComponent: React.FC<HotelInvoiceDetailsProps> = ({ details }) => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-base flex items-center gap-2">
        <Hotel className="w-5 h-5 text-primary" />
        酒店发票信息
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 服务类型 */}
        {details.service_type && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Hotel className="w-4 h-4" />
                服务类型
              </span>
            </label>
            <input 
              type="text" 
              value={details.service_type} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
        )}

        {/* 入住日期 */}
        {details.checkin_date && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                入住日期
              </span>
            </label>
            <input 
              type="text" 
              value={formatDate(details.checkin_date)} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
        )}

        {/* 离店日期 */}
        {details.checkout_date && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                离店日期
              </span>
            </label>
            <input 
              type="text" 
              value={formatDate(details.checkout_date)} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
        )}

        {/* 房型/项目名称 */}
        {details.room_type && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <DoorOpen className="w-4 h-4" />
                房型/项目
              </span>
            </label>
            <input 
              type="text" 
              value={details.room_type} 
              className="input input-bordered font-bold" 
              readOnly 
            />
          </div>
        )}

        {/* 房间号 */}
        {details.room_number && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <Hash className="w-4 h-4" />
                房间号
              </span>
            </label>
            <input 
              type="text" 
              value={details.room_number} 
              className="input input-bordered" 
              readOnly 
            />
          </div>
        )}

        {/* 住宿晚数 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Moon className="w-4 h-4" />
              住宿晚数
            </span>
          </label>
          <input 
            type="text" 
            value={`${details.nights} 晚`} 
            className="input input-bordered text-info" 
            readOnly 
          />
        </div>

        {/* 日均房价 */}
        {details.daily_rate !== undefined && (
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                日均房价
              </span>
            </label>
            <input 
              type="text" 
              value={formatCurrency(details.daily_rate)} 
              className="input input-bordered text-success" 
              readOnly 
            />
          </div>
        )}
      </div>

      {/* 住宿摘要 */}
      <div className="alert alert-info">
        <Hotel className="w-4 h-4" />
        <div>
          <div className="font-semibold">
            {details.room_type} · {details.nights} 晚
          </div>
          <div className="text-sm opacity-90">
            {formatDate(details.checkin_date)} 至 {formatDate(details.checkout_date)}
            {details.daily_rate && ` · 日均 ${formatCurrency(details.daily_rate)}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelInvoiceDetailsComponent;