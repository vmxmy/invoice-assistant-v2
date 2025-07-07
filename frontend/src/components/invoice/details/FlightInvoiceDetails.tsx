import React from 'react';
import { 
  Plane, 
  Clock, 
  MapPin,
  CreditCard,
  Building
} from 'lucide-react';
import type { FlightInvoiceDetails } from '../../../types';
import { formatDateTime } from '../../../utils/format';

interface FlightInvoiceDetailsProps {
  details: FlightInvoiceDetails;
}

export const FlightInvoiceDetailsComponent: React.FC<FlightInvoiceDetailsProps> = ({ details }) => {
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-base flex items-center gap-2">
        <Plane className="w-5 h-5 text-primary" />
        机票信息
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 航班号 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Plane className="w-4 h-4" />
              航班号
            </span>
          </label>
          <input 
            type="text" 
            value={details.flight_number} 
            className="input input-bordered font-bold text-primary" 
            readOnly 
          />
        </div>

        {/* 航空公司 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Building className="w-4 h-4" />
              航空公司
            </span>
          </label>
          <input 
            type="text" 
            value={details.airline} 
            className="input input-bordered" 
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
            value={`${details.cabin_class} ${details.seat_number}`} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 出发机场 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              出发机场
            </span>
          </label>
          <input 
            type="text" 
            value={details.departure_airport} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 到达机场 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              到达机场
            </span>
          </label>
          <input 
            type="text" 
            value={details.arrival_airport} 
            className="input input-bordered" 
            readOnly 
          />
        </div>

        {/* 起飞时间 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Clock className="w-4 h-4" />
              起飞时间
            </span>
          </label>
          <input 
            type="text" 
            value={formatDateTime(details.departure_time)} 
            className="input input-bordered text-info" 
            readOnly 
          />
        </div>

        {/* 降落时间 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Clock className="w-4 h-4" />
              降落时间
            </span>
          </label>
          <input 
            type="text" 
            value={formatDateTime(details.arrival_time)} 
            className="input input-bordered text-success" 
            readOnly 
          />
        </div>
      </div>

      {/* 航程摘要 */}
      <div className="alert alert-info">
        <Plane className="w-4 h-4" />
        <div>
          <div className="font-semibold">
            {details.departure_airport} → {details.arrival_airport}
          </div>
          <div className="text-sm opacity-90">
            {details.airline} {details.flight_number} · {details.cabin_class} · {details.seat_number}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightInvoiceDetailsComponent;